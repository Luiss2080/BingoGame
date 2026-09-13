import { Carton } from '../../domain/entities/Carton';
import { ICartonRepository } from '../../domain/repositories/ICartonRepository';

export interface LiberarCartonRequest {
  id: number;
}

export class LiberarCartonUseCase {
  constructor(private readonly cartonRepository: ICartonRepository) {}

  async execute(request: LiberarCartonRequest): Promise<Carton> {
    const carton = await this.cartonRepository.findById(request.id);
    if (!carton) {
      throw new Error('Cartón no encontrado');
    }

    carton.liberar();

    return this.cartonRepository.update(carton);
  }
}
