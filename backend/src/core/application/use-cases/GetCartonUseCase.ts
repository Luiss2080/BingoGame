import { ICartonRepository } from '../../domain/repositories/ICartonRepository';
import { Carton } from '../../domain/entities/Carton';

export interface GetCartonRequest {
  id?: number;
  numero?: string;
  grupoId?: number;
}

export class GetCartonUseCase {
  constructor(private readonly cartonRepository: ICartonRepository) {}

  async execute(request: GetCartonRequest): Promise<Carton> {
    if (!request.id && (!request.numero || !request.grupoId)) {
      throw new Error('Debe proporcionar el id o el (numero y grupoId) del cartón');
    }

    let carton: Carton | null = null;

    if (request.id) {
      carton = await this.cartonRepository.findById(request.id);
    } else if (request.numero && request.grupoId) {
      carton = await this.cartonRepository.findByNumeroAndGrupo(request.numero, request.grupoId);
    }

    if (!carton) {
      throw new Error('Cartón no encontrado');
    }

    return carton;
  }
}
