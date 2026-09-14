import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IUserRepository } from '../../core/domain/repositories/IUserRepository';
import { User, Rol } from '../../core/domain/entities/User';
import { User as PrismaUser } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(prismaUser: PrismaUser): User {
    return new User(
      prismaUser.id,
      prismaUser.username,
      prismaUser.passwordHash,
      prismaUser.rol as Rol,
      prismaUser.activo,
      prismaUser.grupoId,
      prismaUser.fechaCreacion,
    );
  }

  private mapToPrisma(domainUser: User): Omit<PrismaUser, 'fechaCreacion'> {
    return {
      id: domainUser.id,
      username: domainUser.username,
      passwordHash: domainUser.passwordHash,
      rol: domainUser.rol,
      activo: domainUser.activo,
      grupoId: domainUser.grupoId,
    };
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.mapToDomain(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    return user ? this.mapToDomain(user) : null;
  }

  async findAll(soloActivos: boolean = false): Promise<User[]> {
    const where = soloActivos ? { activo: true } : undefined;
    const users = await this.prisma.user.findMany({ where, orderBy: { id: 'asc' } });
    return users.map((u: PrismaUser) => this.mapToDomain(u));
  }

  async save(user: User): Promise<User> {
    const { id, ...data } = this.mapToPrisma(user);
    const saved = await this.prisma.user.create({ data });
    return this.mapToDomain(saved);
  }

  async update(user: User): Promise<User> {
    const data = this.mapToPrisma(user);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
    });
    return this.mapToDomain(updated);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
