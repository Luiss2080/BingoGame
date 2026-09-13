import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ListarCartonesDto, ReservarDto, VenderDto } from '@bingo/common';
import { unlink } from 'node:fs/promises';
import { AuthUser } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

interface CartonRow {
  id: number;
  numero: string;
  estado: string;
  comprador: string | null;
  telefono_comprador: string | null;
  fecha_venta: Date | null;
  precio: Prisma.Decimal | null;
  notas: string | null;
  pagina_origen: number;
  ruta_imagen: string;
  vendedor_id: number | null;
  grupo_id: number | null;
}

/** Misma forma JSON que el to_dict() del backend Flask. */
function toDto(c: CartonRow) {
  return {
    id: c.id,
    numero: c.numero,
    estado: c.estado,
    comprador: c.comprador,
    telefono_comprador: c.telefono_comprador,
    fecha_venta: c.fecha_venta ? c.fecha_venta.toISOString() : null,
    precio: c.precio !== null ? Number(c.precio) : null,
    notas: c.notas,
    pagina_origen: c.pagina_origen,
    ruta_imagen: c.ruta_imagen,
    vendedor_id: c.vendedor_id,
    grupo_id: c.grupo_id,
  };
}

const COLUMNAS = Prisma.sql`
  c.id, c.numero, c.estado::text AS estado, c.comprador, c.telefono_comprador,
  c.fecha_venta, c.precio, c.notas, c.pagina_origen, c.ruta_imagen,
  c.vendedor_id, c.grupo_id`;

/**
 * CTE de disponibles globales: números sin ningún cartón reservado/vendido
 * en NINGÚN grupo, eligiendo un representante por número y priorizando el
 * del grupo del usuario (para que vea el banner correcto).
 */
function cteDisponibles(grupoIdUsuario: number | null) {
  return Prisma.sql`
    disp AS (
      SELECT c.id, ROW_NUMBER() OVER (
        PARTITION BY c.numero
        ORDER BY
          CASE WHEN ${grupoIdUsuario}::int IS NOT NULL
                AND c.grupo_id = ${grupoIdUsuario}::int THEN 0 ELSE 1 END,
          c.id
      ) AS rn
      FROM cartones c
      WHERE c.estado = 'disponible'
        AND NOT EXISTS (
          SELECT 1 FROM cartones o
          WHERE o.numero = c.numero AND o.estado IN ('reservado', 'vendido')
        )
    ),
    visibles AS (SELECT id FROM disp WHERE rn = 1)`;
}

@Injectable()
export class CartonesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(user: AuthUser, filtros: ListarCartonesDto) {
    const perPage = 30;
    const { page, q } = filtros;
    const estado = filtros.estado || '';

    const filtroQ = q
      ? Prisma.sql` AND (c.numero ILIKE ${'%' + q + '%'}
          OR c.comprador ILIKE ${'%' + q + '%'}
          OR c.telefono_comprador ILIKE ${'%' + q + '%'})`
      : Prisma.empty;

    let where: Prisma.Sql;
    let cte = Prisma.empty;

    if (user.rol === 'admin') {
      const porVendedor = filtros.usuario_id
        ? Prisma.sql` AND c.vendedor_id = ${filtros.usuario_id}`
        : filtros.grupo_id
          ? Prisma.sql` AND c.grupo_id = ${filtros.grupo_id}`
          : Prisma.empty;
      const porEstado = estado
        ? Prisma.sql` AND c.estado::text = ${estado}`
        : Prisma.empty;
      where = Prisma.sql`TRUE${porVendedor}${porEstado}${filtroQ}`;
    } else {
      const usuario = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { grupoId: true },
      });
      const grupoIdUsuario = usuario?.grupoId ?? null;
      cte = Prisma.sql`WITH ${cteDisponibles(grupoIdUsuario)} `;

      if (estado === 'disponible') {
        where = Prisma.sql`c.id IN (SELECT id FROM visibles)${filtroQ}`;
      } else if (estado === 'reservado' || estado === 'vendido') {
        where = Prisma.sql`c.vendedor_id = ${user.id} AND c.estado::text = ${estado}${filtroQ}`;
      } else {
        where = Prisma.sql`(c.id IN (SELECT id FROM visibles)
          OR (c.vendedor_id = ${user.id} AND c.estado IN ('reservado', 'vendido')))${filtroQ}`;
      }
    }

    const [countRows, items] = await Promise.all([
      this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`${cte}SELECT COUNT(*) AS total FROM cartones c WHERE ${where}`,
      ),
      this.prisma.$queryRaw<CartonRow[]>(
        Prisma.sql`${cte}SELECT ${COLUMNAS} FROM cartones c WHERE ${where}
          ORDER BY c.numero ASC
          LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
      ),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return {
      cartones: items.map(toDto),
      total,
      page,
      total_paginas: Math.ceil(total / perPage),
    };
  }

  async detalle(id: number) {
    const carton = await this.prisma.carton.findUnique({ where: { id } });
    if (!carton) throw new NotFoundException('Cartón no encontrado');
    return toDto({
      id: carton.id,
      numero: carton.numero,
      estado: carton.estado,
      comprador: carton.comprador,
      telefono_comprador: carton.telefonoComprador,
      fecha_venta: carton.fechaVenta,
      precio: carton.precio,
      notas: carton.notas,
      pagina_origen: carton.paginaOrigen,
      ruta_imagen: carton.rutaImagen,
      vendedor_id: carton.vendedorId,
      grupo_id: carton.grupoId,
    });
  }

  async buscarNumero(numero: string) {
    const ocupado = await this.prisma.carton.findFirst({
      where: { numero, estado: { in: ['reservado', 'vendido'] } },
    });
    if (ocupado) {
      const vendedor = ocupado.vendedorId
        ? await this.prisma.user.findUnique({
            where: { id: ocupado.vendedorId },
            include: { grupo: true },
          })
        : null;
      return {
        encontrado: true,
        disponible: false,
        estado: ocupado.estado,
        vendedor: vendedor?.username ?? 'Desconocido',
        grupo: vendedor?.grupo?.nombre ?? '',
        comprador: ocupado.comprador ?? '',
      };
    }
    const existe = await this.prisma.carton.findFirst({ where: { numero } });
    return { encontrado: !!existe, disponible: !!existe };
  }

  /**
   * Venta atómica: bloquea TODAS las filas del número (FOR UPDATE) para que
   * dos vendedores simultáneos no puedan vender el mismo número (ni el mismo
   * cartón ni su gemelo de otro grupo). El perdedor recibe 409.
   */
  async vender(id: number, dto: VenderDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<{ id: number; estado: string }[]>`
        SELECT id, estado::text AS estado FROM cartones
        WHERE numero = (SELECT numero FROM cartones WHERE id = ${id})
        FOR UPDATE`;
      const target = filas.find((f) => f.id === id);
      if (!target) throw new NotFoundException('Cartón no encontrado');
      if (target.estado === 'vendido') {
        throw new ConflictException('Este cartón ya fue vendido');
      }
      // vender una reserva propia es válido; solo bloquea si OTRO cartón
      // del mismo número está ocupado
      const otroOcupado = filas.some(
        (f) => f.id !== id && f.estado !== 'disponible',
      );
      if (otroOcupado) {
        throw new ConflictException(
          'Ese número ya está reservado o vendido por otro vendedor',
        );
      }

      const precio = dto.precio !== undefined ? String(dto.precio) : null;
      const actualizado = await tx.$queryRaw<CartonRow[]>`
        UPDATE cartones SET
          estado = 'vendido',
          vendedor_id = ${user.id},
          fecha_venta = now(),
          comprador = CASE WHEN ${dto.comprador} <> '' THEN ${dto.comprador} ELSE comprador END,
          telefono_comprador = CASE WHEN ${dto.telefono ?? ''} <> '' THEN ${dto.telefono ?? ''} ELSE telefono_comprador END,
          precio = COALESCE(${precio}::numeric, precio),
          notas = CASE WHEN ${dto.notas ?? ''} <> '' THEN ${dto.notas ?? ''} ELSE notas END,
          fecha_actualizacion = now()
        WHERE id = ${id} AND estado IN ('disponible', 'reservado')
        RETURNING id, numero, estado::text AS estado, comprador, telefono_comprador,
          fecha_venta, precio, notas, pagina_origen, ruta_imagen, vendedor_id, grupo_id`;
      if (actualizado.length === 0) {
        throw new ConflictException('El cartón ya no está disponible');
      }
      return { mensaje: 'Cartón vendido', carton: toDto(actualizado[0]) };
    });
  }

  async reservar(id: number, dto: ReservarDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<{ id: number; estado: string }[]>`
        SELECT id, estado::text AS estado FROM cartones
        WHERE numero = (SELECT numero FROM cartones WHERE id = ${id})
        FOR UPDATE`;
      const target = filas.find((f) => f.id === id);
      if (!target) throw new NotFoundException('Cartón no encontrado');
      if (target.estado !== 'disponible') {
        throw new ConflictException('Este cartón ya no está disponible');
      }
      const otroOcupado = filas.some(
        (f) => f.id !== id && f.estado !== 'disponible',
      );
      if (otroOcupado) {
        throw new ConflictException(
          'Ese número ya está reservado o vendido por otro vendedor',
        );
      }

      const actualizado = await tx.$queryRaw<CartonRow[]>`
        UPDATE cartones SET
          estado = 'reservado',
          vendedor_id = ${user.id},
          comprador = CASE WHEN ${dto.comprador ?? ''} <> '' THEN ${dto.comprador ?? ''} ELSE comprador END,
          telefono_comprador = CASE WHEN ${dto.telefono ?? ''} <> '' THEN ${dto.telefono ?? ''} ELSE telefono_comprador END,
          fecha_actualizacion = now()
        WHERE id = ${id} AND estado = 'disponible'
        RETURNING id, numero, estado::text AS estado, comprador, telefono_comprador,
          fecha_venta, precio, notas, pagina_origen, ruta_imagen, vendedor_id, grupo_id`;
      if (actualizado.length === 0) {
        throw new ConflictException('El cartón ya no está disponible');
      }
      return { mensaje: 'Cartón reservado', carton: toDto(actualizado[0]) };
    });
  }

  /** Paridad con marcar_disponible(): limpia datos de venta, conserva vendedor_id y notas. */
  async liberar(id: number) {
    const actualizado = await this.prisma.$queryRaw<CartonRow[]>`
      UPDATE cartones SET
        estado = 'disponible',
        comprador = NULL,
        telefono_comprador = NULL,
        precio = NULL,
        fecha_venta = NULL,
        fecha_actualizacion = now()
      WHERE id = ${id} AND estado IN ('reservado', 'vendido')
      RETURNING id, numero, estado::text AS estado, comprador, telefono_comprador,
        fecha_venta, precio, notas, pagina_origen, ruta_imagen, vendedor_id, grupo_id`;
    if (actualizado.length === 0) {
      const existe = await this.prisma.carton.findUnique({ where: { id } });
      if (!existe) throw new NotFoundException('Cartón no encontrado');
      throw new ConflictException('El cartón ya está disponible');
    }
    return { mensaje: 'Cartón liberado', carton: toDto(actualizado[0]) };
  }

  async eliminar(id: number, user: AuthUser) {
    const carton = await this.prisma.carton.findUnique({ where: { id } });
    if (!carton) throw new NotFoundException('Cartón no encontrado');
    if (user.rol !== 'admin' && carton.vendedorId !== user.id) {
      throw new ForbiddenException('No puedes eliminar este cartón');
    }
    await this.prisma.carton.delete({ where: { id } });
    await unlink(carton.rutaImagen).catch(() => undefined);
    return { mensaje: 'Cartón eliminado' };
  }

  async rutaImagen(id: number): Promise<string> {
    const carton = await this.prisma.carton.findUnique({
      where: { id },
      select: { rutaImagen: true },
    });
    if (!carton) throw new NotFoundException('Cartón no encontrado');
    return carton.rutaImagen;
  }
}
