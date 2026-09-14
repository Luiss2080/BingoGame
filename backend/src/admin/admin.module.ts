import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ResetCartonesUseCase } from '../core/application/use-cases/ResetCartonesUseCase';
import { RegenerarImagenesUseCase } from '../core/application/use-cases/RegenerarImagenesUseCase';

@Module({
  controllers: [AdminController],
  providers: [
    ResetCartonesUseCase,
    RegenerarImagenesUseCase,
  ],
})
export class AdminModule {}
