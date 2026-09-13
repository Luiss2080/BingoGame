import { Module } from '@nestjs/common';
import { CartonesController } from './cartones.controller';
import { CartonesService } from './cartones.service';
import { PrismaCartonRepository } from '../infrastructure/database/PrismaCartonRepository';
import { GetCartonUseCase } from '../core/application/use-cases/GetCartonUseCase';
import { ReservarCartonUseCase } from '../core/application/use-cases/ReservarCartonUseCase';
import { VenderCartonUseCase } from '../core/application/use-cases/VenderCartonUseCase';
import { LiberarCartonUseCase } from '../core/application/use-cases/LiberarCartonUseCase';
import { EliminarCartonUseCase } from '../core/application/use-cases/EliminarCartonUseCase';
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
    {
      provide: ReservarCartonUseCase,
      useFactory: (repo) => new ReservarCartonUseCase(repo),
      inject: [ICartonRepositoryToken],
    },
    {
      provide: VenderCartonUseCase,
      useFactory: (repo) => new VenderCartonUseCase(repo),
      inject: [ICartonRepositoryToken],
    },
  ],
  exports: [CartonesService, GetCartonUseCase, ReservarCartonUseCase, VenderCartonUseCase, ICartonRepositoryToken],
})
export class CartonesModule {}
