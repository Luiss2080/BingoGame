import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { PDF_QUEUE } from '@bingo/common';
import { PdfProcessor } from './pdf.processor';
import { resolveRedisConnection } from '../common/redis-connection';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: resolveRedisConnection((k) => config.get<string>(k)),
      }),
    }),
    BullModule.registerQueue({
      name: PDF_QUEUE,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: PDF_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [PdfProcessor],
  exports: [BullModule],
})
export class QueueModule {}
