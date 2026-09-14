import { Injectable } from '@nestjs/common';
import { IAuditLogRepository, AuditLogEntry } from '../../core/domain/repositories/IAuditLogRepository';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entidad: entry.entidad,
        entidadId: entry.entidadId,
        accion: entry.accion,
        usuarioId: entry.usuarioId,
        estadoAnterior: entry.estadoAnterior || null,
        estadoNuevo: entry.estadoNuevo || null,
      },
    });
  }

  async findRecent(limit: number = 100): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { fecha: 'desc' },
      include: {
        usuario: { select: { username: true } },
      },
    });
  }
}
