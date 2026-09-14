import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { IUserRepositoryToken } from '../core/domain/repositories/IUserRepository';
import { PrismaUserRepository } from '../infrastructure/database/PrismaUserRepository';
import { ListarUsuariosUseCase } from '../core/application/use-cases/ListarUsuariosUseCase';
import { CrearUsuarioUseCase } from '../core/application/use-cases/CrearUsuarioUseCase';
import { ActualizarUsuarioUseCase } from '../core/application/use-cases/ActualizarUsuarioUseCase';
import { EliminarUsuarioUseCase } from '../core/application/use-cases/EliminarUsuarioUseCase';

@Module({
  controllers: [UsersController],
  providers: [
    {
      provide: IUserRepositoryToken,
      useClass: PrismaUserRepository,
    },
    ListarUsuariosUseCase,
    CrearUsuarioUseCase,
    ActualizarUsuarioUseCase,
    EliminarUsuarioUseCase,
  ],
  exports: [
    IUserRepositoryToken,
  ],
})
export class UsersModule {}
