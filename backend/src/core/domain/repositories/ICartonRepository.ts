import { Carton } from '../entities/Carton';

export interface ICartonRepository {
  findById(id: number): Promise<Carton | null>;
  findByNumeroAndGrupo(numero: string, grupoId: number): Promise<Carton | null>;
  findAll(filters?: { estado?: string; vendedorId?: number; grupoId?: number }): Promise<Carton[]>;
  save(carton: Carton): Promise<Carton>;
  update(carton: Carton): Promise<Carton>;
  delete(id: number): Promise<void>;
}

export const ICartonRepositoryToken = Symbol('ICartonRepository');
