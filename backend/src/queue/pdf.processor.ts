import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PDF_QUEUE } from '@bingo/common';
import { Logger } from '@nestjs/common';

@Processor(PDF_QUEUE)
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Procesando trabajo ${job.id} de la cola ${job.name}`);
    
    // Aquí irá la lógica de generación del PDF / Imágenes.
    // Simulamos un trabajo de 2 segundos.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    this.logger.log(`Trabajo ${job.id} completado satisfactoriamente.`);
    return { success: true, jobId: job.id };
  }
}
