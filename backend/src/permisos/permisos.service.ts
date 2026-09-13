import { Injectable } from '@nestjs/common';
import {
  DEFAULTS_VENDEDOR,
  PERMISOS,
  type Permiso,
  type Rol,
} from '@bingo/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermisosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin: todo true. Vendedor: defaults sobrescritos por la tabla permisos_rol. */
  async getForRol(rol: Rol): Promise<Record<Permiso, boolean>> {
    if (rol === 'admin') {
      return Object.fromEntries(PERMISOS.map((p) => [p, true])) as Record<
        Permiso,
        boolean
      >;
    }
    const filas = await this.prisma.permisoRol.findMany({ where: { rol } });
    const resultado = { ...DEFAULTS_VENDEDOR };
    for (const fila of filas) {
      if ((PERMISOS as readonly string[]).includes(fila.permiso)) {
        resultado[fila.permiso as Permiso] = fila.habilitado;
      }
    }
    return resultado;
  }

  async setPermiso(permiso: Permiso, habilitado: boolean) {
    await this.prisma.permisoRol.upsert({
      where: { uq_permiso_rol: { rol: 'vendedor', permiso } },
      update: { habilitado },
      create: { rol: 'vendedor', permiso, habilitado },
    });
    return this.getForRol('vendedor');
  }
}
