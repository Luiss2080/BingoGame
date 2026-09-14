import * as argon2 from 'argon2';
import { IUserRepository, IUserRepositoryToken } from '../../domain/repositories/IUserRepository';
import { User, Rol } from '../../domain/entities/User';
import { CrearUsuarioDto } from '@bingo/common';
import { PrismaService } from '../../../prisma/prisma.service'; // To get group name
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class CrearUsuarioUseCase {
  constructor(
    @Inject(IUserRepositoryToken)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: CrearUsuarioDto) {
    const existente = await this.userRepository.findByUsername(dto.username);
    if (existente) {
      throw new Error('El usuario ya existe');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = new User(
      0, // ID 0 for new user
      dto.username,
      passwordHash,
      dto.rol as Rol,
      true, // activo por defecto
      dto.grupo_id ?? null,
      new Date(),
    );

    const saved = await this.userRepository.save(user);

    let grupo_nombre = null;
    if (saved.grupoId) {
      const grupo = await this.prisma.grupo.findUnique({ where: { id: saved.grupoId } });
      grupo_nombre = grupo?.nombre ?? null;
    }

    return {
      id: saved.id,
      username: saved.username,
      rol: saved.rol,
      activo: saved.activo,
      grupo_id: saved.grupoId,
      grupo_nombre,
      fecha_creacion: saved.fechaCreacion.toISOString(),
    };
  }
}
