import { VenderCartonUseCase } from './VenderCartonUseCase';
import { ICartonRepository } from '../../domain/repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../../domain/entities/Carton';

describe('VenderCartonUseCase', () => {
  let useCase: VenderCartonUseCase;
  let mockRepository: jest.Mocked<ICartonRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByNumeroAndGrupo: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ICartonRepository>;
    useCase = new VenderCartonUseCase(mockRepository);
  });

  it('debería vender un cartón disponible', async () => {
    const carton = new Carton(1, '001', 1, 1, 'img.png', EstadoCarton.DISPONIBLE, null, 10);
    mockRepository.findById.mockResolvedValue(carton);
    mockRepository.update.mockImplementation(async (c) => c);

    const result = await useCase.execute({
      id: 1,
      vendedorId: 2,
      grupoId: 10,
      comprador: 'Juan',
      precio: 100
    });

    expect(result.estado).toBe(EstadoCarton.VENDIDO);
    expect(result.vendedorId).toBe(2);
    expect(result.comprador).toBe('Juan');
    expect(result.precio).toBe(100);
    expect(mockRepository.update).toHaveBeenCalledWith(result);
  });

  it('debería fallar si el precio es negativo', async () => {
    const carton = new Carton(1, '001', 1, 1, 'img.png', EstadoCarton.DISPONIBLE, null, 10);
    mockRepository.findById.mockResolvedValue(carton);

    await expect(useCase.execute({
      id: 1,
      vendedorId: 2,
      grupoId: 10,
      comprador: 'Juan',
      precio: -10
    })).rejects.toThrow('El precio no puede ser negativo');
  });

  it('debería rechazar si está reservado por otro vendedor', async () => {
    const carton = new Carton(1, '001', 1, 1, 'img.png', EstadoCarton.RESERVADO, 99, 10);
    mockRepository.findById.mockResolvedValue(carton);

    await expect(useCase.execute({
      id: 1,
      vendedorId: 2,
      grupoId: 10,
      comprador: 'Juan',
      precio: 100
    })).rejects.toThrow('El cartón está reservado por otro vendedor');
  });
});
