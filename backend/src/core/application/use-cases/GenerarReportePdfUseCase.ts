import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class GenerarReportePdfUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<NodeJS.ReadableStream> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc
      .fontSize(20)
      .text('Corte de Caja General', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .text(`Fecha de generación: ${new Date().toLocaleString()}`, { align: 'center' })
      .moveDown(2);

    // Obtener balance por vendedor
    const ranking = await this.prisma.carton.groupBy({
      by: ['vendedorId'],
      _count: { id: true },
      _sum: { precio: true },
      where: { estado: 'vendido', vendedorId: { not: null } },
      orderBy: { _sum: { precio: 'desc' } },
    });

    const usuariosIds = ranking.map((r: any) => r.vendedorId!).filter(Boolean);
    const usuarios = await this.prisma.user.findMany({
      where: { id: { in: usuariosIds } },
      select: { id: true, username: true },
    });
    const mapUsuarios = new Map(usuarios.map((u: any) => [u.id, u.username]));

    let granTotal = 0;
    let totalCartones = 0;

    // Dibujar tabla
    const tableTop = 150;
    let y = tableTop;

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Vendedor', 50, y);
    doc.text('Cartones', 300, y);
    doc.text('Recaudado', 400, y);
    
    doc.moveTo(50, y + 15).lineTo(500, y + 15).stroke();
    y += 25;

    doc.font('Helvetica');
    for (const r of ranking) {
      const rec = Number(r._sum.precio || 0);
      granTotal += rec;
      totalCartones += r._count.id;
      
      const vendedor = String(mapUsuarios.get(r.vendedorId!) || 'Desconocido');
      
      doc.text(vendedor, 50, y);
      doc.text(r._count.id.toString(), 300, y);
      doc.text(`$${rec.toFixed(2)}`, 400, y);
      y += 20;

      // Nueva página si llega al final
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    }

    doc.moveTo(50, y).lineTo(500, y).stroke();
    y += 10;

    doc.font('Helvetica-Bold');
    doc.text('TOTAL GENERAL', 50, y);
    doc.text(totalCartones.toString(), 300, y);
    doc.text(`$${granTotal.toFixed(2)}`, 400, y);

    // Finalizar el documento, devolviéndolo como un stream de lectura
    doc.end();

    return doc;
  }
}
