import { Module } from '@nestjs/common';
import { CartonesController } from './cartones.controller';
import { CartonesService } from './cartones.service';

@Module({
  controllers: [CartonesController],
  providers: [CartonesService],
  exports: [CartonesService],
})
export class CartonesModule {}
