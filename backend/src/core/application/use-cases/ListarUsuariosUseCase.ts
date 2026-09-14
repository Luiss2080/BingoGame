import { PrismaService } from '../../../prisma/prisma.service';

export class ListarUsuariosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(soloActivos: boolean = false) {
    const usuarios = await this.prisma.user.findMany({
      where: soloActivos ? { activo: true } : undefined,
      include: { grupo: { select: { nombre: true } } },
      orderBy: { username: 'asc' },
    });

    return usuarios.map((u) => ({
      id: u.id,
      username: u.username,
      rol: u.rol,
      activo: u.activo,
      grupo_id: u.grupoId,
      grupo_nombre: u.grupo?.nombre ?? null,
      fecha_creacion: u.fechaCreacion.toISOString(),
    }));
  }
}
