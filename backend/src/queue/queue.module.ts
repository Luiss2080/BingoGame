import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PDF_QUEUE } from '@bingo/common';

export const PDF_QUEUE_TOKEN = 'PDF_QUEUE';

@Global()
@Module({
  providers: [
    {
      provide: PDF_QUEUE_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('REDIS_URL', 'redis://localhost:6379'));
        return new Queue(PDF_QUEUE, {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
          defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        });
      },
    },
  ],
  exports: [PDF_QUEUE_TOKEN],
})
export class QueueModule implements OnApplicationShutdown {
  constructor() {}
  async onApplicationShutdown() {
    // La Queue se cierra con el proceso; BullMQ no deja handles colgados
  }
}
