import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PDF_QUEUE, RegenerateImagesJob } from '@bingo/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RegenerarImagenesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(PDF_QUEUE) private readonly queue: Queue,
  ) {}

  async execute() {
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
}
