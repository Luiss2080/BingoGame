import { LiberarCartonUseCase } from './LiberarCartonUseCase';
import { ICartonRepository } from '../repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../entities/Carton';

describe('LiberarCartonUseCase', () => {
  let useCase: LiberarCartonUseCase;
  let mockRepository: jest.Mocked<ICartonRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByNumeroAndGrupo: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ICartonRepository>;

    useCase = new LiberarCartonUseCase(mockRepository);
  });

  it('debería liberar un cartón existente', async () => {
    const carton = new Carton(1, '123', 1, 1, 'img.png', EstadoCarton.RESERVADO, 2);
    mockRepository.findById.mockResolvedValue(carton);
    mockRepository.update.mockImplementation(async (c) => c);

    const result = await useCase.execute({ id: 1 });

    expect(result.estado).toBe(EstadoCarton.DISPONIBLE);
    expect(result.vendedorId).toBeNull();
    expect(mockRepository.update).toHaveBeenCalledWith(result);
  });

  it('debería rechazar si el cartón no existe', async () => {
    mockRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute({ id: 1 })).rejects.toThrow('Cartón no encontrado');
  });
});
