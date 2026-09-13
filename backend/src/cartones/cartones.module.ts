import { Module } from '@nestjs/common';
import { CartonesController } from './cartones.controller';
import { CartonesService } from './cartones.service';
import { PrismaCartonRepository } from '../infrastructure/database/PrismaCartonRepository';
import { GetCartonUseCase } from '../core/application/use-cases/GetCartonUseCase';
import { ICartonRepositoryToken } from '../core/domain/repositories/ICartonRepository';

@Module({
  controllers: [CartonesController],
  providers: [
    CartonesService,
    {
      provide: ICartonRepositoryToken,
      useClass: PrismaCartonRepository,
    },
    {
      provide: GetCartonUseCase,
      useFactory: (repo) => new GetCartonUseCase(repo),
      inject: [ICartonRepositoryToken],
    },
  ],
  exports: [CartonesService, GetCartonUseCase, ICartonRepositoryToken],
})
export class CartonesModule {}
