import * as argon2 from 'argon2';
import { IUserRepository, IUserRepositoryToken } from '../../domain/repositories/IUserRepository';
import { EditarUsuarioDto } from '@bingo/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Rol } from '../../domain/entities/User';
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class ActualizarUsuarioUseCase {
  constructor(
    @Inject(IUserRepositoryToken)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: number, dto: EditarUsuarioDto, actorId: number) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (id === actorId && dto.activo === false) {
      throw new Error('No puedes desactivarte a ti mismo');
    }

    if (dto.password) {
      user.passwordHash = await argon2.hash(dto.password);
    }
    if (dto.rol !== undefined) {
      user.rol = dto.rol as Rol;
    }
    if (dto.activo !== undefined) {
      user.activo = dto.activo;
    }
    if (dto.grupo_id !== undefined) {
      user.grupoId = dto.grupo_id;
    }

    const updated = await this.userRepository.update(user);

    let grupo_nombre = null;
    if (updated.grupoId) {
      const grupo = await this.prisma.grupo.findUnique({ where: { id: updated.grupoId } });
      grupo_nombre = grupo?.nombre ?? null;
    }

    return {
      id: updated.id,
      username: updated.username,
      rol: updated.rol,
      activo: updated.activo,
      grupo_id: updated.grupoId,
      grupo_nombre,
      fecha_creacion: updated.fechaCreacion.toISOString(),
    };
  }
}
