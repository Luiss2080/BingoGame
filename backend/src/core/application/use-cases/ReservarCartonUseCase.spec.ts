import { ReservarCartonUseCase } from './ReservarCartonUseCase';
import { ICartonRepository } from '../../domain/repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../../domain/entities/Carton';

describe('ReservarCartonUseCase', () => {
  let useCase: ReservarCartonUseCase;
  let mockRepository: jest.Mocked<ICartonRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByNumeroAndGrupo: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ICartonRepository>;
    useCase = new ReservarCartonUseCase(mockRepository);
  });

  it('debería reservar un cartón disponible exitosamente', async () => {
    const carton = new Carton(1, '001', 1, 1, 'img.png', EstadoCarton.DISPONIBLE, null, 10);
    mockRepository.findById.mockResolvedValue(carton);
    mockRepository.update.mockImplementation(async (c) => c);

    const result = await useCase.execute({ id: 1, vendedorId: 2, grupoId: 10 });

    expect(result.estado).toBe(EstadoCarton.RESERVADO);
    expect(result.vendedorId).toBe(2);
    expect(mockRepository.update).toHaveBeenCalledWith(result);
  });

  it('debería rechazar reserva si el cartón no existe', async () => {
    mockRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute({ id: 1, vendedorId: 2, grupoId: 10 })).rejects.toThrow('Cartón no encontrado');
  });

  it('debería rechazar reserva si el cartón ya está reservado o vendido', async () => {
    const carton = new Carton(1, '001', 1, 1, 'img.png', EstadoCarton.VENDIDO, 99, 10);
    mockRepository.findById.mockResolvedValue(carton);

    await expect(useCase.execute({ id: 1, vendedorId: 2, grupoId: 10 })).rejects.toThrow('El cartón no está disponible');
  });
});
