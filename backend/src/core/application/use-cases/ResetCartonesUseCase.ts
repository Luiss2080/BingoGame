import { rm } from 'node:fs/promises';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../storage/storage.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ResetCartonesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async execute() {
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
}
