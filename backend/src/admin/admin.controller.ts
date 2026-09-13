import { Controller, Inject, Post } from '@nestjs/common';
import { Queue } from 'bullmq';
import { rm } from 'node:fs/promises';
import type { RegenerateImagesJob } from '@bingo/common';
import { AdminOnly } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { PDF_QUEUE_TOKEN } from '../queue/queue.module';
import { StorageService } from '../storage/storage.service';

@Controller('admin')
@AdminOnly()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(PDF_QUEUE_TOKEN) private readonly queue: Queue,
  ) {}

  /** Borra todos los cartones y PDFs (registros + archivos). Conserva usuarios, grupos y banners. */
  @Post('reset-cartones')
  async resetCartones() {
    const pdfs = await this.prisma.pdfProcesado.findMany({
      select: { carpetaImagenes: true, rutaArchivo: true },
    });
    const totalCartones = await this.prisma.carton.count();
    const totalPdfs = pdfs.length;

    await this.prisma.$transaction([
      this.prisma.carton.deleteMany(),
      this.prisma.pdfProcesado.deleteMany(),
    ]);

    for (const pdf of pdfs) {
      if (pdf.carpetaImagenes) {
        await rm(pdf.carpetaImagenes, { recursive: true, force: true }).catch(() => undefined);
      }
      if (pdf.rutaArchivo) {
        await rm(pdf.rutaArchivo, { force: true }).catch(() => undefined);
      }
    }
    await rm(this.storage.chunksDir, { recursive: true, force: true }).catch(() => undefined);

    return {
      ok: true,
      cartones_eliminados: totalCartones,
      pdfs_eliminados: totalPdfs,
      mensaje:
        `BD limpia. ${totalCartones} cartones y ${totalPdfs} PDFs eliminados. ` +
        'Usuarios, grupos y banners conservados.',
    };
  }

  /** Encola la regeneración de todas las imágenes (la hace el worker). */
  @Post('regenerar-imagenes')
  async regenerarImagenes() {
    const total = await this.prisma.carton.count();
    const payload: RegenerateImagesJob = {};
    await this.queue.add('regenerate-images', payload);
    return {
      ok: true,
      total,
      mensaje:
        `Regeneración iniciada en segundo plano para ${total} cartones. ` +
        'En unos minutos todas las imágenes estarán actualizadas.',
    };
  }

  /** Paridad con Flask: endpoint histórico sin operación activa. */
  @Post('migrar-numeros')
  migrarNumeros() {
    return { ok: true, mensaje: 'Sin cambios pendientes.' };
  }
}
