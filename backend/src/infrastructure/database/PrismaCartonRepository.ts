import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ICartonRepository } from '../../core/domain/repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../../core/domain/entities/Carton';
import { Carton as PrismaCarton, EstadoCarton as PrismaEstadoCarton } from '@prisma/client';

@Injectable()
export class PrismaCartonRepository implements ICartonRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(prismaCarton: PrismaCarton): Carton {
    return new Carton(
      prismaCarton.id,
      prismaCarton.numero,
      prismaCarton.pdfId,
      prismaCarton.paginaOrigen,
      prismaCarton.rutaImagen,
      prismaCarton.estado as EstadoCarton,
      prismaCarton.vendedorId,
      prismaCarton.grupoId,
      prismaCarton.comprador,
      prismaCarton.telefonoComprador,
      prismaCarton.fechaVenta,
      prismaCarton.precio ? Number(prismaCarton.precio) : null,
      prismaCarton.notas,
      prismaCarton.fechaCreacion,
      prismaCarton.fechaActualizacion,
    );
  }

  private mapToPrisma(domainCarton: Carton): Omit<PrismaCarton, 'fechaCreacion' | 'fechaActualizacion'> {
    return {
      id: domainCarton.id,
      numero: domainCarton.numero,
      pdfId: domainCarton.pdfId,
      paginaOrigen: domainCarton.paginaOrigen,
      rutaImagen: domainCarton.rutaImagen,
      estado: domainCarton.estado as PrismaEstadoCarton,
      vendedorId: domainCarton.vendedorId || null,
      grupoId: domainCarton.grupoId || null,
      comprador: domainCarton.comprador || null,
      telefonoComprador: domainCarton.telefonoComprador || null,
      fechaVenta: domainCarton.fechaVenta || null,
      precio: domainCarton.precio as any, // Prisma Decimal requires casting or string/number input
      notas: domainCarton.notas || null,
    };
  }

  async findById(id: number): Promise<Carton | null> {
    const carton = await this.prisma.carton.findUnique({
      where: { id },
    });
    return carton ? this.mapToDomain(carton) : null;
  }

  async findByNumeroAndGrupo(numero: string, grupoId: number): Promise<Carton | null> {
    const carton = await this.prisma.carton.findUnique({
      where: {
        uq_carton_numero_grupo: { numero, grupoId },
      },
    });
    return carton ? this.mapToDomain(carton) : null;
  }

  async findAll(filters?: { estado?: string; vendedorId?: number; grupoId?: number }): Promise<Carton[]> {
    const where: any = {};
    if (filters?.estado) where.estado = filters.estado as PrismaEstadoCarton;
    if (filters?.vendedorId) where.vendedorId = filters.vendedorId;
    if (filters?.grupoId) where.grupoId = filters.grupoId;

    const cartones = await this.prisma.carton.findMany({ where });
    return cartones.map((c) => this.mapToDomain(c));
  }

  async save(carton: Carton): Promise<Carton> {
    const data = this.mapToPrisma(carton);
    // Ignore ID when creating new
    const { id, ...createData } = data;
    
    const saved = await this.prisma.carton.create({
      data: createData,
    });
    return this.mapToDomain(saved);
  }

  async update(carton: Carton): Promise<Carton> {
    const data = this.mapToPrisma(carton);
    const updated = await this.prisma.carton.update({
      where: { id: carton.id },
      data,
    });
    return this.mapToDomain(updated);
  }
}
