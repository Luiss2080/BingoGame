import { ICartonRepository } from '../../domain/repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../../domain/entities/Carton';

export interface ReservarCartonRequest {
  id: number;
  vendedorId: number;
  grupoId: number;
}

export class ReservarCartonUseCase {
  constructor(private readonly cartonRepository: ICartonRepository) {}

  async execute(request: ReservarCartonRequest): Promise<Carton> {
    const carton = await this.cartonRepository.findById(request.id);

    if (!carton) {
      throw new Error('Cartón no encontrado');
    }

    if (carton.grupoId !== request.grupoId) {
      throw new Error('El cartón no pertenece a tu grupo');
    }

    if (carton.estado !== EstadoCarton.DISPONIBLE) {
      throw new Error('El cartón no está disponible para reserva');
    }

    carton.estado = EstadoCarton.RESERVADO;
    carton.vendedorId = request.vendedorId;
    
    // In a real application we would set a TTL in Redis or save the reserve timestamp.
    carton.fechaActualizacion = new Date();

    return this.cartonRepository.update(carton);
  }
}
