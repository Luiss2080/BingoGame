import { Controller, Get } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/decorators';
import { GetDashboardStatsUseCase } from '../core/application/use-cases/GetDashboardStatsUseCase';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase) {}

  @Get()
  async getDashboardStats(@CurrentUser() user: AuthUser) {
    return this.getDashboardStatsUseCase.execute({
      userId: user.sub,
      rol: user.rol,
      grupoId: user.grupoId,
    });
  }
}
