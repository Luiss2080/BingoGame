import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { GetDashboardStatsUseCase } from '../core/application/use-cases/GetDashboardStatsUseCase';

@Module({
  controllers: [DashboardController],
  providers: [GetDashboardStatsUseCase],
})
export class DashboardModule {}
