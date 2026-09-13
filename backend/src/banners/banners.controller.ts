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
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { renombrarBannerSchema } from '@bingo/common';
import { ZodPipe } from '../common/zod.pipe';
import { AdminOnly, Public } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png']);

@Controller('banners')
export class BannersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async listar() {
    const banners = await this.prisma.banner.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
    return banners.map((b) => ({ id: b.id, nombre: b.nombre }));
  }

  @Post()
  @AdminOnly()
  @UseInterceptors(FileInterceptor('imagen', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async crear(
    @Body('nombre') nombre: string,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    if (!nombre?.trim()) throw new BadRequestException('Nombre requerido');
    if (!imagen) throw new BadRequestException('Imagen requerida');
    const ext = extname(imagen.originalname).toLowerCase();
    if (!EXTENSIONES.has(ext)) {
      throw new BadRequestException('Solo se permiten imágenes JPG o PNG');
    }

    const ruta = join(this.storage.bannersDir, `${randomUUID()}${ext}`);
    await writeFile(ruta, imagen.buffer);
    const banner = await this.prisma.banner.create({
      data: { nombre: nombre.trim(), rutaImagen: ruta },
    });
    return { id: banner.id, nombre: banner.nombre };
  }

  @Put(':id')
  @AdminOnly()
  async renombrar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(renombrarBannerSchema)) body: { nombre: string },
  ) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner no encontrado');
    const actualizado = await this.prisma.banner.update({
      where: { id },
      data: { nombre: body.nombre },
    });
    return { id: actualizado.id, nombre: actualizado.nombre };
  }

  @Delete(':id')
  @AdminOnly()
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner no encontrado');
    await this.prisma.banner.delete({ where: { id } });
    await unlink(banner.rutaImagen).catch(() => undefined);
    return { mensaje: 'Banner eliminado (los cartones ya generados no cambian)' };
  }

  /** Pública para poder usar <img src> directo en la PWA (igual que la imagen de cartón). */
  @Public()
  @Get(':id/imagen')
  async imagen(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner || !existsSync(banner.rutaImagen)) {
      throw new NotFoundException('Imagen no encontrada');
    }
    res.sendFile(banner.rutaImagen);
  }
}
