import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import type { ProcessPdfJob } from '@bingo/common';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { AuthUser } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { PDF_QUEUE_TOKEN } from '../queue/queue.module';
import { StorageService } from '../storage/storage.service';

export interface OpcionesSubida {
  bannerId: number | null; // null = default, 0 = sin banner
  grupoId: number | null;
  usuariosIds: number[];
  usuarioId: number | null;
}

const DPI = 150;

function pdfToDto(p: {
  id: number;
  nombreArchivo: string;
  fechaProcesado: Date;
  totalPaginas: number;
  paginasOk: number;
  paginasError: number;
  dpi: number;
  estado: string;
  mensajeError: string | null;
  subidoPor: number | null;
}) {
  return {
    id: p.id,
    nombre_archivo: p.nombreArchivo,
    fecha_procesado: p.fechaProcesado.toISOString(),
    total_paginas: p.totalPaginas,
    paginas_ok: p.paginasOk,
    paginas_error: p.paginasError,
    dpi: p.dpi,
    estado: p.estado,
    mensaje_error: p.mensajeError,
    subido_por: p.subidoPor,
  };
}

@Injectable()
export class PdfsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(PDF_QUEUE_TOKEN) private readonly queue: Queue,
  ) {}

  /**
   * Paridad con Flask: si no viene grupo, usar el grupo del que sube;
   * si tampoco hay grupo, los cartones van al usuario indicado o al que sube.
   */
  private async resolverDestino(userId: number, opts: OpcionesSubida) {
    let grupoId = opts.grupoId;
    if (!grupoId) {
      const uploader = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { grupoId: true },
      });
      grupoId = uploader?.grupoId ?? null;
    }
    const vendedorId = opts.usuarioId ?? (grupoId ? null : userId);
    return { grupoId, vendedorId };
  }

  /** null → banner default; 0 → sin banner; n → ruta del banner (o default si no existe). */
  private async resolverBannerPath(
    bannerId: number | null,
  ): Promise<string | null | 'default'> {
    if (bannerId === null || bannerId === undefined) return 'default';
    if (bannerId === 0) return null;
    const banner = await this.prisma.banner.findUnique({
      where: { id: bannerId },
    });
    if (banner && existsSync(banner.rutaImagen)) return banner.rutaImagen;
    return 'default';
  }

  /** Crea el registro y encola el job de procesamiento. Responde al instante. */
  async crearYEncolar(
    nombreOriginal: string,
    rutaPdf: string,
    user: AuthUser,
    opts: OpcionesSubida,
  ) {
    const { grupoId, vendedorId } = await this.resolverDestino(user.id, opts);
    const bannerPath = await this.resolverBannerPath(opts.bannerId);

    const pdf = await this.prisma.pdfProcesado.create({
      data: {
        nombreArchivo: nombreOriginal,
        rutaArchivo: rutaPdf,
        estado: 'procesando',
        dpi: DPI,
        subidoPor: user.id,
        carpetaImagenes: '',
      },
    });
    const outputDir = this.storage.carpetaImagenesPdf(pdf.id);
    await this.prisma.pdfProcesado.update({
      where: { id: pdf.id },
      data: { carpetaImagenes: outputDir },
    });

    const payload: ProcessPdfJob = {
      pdfId: pdf.id,
      pdfPath: rutaPdf,
      outputDir,
      bannerPath,
      grupoId,
      usuariosIds: opts.usuariosIds,
      vendedorId,
      dpi: DPI,
    };
    await this.queue.add('process-pdf', payload);

    return { ok: true, pdf_id: pdf.id, nombre: nombreOriginal, estado: 'procesando' };
  }

  async listar(user: AuthUser) {
    const pdfs = await this.prisma.pdfProcesado.findMany({
      where: user.rol === 'admin' ? undefined : { subidoPor: user.id },
      orderBy: { fechaProcesado: 'desc' },
      include: { _count: { select: { cartones: true } } },
    });
    return pdfs.map((p) => ({ ...pdfToDto(p), total_cartones: p._count.cartones }));
  }

  async estado(id: number) {
    const pdf = await this.prisma.pdfProcesado.findUnique({ where: { id } });
    if (!pdf) throw new NotFoundException('PDF no encontrado');
    return {
      ...pdfToDto(pdf),
      cartones_creados: pdf.paginasOk,
      errores: pdf.paginasError,
    };
  }

  async eliminar(id: number, user: AuthUser) {
    const pdf = await this.prisma.pdfProcesado.findUnique({
      where: { id },
      include: { _count: { select: { cartones: true } } },
    });
    if (!pdf) throw new NotFoundException('PDF no encontrado');
    if (user.rol !== 'admin' && pdf.subidoPor !== user.id) {
      throw new ForbiddenException('Sin permiso');
    }
    await this.prisma.pdfProcesado.delete({ where: { id } }); // cascade borra cartones
    if (pdf.carpetaImagenes) {
      await rm(pdf.carpetaImagenes, { recursive: true, force: true }).catch(() => undefined);
    }
    if (pdf.rutaArchivo) {
      await rm(pdf.rutaArchivo, { force: true }).catch(() => undefined);
    }
    return { ok: true, total_cartones: pdf._count.cartones };
  }
}
