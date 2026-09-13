import { EliminarCartonUseCase } from './EliminarCartonUseCase';
import { ICartonRepository } from '../repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../entities/Carton';

describe('EliminarCartonUseCase', () => {
  let useCase: EliminarCartonUseCase;
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

    useCase = new EliminarCartonUseCase(mockRepository);
  });

  it('debería eliminar un cartón disponible', async () => {
    const carton = new Carton(1, '123', 1, 1, 'img.png', EstadoCarton.DISPONIBLE);
    mockRepository.findById.mockResolvedValue(carton);
    mockRepository.delete.mockResolvedValue(undefined);

    await expect(useCase.execute({ id: 1 })).resolves.not.toThrow();
    expect(mockRepository.delete).toHaveBeenCalledWith(1);
  });

  it('debería rechazar si el cartón está vendido', async () => {
    const carton = new Carton(1, '123', 1, 1, 'img.png', EstadoCarton.VENDIDO, 2);
    mockRepository.findById.mockResolvedValue(carton);

    await expect(useCase.execute({ id: 1 })).rejects.toThrow('No se puede eliminar un cartón que ya ha sido vendido');
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });
});
