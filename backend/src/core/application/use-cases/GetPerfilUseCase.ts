import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { PermisosService } from '../../../permisos/permisos.service';
import { PrismaService } from '../../../prisma/prisma.service';

export class GetPerfilUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly permisosService: PermisosService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.activo) {
      throw new Error('Usuario no autorizado');
    }

    // Usamos Prisma solo para traer el nombre del grupo. 
    // Lo ideal sería IGroupRepository, pero para fines de simplificar:
    let grupo_nombre = null;
    if (user.grupoId) {
      const g = await this.prisma.grupo.findUnique({ where: { id: user.grupoId }});
      grupo_nombre = g?.nombre ?? null;
    }

    const permisos = await this.permisosService.getForRol(user.rol);

    return {
      id: user.id,
      username: user.username,
      rol: user.rol,
      grupo_id: user.grupoId,
      grupo_nombre,
      permisos,
    };
  }
}
