import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permiso } from '@bingo/common';
import { PermisosService } from '../permisos/permisos.service';
import { ADMIN_ONLY_KEY, PERMISO_KEY, AuthUser } from './decorators';

/**
 * Aplica @AdminOnly y @RequierePermiso. A diferencia del backend Flask
 * (que solo validaba subir_pdf), aquí vender/reservar/liberar también
 * se hacen cumplir en el servidor.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permisos: PermisosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user: AuthUser | undefined = context
      .switchToHttp()
      .getRequest().user;
    if (!user) return true; // ruta pública: no hay nada que validar

    const adminOnly = this.reflector.getAllAndOverride<boolean>(
      ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (adminOnly && user.rol !== 'admin') {
      throw new ForbiddenException('Solo administradores');
    }

    const permiso = this.reflector.getAllAndOverride<Permiso>(PERMISO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (permiso && user.rol !== 'admin') {
      const habilitados = await this.permisos.getForRol(user.rol);
      if (!habilitados[permiso]) {
        throw new ForbiddenException(`No tienes el permiso: ${permiso}`);
      }
    }
    return true;
  }
}
