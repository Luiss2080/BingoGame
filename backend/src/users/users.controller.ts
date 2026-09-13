import {
  Body,
  Controller,
  Delete,
  Get,
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
import { UsersService } from './users.service';

@Controller()
@AdminOnly()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Lista de usuarios activos (filtros y asignación en subida de PDF). */
  @Get('usuarios')
  listarActivos() {
    return this.users.listar(true);
  }

  @Get('auth/usuarios')
  listar() {
    return this.users.listar(false);
  }

  @Post('auth/usuarios')
  crear(@Body(new ZodPipe(crearUsuarioSchema)) dto: CrearUsuarioDto) {
    return this.users.crear(dto);
  }

  @Put('auth/usuarios/:id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(editarUsuarioSchema)) dto: EditarUsuarioDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.actualizar(id, dto, actor.id);
  }

  @Delete('auth/usuarios/:id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.eliminar(id, actor.id);
  }
}
