import { EstadoCarton } from '../../domain/entities/Carton';
import { ICartonRepository } from '../../domain/repositories/ICartonRepository';

export interface EliminarCartonRequest {
  id: number;
}

export class EliminarCartonUseCase {
  constructor(private readonly cartonRepository: ICartonRepository) {}

  async execute(request: EliminarCartonRequest): Promise<void> {
    const carton = await this.cartonRepository.findById(request.id);
    if (!carton) {
      throw new Error('Cartón no encontrado');
    }

    if (carton.estado === EstadoCarton.VENDIDO) {
      throw new Error('No se puede eliminar un cartón que ya ha sido vendido');
    }

    await this.cartonRepository.delete(request.id);
  }
}
