import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { GenerarReporteExcelUseCase } from '../core/application/use-cases/GenerarReporteExcelUseCase';
import { GenerarReportePdfUseCase } from '../core/application/use-cases/GenerarReportePdfUseCase';

@Module({
  controllers: [ReportesController],
  providers: [
    GenerarReporteExcelUseCase,
    GenerarReportePdfUseCase
  ]
})
export class ReportesModule {}
