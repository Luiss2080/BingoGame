import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';

@Module({
  controllers: [BannersController],
})
export class BannersModule {}
