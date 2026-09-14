import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GenerarReporteExcelUseCase } from '../core/application/use-cases/GenerarReporteExcelUseCase';
import { GenerarReportePdfUseCase } from '../core/application/use-cases/GenerarReportePdfUseCase';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('admin')
export class ReportesController {
  constructor(
    private readonly generarReporteExcelUseCase: GenerarReporteExcelUseCase,
    private readonly generarReportePdfUseCase: GenerarReportePdfUseCase,
  ) {}

  @Get('excel')
  async descargarExcel(@Res() res: Response) {
    const buffer = await this.generarReporteExcelUseCase.execute();
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=Reporte_Ventas_${Date.now()}.xlsx`,
      'Content-Length': buffer.length,
    });
    
    res.end(buffer);
  }

  @Get('pdf')
  async descargarPdf(@Res() res: Response) {
    const stream = await this.generarReportePdfUseCase.execute();
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Corte_Caja_${Date.now()}.pdf`,
    });
    
    stream.pipe(res);
  }
}
