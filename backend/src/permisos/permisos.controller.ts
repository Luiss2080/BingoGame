import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  PERMISO_LABELS,
  permisoParamSchema,
  setPermisoSchema,
} from '@bingo/common';
import { ZodPipe } from '../common/zod.pipe';
import { AdminOnly } from '../auth/decorators';
import { PermisosService } from './permisos.service';

@Controller('permisos')
@AdminOnly()
export class PermisosController {
  constructor(private readonly permisos: PermisosService) {}

  @Get()
  async listar() {
    return {
      permisos: await this.permisos.getForRol('vendedor'),
      labels: PERMISO_LABELS,
    };
  }

  @Put(':permiso')
  async actualizar(
    @Param('permiso', new ZodPipe(permisoParamSchema)) permiso: any,
    @Body(new ZodPipe(setPermisoSchema)) body: { habilitado: boolean },
  ) {
    const permisos = await this.permisos.setPermiso(permiso, body.habilitado);
    return { permisos };
  }
}
