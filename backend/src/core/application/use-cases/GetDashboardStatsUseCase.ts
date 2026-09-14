import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface DashboardStatsRequest {
  userId: number;
  rol: string;
  grupoId?: number | null;
}

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(request: DashboardStatsRequest) {
    const admin = request.rol === 'admin';
    const whereGrupo = !admin && request.grupoId ? { grupoId: request.grupoId } : {};

    // 1. Estadísticas de Cartones
    const totalCartones = await this.prisma.carton.count({ where: whereGrupo });
    const disponibles = await this.prisma.carton.count({
      where: { ...whereGrupo, estado: 'disponible' },
    });
    const vendidos = await this.prisma.carton.count({
      where: { ...whereGrupo, estado: 'vendido' },
    });
    const reservados = await this.prisma.carton.count({
      where: { ...whereGrupo, estado: 'reservado' },
    });

    let totalRecaudado = 0;
    if (admin) {
      const agg = await this.prisma.carton.aggregate({
        _sum: { precio: true },
        where: { estado: 'vendido' },
      });
      totalRecaudado = Number(agg._sum.precio || 0);
    }

    let disponiblesDispersos = 0;
    if (admin) {
      const filas = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        WITH disp AS (
          SELECT id, numero, 
                 ROW_NUMBER() OVER(PARTITION BY numero ORDER BY id) as rn
          FROM cartones
          WHERE estado = 'disponible'
        )
        SELECT COUNT(*) AS total FROM disp WHERE rn = 1`);
      disponiblesDispersos = Number(filas[0]?.total || 0);
    } else {
      const filas = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        WITH disp AS (
          SELECT id, numero, 
                 ROW_NUMBER() OVER(PARTITION BY numero ORDER BY id) as rn
          FROM cartones
          WHERE estado = 'disponible' AND grupo_id = ${request.grupoId}
        )
        SELECT COUNT(*) AS total FROM disp WHERE rn = 1`);
      disponiblesDispersos = Number(filas[0]?.total || 0);
    }

    // 2. Ranking de Vendedores (Top 10)
    let ranking = await this.prisma.carton.groupBy({
      by: ['vendedorId'],
      _count: { id: true },
      _sum: { precio: true },
      where: { ...whereGrupo, estado: 'vendido', vendedorId: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const usuariosIds = ranking.map((r: any) => r.vendedorId!).filter(Boolean);
    const usuarios = await this.prisma.user.findMany({
      where: { id: { in: usuariosIds } },
      select: { id: true, username: true },
    });
    const mapUsuarios = new Map(usuarios.map((u: any) => [u.id, u.username]));

    const ranking_vendedores = ranking.map((r: any) => ({
      username: mapUsuarios.get(r.vendedorId!) || 'Desconocido',
      vendidos: r._count.id,
      recaudado: Number(r._sum.precio || 0),
    }));

    // 3. Resumen de PDFs
    const ultimosPdfs = await this.prisma.pdfProcesado.findMany({
      take: 5,
      orderBy: { fechaProcesado: 'desc' },
      select: { id: true, nombreArchivo: true, totalPaginas: true, estado: true, fechaProcesado: true },
    });
    
    // Calcular ratio de éxito
    const totalPdfs = await this.prisma.pdfProcesado.count();
    const pdfsExitosos = await this.prisma.pdfProcesado.count({ where: { estado: 'completado' } });
    const ratioExitoPdf = totalPdfs > 0 ? (pdfsExitosos / totalPdfs) * 100 : 100;

    // 4. Ventas por hora (Solo admin, últimos 7 días o todo)
    let ventasPorHora: { hora: string; cantidad: number; ingresos: number }[] = [];
    if (admin) {
      // Usar SQLite Date functions para agrupar por hora
      const ventas = await this.prisma.$queryRaw<{ hora: string; cantidad: bigint; ingresos: number }[]>(Prisma.sql`
        SELECT 
          strftime('%Y-%m-%d %H:00', fecha_venta) as hora,
          COUNT(*) as cantidad,
          SUM(precio) as ingresos
        FROM cartones
        WHERE estado = 'vendido' AND fecha_venta IS NOT NULL
        GROUP BY hora
        ORDER BY hora ASC
      `);
      
      ventasPorHora = ventas.map((v: any) => ({
        hora: v.hora,
        cantidad: Number(v.cantidad),
        ingresos: Number(v.ingresos || 0)
      }));
    }

    return {
      cartones: {
        total: totalCartones,
        disponibles,
        disponibles_unicos: disponiblesDispersos,
        vendidos,
        reservados,
      },
      financiero: admin ? { total_recaudado: totalRecaudado } : undefined,
      ranking_vendedores,
      ultimos_pdfs: ultimosPdfs.map((p: any) => ({
        id: p.id,
        nombre: p.nombreArchivo,
        estado: p.estado,
        fecha: p.fechaProcesado,
        paginas: p.totalPaginas,
      })),
      estadisticas_pdf: admin ? {
        total: totalPdfs,
        exitosos: pdfsExitosos,
        ratio_exito: ratioExitoPdf
      } : undefined,
      ventas_por_hora: ventasPorHora,
    };
  }
}
