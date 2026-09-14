import { ICartonRepository } from '../../domain/repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../../domain/entities/Carton';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';

export interface LiberarCartonRequest {
  id: number;
}

export class LiberarCartonUseCase {
  constructor(
    private readonly cartonRepository: ICartonRepository,
    private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async execute(request: LiberarCartonRequest): Promise<Carton> {
    const carton = await this.cartonRepository.findById(request.id);
    if (!carton) {
      throw new Error('Cartón no encontrado');
    }

    carton.liberar();

    const cartonGuardado = await this.cartonRepository.update(carton);
    
    if (this.realtimeGateway) {
      this.realtimeGateway.emitCartonLiberado(cartonGuardado.id);
    }
    
    return cartonGuardado;
  }
}
