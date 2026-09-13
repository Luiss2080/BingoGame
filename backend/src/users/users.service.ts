import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { CrearUsuarioDto, EditarUsuarioDto } from '@bingo/common';
import { PrismaService } from '../prisma/prisma.service';

type UserConGrupo = {
  id: number;
  username: string;
  rol: string;
  activo: boolean;
  grupoId: number | null;
  fechaCreacion: Date;
  grupo: { nombre: string } | null;
};

function toDto(u: UserConGrupo) {
  return {
    id: u.id,
    username: u.username,
    rol: u.rol,
    activo: u.activo,
    grupo_id: u.grupoId,
    grupo_nombre: u.grupo?.nombre ?? null,
    fecha_creacion: u.fechaCreacion.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(soloActivos = false) {
    const usuarios = await this.prisma.user.findMany({
      where: soloActivos ? { activo: true } : undefined,
      include: { grupo: { select: { nombre: true } } },
      orderBy: { username: 'asc' },
    });
    return usuarios.map(toDto);
  }

  async crear(dto: CrearUsuarioDto) {
    const existente = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existente) throw new ConflictException('El usuario ya existe');

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash: await argon2.hash(dto.password),
        rol: dto.rol,
        grupoId: dto.grupo_id ?? null,
      },
      include: { grupo: { select: { nombre: true } } },
    });
    return toDto(user);
  }

  async actualizar(id: number, dto: EditarUsuarioDto, actorId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (id === actorId && dto.activo === false) {
      throw new BadRequestException('No puedes desactivarte a ti mismo');
    }

    const actualizado = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.password ? { passwordHash: await argon2.hash(dto.password) } : {}),
        ...(dto.rol !== undefined ? { rol: dto.rol } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
        ...(dto.grupo_id !== undefined ? { grupoId: dto.grupo_id } : {}),
      },
      include: { grupo: { select: { nombre: true } } },
    });
    return toDto(actualizado);
  }

  async eliminar(id: number, actorId: number) {
    if (id === actorId) {
      throw new BadRequestException('No puedes eliminarte a ti mismo');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Los cartones/pdfs del usuario quedan sin vendedor, no se borran
    await this.prisma.$transaction([
      this.prisma.carton.updateMany({
        where: { vendedorId: id },
        data: { vendedorId: null },
      }),
      this.prisma.pdfProcesado.updateMany({
        where: { subidoPor: id },
        data: { subidoPor: null },
      }),
      this.prisma.user.delete({ where: { id } }),
    ]);
    return { mensaje: 'Usuario eliminado' };
  }
}
