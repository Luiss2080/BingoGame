import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { DEFAULTS_VENDEDOR, PERMISOS } from '@bingo/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Crea el admin inicial y los permisos por defecto del rol vendedor en el
 * primer arranque. Idempotente: no pisa datos existentes (salvo, opcionalmente,
 * el password del admin si RESET_ADMIN_PASSWORD=1).
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD', 'admin1234');
    const existente = await this.prisma.user.findUnique({
      where: { username: 'admin' },
    });
    if (!existente) {
      await this.prisma.user.create({
        data: {
          username: 'admin',
          passwordHash: await argon2.hash(adminPassword),
          rol: 'admin',
        },
      });
      this.logger.log('Admin inicial creado');
    } else if (this.config.get('RESET_ADMIN_PASSWORD') === '1') {
      await this.prisma.user.update({
        where: { id: existente.id },
        data: { passwordHash: await argon2.hash(adminPassword) },
      });
      this.logger.warn('Password del admin restablecido por RESET_ADMIN_PASSWORD');
    }

    for (const permiso of PERMISOS) {
      await this.prisma.permisoRol.upsert({
        where: { uq_permiso_rol: { rol: 'vendedor', permiso } },
        update: {},
        create: { rol: 'vendedor', permiso, habilitado: DEFAULTS_VENDEDOR[permiso] },
      });
    }
  }
}
