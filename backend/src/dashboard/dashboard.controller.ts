import { Controller, Get } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUser, AuthUser } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async dashboard(@CurrentUser() user: AuthUser) {
    const esAdmin = user.rol === 'admin';

    let disponibles: number;
    let vendidos: number;
    let reservados: number;
    let ingresos: number;
    let totalPdfs: number;
    let ultimosPdfs;

    if (esAdmin) {
      [disponibles, vendidos, reservados, totalPdfs] = await Promise.all([
        this.prisma.carton.count({ where: { estado: 'disponible' } }),
        this.prisma.carton.count({ where: { estado: 'vendido' } }),
        this.prisma.carton.count({ where: { estado: 'reservado' } }),
        this.prisma.pdfProcesado.count(),
      ]);
      const suma = await this.prisma.carton.aggregate({
        _sum: { precio: true },
        where: { estado: 'vendido' },
      });
      ingresos = Number(suma._sum.precio ?? 0);
      ultimosPdfs = await this.prisma.pdfProcesado.findMany({
        orderBy: { fechaProcesado: 'desc' },
        take: 5,
      });
    } else {
      const usuario = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { grupoId: true },
      });
      const grupoId = usuario?.grupoId ?? null;

      // Disponibles globales: mismo criterio que el listado (un número cuenta
      // si ningún cartón de ese número está reservado/vendido)
      const filas = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        WITH disp AS (
          SELECT c.id, ROW_NUMBER() OVER (
            PARTITION BY c.numero
            ORDER BY
              CASE WHEN ${grupoId}::int IS NOT NULL
                    AND c.grupo_id = ${grupoId}::int THEN 0 ELSE 1 END,
              c.id
          ) AS rn
          FROM cartones c
          WHERE c.estado = 'disponible'
            AND NOT EXISTS (
              SELECT 1 FROM cartones o
              WHERE o.numero = c.numero AND o.estado IN ('reservado', 'vendido')
            )
        )
        SELECT COUNT(*) AS total FROM disp WHERE rn = 1`);
      disponibles = Number(filas[0]?.total ?? 0);

      [reservados, vendidos, totalPdfs] = await Promise.all([
        this.prisma.carton.count({
          where: { vendedorId: user.id, estado: 'reservado' },
        }),
        this.prisma.carton.count({
          where: { vendedorId: user.id, estado: 'vendido' },
        }),
        this.prisma.pdfProcesado.count({ where: { subidoPor: user.id } }),
      ]);
      const suma = await this.prisma.carton.aggregate({
        _sum: { precio: true },
        where: { vendedorId: user.id, estado: 'vendido' },
      });
      ingresos = Number(suma._sum.precio ?? 0);
      ultimosPdfs = await this.prisma.pdfProcesado.findMany({
        where: { subidoPor: user.id },
        orderBy: { fechaProcesado: 'desc' },
        take: 5,
      });
    }

    return {
      total_pdfs: totalPdfs,
      total_cartones: disponibles + reservados + vendidos,
      disponibles,
      vendidos,
      reservados,
      ingresos,
      ultimos_pdfs: ultimosPdfs.map((p) => ({
        id: p.id,
        nombre_archivo: p.nombreArchivo,
        fecha_procesado: p.fechaProcesado.toISOString(),
        total_paginas: p.totalPaginas,
        paginas_ok: p.paginasOk,
        paginas_error: p.paginasError,
        estado: p.estado,
      })),
      es_admin: esAdmin,
    };
  }
}
