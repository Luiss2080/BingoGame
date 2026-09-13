import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PDF_QUEUE, PdfProcesadoDto } from '@bingo/common';
import { PrismaService } from '../prisma/prisma.service';
import { fromPath } from 'pdf2pic';
import * as path from 'path';

@Processor(PDF_QUEUE)
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<PdfProcesadoDto, void, string>): Promise<void> {
    this.logger.log(`Procesando trabajo ${job.id} para PDF ID: ${job.data.id} con Worker Node Nativo`);
    const pdfPath = job.data.ruta_archivo;
    
    try {
      // 1. Convertir PDF a imágenes usando pdf2pic (basado en gm/ghostscript)
      const outputDir = path.dirname(pdfPath);
      const options = {
        density: 150,
        saveFilename: `page`,
        savePath: outputDir,
        format: "jpg",
        width: 520
      };
      const convert = fromPath(pdfPath, options);
      
      // Procesamos la primera página como prueba de concepto
      // (En producción, se itera sobre todas las páginas y se usa Sharp para recortar y armar el cartón con el logo)
      await convert(1, { responseType: "image" });
      
      // 2. Marcar como completado en DB
      await this.prisma.pdfProcesado.update({
        where: { id: job.data.id },
        data: { estado: 'completado', fechaCompletado: new Date() },
      });

      this.logger.log(`PDF procesado y guardado correctamente por Node.js`);
    } catch (e: any) {
      this.logger.error(`Error en procesamiento de PDF: ${e.message}`);
      await this.prisma.pdfProcesado.update({
        where: { id: job.data.id },
        data: { estado: 'error' },
      });
      throw e;
    }
  }
}
