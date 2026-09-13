import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller';

@Module({
  controllers: [GruposController],
})
export class GruposModule {}
