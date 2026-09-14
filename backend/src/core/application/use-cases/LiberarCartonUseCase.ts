import { ICartonRepository } from '../../domain/repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../../domain/entities/Carton';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository';

export interface LiberarCartonRequest {
  id: number;
  usuarioId: number;
}

export class LiberarCartonUseCase {
  constructor(
    private readonly cartonRepository: ICartonRepository,
    private readonly realtimeGateway?: RealtimeGateway,
    private readonly auditLogRepository?: IAuditLogRepository,
  ) {}

  async execute(request: LiberarCartonRequest): Promise<Carton> {
    const carton = await this.cartonRepository.findById(request.id);
    if (!carton) {
      throw new Error('Cartón no encontrado');
    }

    const estadoAnteriorStr = carton.estado;
    carton.liberar();

    const cartonGuardado = await this.cartonRepository.update(carton);
    
    if (this.auditLogRepository) {
      await this.auditLogRepository.save({
        entidad: 'Carton',
        entidadId: cartonGuardado.id,
        accion: 'LIBERAR',
        usuarioId: request.usuarioId,
        estadoAnterior: { estado: estadoAnteriorStr },
        estadoNuevo: { estado: 'disponible' },
      });
    }

    if (this.realtimeGateway) {
      this.realtimeGateway.emitCartonLiberado(cartonGuardado.id);
    }
    
    return cartonGuardado;
  }
}
