import { Controller, Get, Inject } from '@nestjs/common';
import { AdminOnly } from '../auth/decorators';
import { IAuditLogRepositoryToken } from '../core/domain/repositories/IAuditLogRepositoryToken';
import { IAuditLogRepository } from '../core/domain/repositories/IAuditLogRepository';

@Controller('admin/audit-logs')
@AdminOnly()
export class AuditController {
  constructor(
    @Inject(IAuditLogRepositoryToken)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  @Get()
  async getRecentLogs() {
    return this.auditRepo.findRecent(100);
  }
}
