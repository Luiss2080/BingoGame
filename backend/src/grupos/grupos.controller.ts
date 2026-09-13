import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { grupoSchema, type GrupoDto } from '@bingo/common';
import { ZodPipe } from '../common/zod.pipe';
import { AdminOnly } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller('grupos')
export class GruposController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listar() {
    const grupos = await this.prisma.grupo.findMany({
      where: { activo: true },
      include: { _count: { select: { usuarios: { where: { activo: true } } } } },
      orderBy: { nombre: 'asc' },
    });
    return grupos.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      total_usuarios: g._count.usuarios,
    }));
  }

  @Post()
  @AdminOnly()
  async crear(@Body(new ZodPipe(grupoSchema)) dto: GrupoDto) {
    const existente = await this.prisma.grupo.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existente) throw new ConflictException('Ya existe un grupo con ese nombre');
    const grupo = await this.prisma.grupo.create({ data: { nombre: dto.nombre } });
    return { id: grupo.id, nombre: grupo.nombre, total_usuarios: 0 };
  }

  @Put(':id')
  @AdminOnly()
  async renombrar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(grupoSchema)) dto: GrupoDto,
  ) {
    const grupo = await this.prisma.grupo.findUnique({ where: { id } });
    if (!grupo) throw new NotFoundException('Grupo no encontrado');
    const duplicado = await this.prisma.grupo.findUnique({
      where: { nombre: dto.nombre },
    });
    if (duplicado && duplicado.id !== id) {
      throw new ConflictException('Ya existe un grupo con ese nombre');
    }
    const actualizado = await this.prisma.grupo.update({
      where: { id },
      data: { nombre: dto.nombre },
    });
    return { id: actualizado.id, nombre: actualizado.nombre };
  }

  @Delete(':id')
  @AdminOnly()
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    const grupo = await this.prisma.grupo.findUnique({ where: { id } });
    if (!grupo) throw new NotFoundException('Grupo no encontrado');
    // Paridad con Flask: los usuarios y cartones quedan sin grupo
    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { grupoId: id }, data: { grupoId: null } }),
      this.prisma.carton.updateMany({ where: { grupoId: id }, data: { grupoId: null } }),
      this.prisma.grupo.delete({ where: { id } }),
    ]);
    return { mensaje: 'Grupo eliminado' };
  }

  @Get(':id/usuarios')
  @AdminOnly()
  async usuarios(@Param('id', ParseIntPipe) id: number) {
    const usuarios = await this.prisma.user.findMany({
      where: { grupoId: id, activo: true },
      orderBy: { username: 'asc' },
      select: { id: true, username: true },
    });
    return usuarios;
  }
}
