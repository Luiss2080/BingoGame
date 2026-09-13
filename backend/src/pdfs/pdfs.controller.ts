import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pdfCompletarSchema, type PdfCompletarDto } from '@bingo/common';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentUser, RequierePermiso, AuthUser } from '../auth/decorators';
import { StorageService } from '../storage/storage.service';
import { OpcionesSubida, PdfsService } from './pdfs.service';

function nombreUnico(original: string): string {
  const limpio = basename(original).replace(/[^\w.\-]+/g, '_');
  const fecha = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
  return `${fecha}_${randomUUID().slice(0, 8)}_${limpio}`;
}

@Controller()
export class PdfsController {
  constructor(
    private readonly pdfs: PdfsService,
    private readonly storage: StorageService,
  ) {}

  /** Subida directa multipart (hasta 200 MB). */
  @Post('subir-pdf')
  @RequierePermiso('subir_pdf')
  @UseInterceptors(
    FileInterceptor('pdf', { limits: { fileSize: 200 * 1024 * 1024 } }),
  )
  async subir(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() form: Record<string, string>,
    @CurrentUser() user: AuthUser,
  ) {
    if (!archivo) throw new BadRequestException('No se envió ningún archivo');
    if (!archivo.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    const ruta = join(this.storage.uploadsDir, nombreUnico(archivo.originalname));
    await writeFile(ruta, archivo.buffer);

    return this.pdfs.crearYEncolar(
      basename(archivo.originalname),
      ruta,
      user,
      this.parseOpcionesForm(form),
    );
  }

  private parseOpcionesForm(form: Record<string, string>): OpcionesSubida {
    const int = (v?: string) => {
      const n = parseInt(v ?? '', 10);
      return Number.isFinite(n) ? n : null;
    };
    return {
      bannerId: int(form.banner_id),
      grupoId: int(form.grupo_id) || null,
      usuariosIds: (form.usuarios_ids ?? '')
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0),
      usuarioId: int(form.usuario_id) || null,
    };
  }

  /** Subida por chunks (2 MB) para conexiones móviles inestables. */
  @Post('pdf-parte')
  @RequierePermiso('subir_pdf')
  @UseInterceptors(
    FileInterceptor('chunk', { limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  async subirParte(
    @UploadedFile() chunk: Express.Multer.File | undefined,
    @Body() form: Record<string, string>,
  ) {
    const uploadId = form.upload_id;
    const chunkIndex = parseInt(form.chunk_index ?? '', 10);
    const totalChunks = parseInt(form.total_chunks ?? '', 10);
    if (!uploadId || !Number.isFinite(chunkIndex) || !Number.isFinite(totalChunks)) {
      throw new BadRequestException('Parámetros incompletos');
    }
    if (!chunk) throw new BadRequestException('Sin datos');
    if (!/^[\w-]+$/.test(uploadId)) {
      throw new BadRequestException('upload_id inválido');
    }

    const dir = join(this.storage.chunksDir, uploadId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `chunk_${String(chunkIndex).padStart(5, '0')}`), chunk.buffer);

    const metaPath = join(dir, 'meta.txt');
    if (!existsSync(metaPath)) {
      await writeFile(metaPath, `${form.nombre ?? 'archivo.pdf'}\n${totalChunks}`);
    }
    return { ok: true, chunk: chunkIndex };
  }

  @Post('pdf-completar')
  @RequierePermiso('subir_pdf')
  async completar(
    @Body(new ZodPipe(pdfCompletarSchema)) dto: PdfCompletarDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dir = join(this.storage.chunksDir, dto.upload_id);
    if (!existsSync(dir)) {
      throw new NotFoundException(
        'Upload no encontrado. Puede que el servidor se haya reiniciado.',
      );
    }

    let nombreOriginal = 'archivo.pdf';
    try {
      const meta = await readFile(join(dir, 'meta.txt'), 'utf8');
      nombreOriginal = meta.split('\n')[0].trim() || nombreOriginal;
    } catch {}

    const chunks = (await readdir(dir))
      .filter((f) => f.startsWith('chunk_'))
      .sort();
    if (chunks.length === 0) throw new BadRequestException('Sin chunks');

    const ruta = join(this.storage.uploadsDir, nombreUnico(nombreOriginal));
    const out = createWriteStream(ruta);
    for (const nombre of chunks) {
      out.write(await readFile(join(dir, nombre)));
    }
    await new Promise<void>((resolve, reject) => {
      out.end(() => resolve());
      out.on('error', reject);
    });
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);

    return this.pdfs.crearYEncolar(nombreOriginal, ruta, user, {
      bannerId: dto.banner_id ?? null,
      grupoId: dto.grupo_id ?? null,
      usuariosIds: dto.usuarios_ids ?? [],
      usuarioId: dto.usuario_id ?? null,
    });
  }

  @Get('pdfs')
  listar(@CurrentUser() user: AuthUser) {
    return this.pdfs.listar(user);
  }

  @Get('pdfs/:id/estado')
  estado(@Param('id', ParseIntPipe) id: number) {
    return this.pdfs.estado(id);
  }

  @Delete('pdfs/:id')
  eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.pdfs.eliminar(id, user);
  }
}
