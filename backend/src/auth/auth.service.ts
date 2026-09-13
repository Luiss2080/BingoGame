import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { LoginDto } from '@bingo/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermisosService } from '../permisos/permisos.service';
import { esHashWerkzeug, verificarHashWerkzeug } from './werkzeug-hash';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly permisos: PermisosService,
  ) {}

  async login({ username, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    let valido = false;
    if (esHashWerkzeug(user.passwordHash)) {
      valido = verificarHashWerkzeug(user.passwordHash, password);
      if (valido) {
        // Usuario migrado desde Flask: actualizar al hash moderno
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: await argon2.hash(password) },
        });
      }
    } else {
      valido = await argon2.verify(user.passwordHash, password).catch(() => false);
    }
    if (!valido) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const token = await this.jwt.signAsync({
      sub: String(user.id),
      rol: user.rol,
      username: user.username,
    });

    return {
      token,
      user: { id: user.id, username: user.username, rol: user.rol },
      permisos: await this.permisos.getForRol(user.rol),
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { grupo: true },
    });
    if (!user || !user.activo) throw new UnauthorizedException();
    return {
      id: user.id,
      username: user.username,
      rol: user.rol,
      grupo_id: user.grupoId,
      grupo_nombre: user.grupo?.nombre ?? null,
      permisos: await this.permisos.getForRol(user.rol),
    };
  }
}
