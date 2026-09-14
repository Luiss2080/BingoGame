export interface AuditLogEntry {
  id?: number;
  entidad: string;
  entidadId: number;
  accion: string;
  usuarioId: number;
  estadoAnterior?: any;
  estadoNuevo?: any;
  fecha?: Date;
}

export interface IAuditLogRepository {
  save(entry: AuditLogEntry): Promise<void>;
  findRecent(limit?: number): Promise<any[]>;
}
