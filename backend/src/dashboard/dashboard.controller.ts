import { Controller, Get } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser } from '../auth/decorators';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getDashboardStats(@CurrentUser() user: AuthUser) {
    const admin = user.rol === 'admin';
    const whereGrupo = !admin && user.grupoId ? { grupoId: user.grupoId } : {};

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
          WHERE estado = 'disponible' AND grupo_id = ${user.grupoId}
        )
        SELECT COUNT(*) AS total FROM disp WHERE rn = 1`);
      disponiblesDispersos = Number(filas[0]?.total || 0);
    }

    // 2. Ranking de Vendedores
    let ranking = await this.prisma.carton.groupBy({
      by: ['vendedorId'],
      _count: { id: true },
      _sum: { precio: true },
      where: { ...whereGrupo, estado: 'vendido', vendedorId: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const usuariosIds = ranking.map((r) => r.vendedorId!).filter(Boolean);
    const usuarios = await this.prisma.user.findMany({
      where: { id: { in: usuariosIds } },
      select: { id: true, username: true },
    });
    const mapUsuarios = new Map(usuarios.map((u) => [u.id, u.username]));

    const ranking_vendedores = ranking.map((r) => ({
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
    };
  }
}
