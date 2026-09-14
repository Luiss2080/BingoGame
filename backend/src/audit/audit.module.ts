import { Module } from '@nestjs/common';
import { PrismaAuditLogRepository } from '../infrastructure/database/PrismaAuditLogRepository';
import { IAuditLogRepositoryToken } from '../core/domain/repositories/IAuditLogRepositoryToken';
import { AuditController } from './audit.controller';

@Module({
  controllers: [AuditController],
  providers: [
    {
      provide: IAuditLogRepositoryToken,
      useClass: PrismaAuditLogRepository,
    },
  ],
  exports: [IAuditLogRepositoryToken],
})
export class AuditModule {}
