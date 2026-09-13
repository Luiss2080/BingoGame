import { ICartonRepository } from '../../domain/repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../../domain/entities/Carton';

export interface VenderCartonRequest {
  id: number;
  vendedorId: number;
  grupoId: number;
  comprador: string;
  precio: number;
  telefono?: string;
}

export class VenderCartonUseCase {
  constructor(private readonly cartonRepository: ICartonRepository) {}

  async execute(request: VenderCartonRequest): Promise<Carton> {
    if (request.precio < 0) {
      throw new Error('El precio no puede ser negativo');
    }

    const carton = await this.cartonRepository.findById(request.id);

    if (!carton) {
      throw new Error('Cartón no encontrado');
    }

    if (carton.grupoId !== request.grupoId) {
      throw new Error('El cartón no pertenece a tu grupo');
    }

    if (carton.estado === EstadoCarton.VENDIDO) {
      throw new Error('El cartón ya fue vendido');
    }

    if (carton.estado === EstadoCarton.RESERVADO && carton.vendedorId !== request.vendedorId) {
      throw new Error('El cartón está reservado por otro vendedor');
    }

    carton.marcarComoVendido(
      request.vendedorId,
      request.comprador,
      request.precio,
      request.telefono
    );

    return this.cartonRepository.update(carton);
  }
}
