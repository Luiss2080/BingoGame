import { Module } from '@nestjs/common';
import { CartonesController } from './cartones.controller';
import { CartonesService } from './cartones.service';
import { ICartonRepositoryToken } from '../core/domain/repositories/ICartonRepository';
import { PrismaCartonRepository } from '../infrastructure/database/PrismaCartonRepository';
import { GetCartonUseCase } from '../core/application/use-cases/GetCartonUseCase';
import { ReservarCartonUseCase } from '../core/application/use-cases/ReservarCartonUseCase';
import { VenderCartonUseCase } from '../core/application/use-cases/VenderCartonUseCase';
import { LiberarCartonUseCase } from '../core/application/use-cases/LiberarCartonUseCase';
import { EliminarCartonUseCase } from '../core/application/use-cases/EliminarCartonUseCase';
import { RealtimeModule } from '../realtime/realtime.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Module({
  imports: [RealtimeModule],
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
      useFactory: (repo, gateway) => new ReservarCartonUseCase(repo, gateway),
      inject: [ICartonRepositoryToken, RealtimeGateway],
    },
    {
      provide: VenderCartonUseCase,
      useFactory: (repo, gateway) => new VenderCartonUseCase(repo, gateway),
      inject: [ICartonRepositoryToken, RealtimeGateway],
    },
    {
      provide: LiberarCartonUseCase,
      useFactory: (repo, gateway) => new LiberarCartonUseCase(repo, gateway),
      inject: [ICartonRepositoryToken, RealtimeGateway],
    },
    {
      provide: EliminarCartonUseCase,
      useFactory: (repo) => new EliminarCartonUseCase(repo),
      inject: [ICartonRepositoryToken],
    },
  ],
  exports: [CartonesService, GetCartonUseCase, ReservarCartonUseCase, VenderCartonUseCase, LiberarCartonUseCase, EliminarCartonUseCase, ICartonRepositoryToken],
})
export class CartonesModule {}
