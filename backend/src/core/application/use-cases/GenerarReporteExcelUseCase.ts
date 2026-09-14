import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class GenerarReporteExcelUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BingoApp';
    workbook.created = new Date();

    // Hoja 1: Resumen General por Vendedor
    const wsResumen = workbook.addWorksheet('Resumen Vendedores');
    wsResumen.columns = [
      { header: 'Vendedor', key: 'vendedor', width: 25 },
      { header: 'Cartones Vendidos', key: 'vendidos', width: 20 },
      { header: 'Recaudación Total', key: 'recaudacion', width: 20 },
    ];

    // Estilos de cabecera
    wsResumen.getRow(1).font = { bold: true };
    wsResumen.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const ranking = await this.prisma.carton.groupBy({
      by: ['vendedorId'],
      _count: { id: true },
      _sum: { precio: true },
      where: { estado: 'vendido', vendedorId: { not: null } },
      orderBy: { _sum: { precio: 'desc' } },
    });

    const usuariosIds = ranking.map((r) => r.vendedorId!).filter(Boolean);
    const usuarios = await this.prisma.user.findMany({
      where: { id: { in: usuariosIds } },
      select: { id: true, username: true },
    });
    const mapUsuarios = new Map(usuarios.map((u) => [u.id, u.username]));

    let granTotal = 0;
    let totalCartones = 0;

    for (const r of ranking) {
      const rec = Number(r._sum.precio || 0);
      granTotal += rec;
      totalCartones += r._count.id;
      
      wsResumen.addRow({
        vendedor: mapUsuarios.get(r.vendedorId!) || 'Desconocido',
        vendidos: r._count.id,
        recaudacion: rec,
      });
    }

    wsResumen.addRow([]);
    const rowTotal = wsResumen.addRow({
      vendedor: 'TOTAL',
      vendidos: totalCartones,
      recaudacion: granTotal,
    });
    rowTotal.font = { bold: true };

    // Hoja 2: Detalles de Cartones Vendidos
    const wsDetalles = workbook.addWorksheet('Detalle de Ventas');
    wsDetalles.columns = [
      { header: 'ID Cartón', key: 'numero', width: 15 },
      { header: 'Vendedor', key: 'vendedor', width: 20 },
      { header: 'Comprador', key: 'comprador', width: 25 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Precio', key: 'precio', width: 15 },
      { header: 'Fecha de Venta', key: 'fecha', width: 25 },
    ];

    wsDetalles.getRow(1).font = { bold: true };
    wsDetalles.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const cartonesVendidos = await this.prisma.carton.findMany({
      where: { estado: 'vendido' },
      include: {
        vendedor: { select: { username: true } },
      },
      orderBy: { fechaVenta: 'desc' },
    });

    for (const c of cartonesVendidos) {
      wsDetalles.addRow({
        numero: c.numero,
        vendedor: c.vendedor?.username || 'N/A',
        comprador: c.comprador || 'N/A',
        telefono: c.telefonoComprador || 'N/A',
        precio: Number(c.precio || 0),
        fecha: c.fechaVenta ? c.fechaVenta.toLocaleString() : 'N/A',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }
}
