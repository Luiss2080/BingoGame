import { IUserRepository, IUserRepositoryToken } from '../../domain/repositories/IUserRepository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class EliminarUsuarioUseCase {
  constructor(
    @Inject(IUserRepositoryToken)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: number, actorId: number) {
    if (id === actorId) {
      throw new Error('No puedes eliminarte a ti mismo');
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

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
