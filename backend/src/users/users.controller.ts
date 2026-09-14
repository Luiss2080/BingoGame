import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
  type CrearUsuarioDto,
  type EditarUsuarioDto,
} from '@bingo/common';
import { ZodPipe } from '../common/zod.pipe';
import { AdminOnly, CurrentUser, AuthUser } from '../auth/decorators';
import { ListarUsuariosUseCase } from '../core/application/use-cases/ListarUsuariosUseCase';
import { CrearUsuarioUseCase } from '../core/application/use-cases/CrearUsuarioUseCase';
import { ActualizarUsuarioUseCase } from '../core/application/use-cases/ActualizarUsuarioUseCase';
import { EliminarUsuarioUseCase } from '../core/application/use-cases/EliminarUsuarioUseCase';

@Controller()
@AdminOnly()
export class UsersController {
  constructor(
    private readonly listarUsuariosUseCase: ListarUsuariosUseCase,
    private readonly crearUsuarioUseCase: CrearUsuarioUseCase,
    private readonly actualizarUsuarioUseCase: ActualizarUsuarioUseCase,
    private readonly eliminarUsuarioUseCase: EliminarUsuarioUseCase,
  ) {}

  /** Lista de usuarios activos (filtros y asignación en subida de PDF). */
  @Get('usuarios')
  listarActivos() {
    return this.listarUsuariosUseCase.execute(true);
  }

  @Get('auth/usuarios')
  listar() {
    return this.listarUsuariosUseCase.execute(false);
  }

  @Post('auth/usuarios')
  async crear(@Body(new ZodPipe(crearUsuarioSchema)) dto: CrearUsuarioDto) {
    try {
      return await this.crearUsuarioUseCase.execute(dto);
    } catch (e: any) {
      if (e.message === 'El usuario ya existe') {
        throw new ConflictException(e.message);
      }
      throw new BadRequestException(e.message);
    }
  }

  @Put('auth/usuarios/:id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(editarUsuarioSchema)) dto: EditarUsuarioDto,
    @CurrentUser() actor: AuthUser,
  ) {
    try {
      return await this.actualizarUsuarioUseCase.execute(id, dto, actor.id);
    } catch (e: any) {
      if (e.message === 'Usuario no encontrado') {
        throw new NotFoundException(e.message);
      }
      if (e.message === 'No puedes desactivarte a ti mismo') {
        throw new BadRequestException(e.message);
      }
      throw new BadRequestException(e.message);
    }
  }

  @Delete('auth/usuarios/:id')
  async eliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUser,
  ) {
    try {
      return await this.eliminarUsuarioUseCase.execute(id, actor.id);
    } catch (e: any) {
      if (e.message === 'Usuario no encontrado') {
        throw new NotFoundException(e.message);
      }
      if (e.message === 'No puedes eliminarte a ti mismo') {
        throw new BadRequestException(e.message);
      }
      throw new BadRequestException(e.message);
    }
  }
}
