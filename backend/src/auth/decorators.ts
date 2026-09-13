import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Permiso, Rol } from '@bingo/common';

export interface AuthUser {
  id: number;
  rol: Rol;
  username: string;
}

export const IS_PUBLIC_KEY = 'isPublic';
/** Ruta accesible sin JWT (login, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ADMIN_ONLY_KEY = 'adminOnly';
/** Solo usuarios con rol admin. */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);

export const PERMISO_KEY = 'permisoRequerido';
/** Exige un permiso configurable (el admin siempre pasa). */
export const RequierePermiso = (permiso: Permiso) =>
  SetMetadata(PERMISO_KEY, permiso);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
