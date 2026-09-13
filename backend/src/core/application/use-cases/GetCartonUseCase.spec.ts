import { GetCartonUseCase } from './GetCartonUseCase';
import { ICartonRepository } from '../../domain/repositories/ICartonRepository';
import { Carton, EstadoCarton } from '../../domain/entities/Carton';

describe('GetCartonUseCase', () => {
  let useCase: GetCartonUseCase;
  let mockRepository: jest.Mocked<ICartonRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByNumeroAndGrupo: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ICartonRepository>;

    useCase = new GetCartonUseCase(mockRepository);
  });

  it('debería retornar el cartón si se encuentra por ID', async () => {
    const mockCarton = new Carton(1, '001', 1, 1, 'ruta.png', EstadoCarton.DISPONIBLE);
    mockRepository.findById.mockResolvedValue(mockCarton);

    const result = await useCase.execute({ id: 1 });

    expect(result).toEqual(mockCarton);
    expect(mockRepository.findById).toHaveBeenCalledWith(1);
  });

  it('debería retornar el cartón si se encuentra por numero y grupo', async () => {
    const mockCarton = new Carton(1, '002', 1, 1, 'ruta.png', EstadoCarton.DISPONIBLE, null, 10);
    mockRepository.findByNumeroAndGrupo.mockResolvedValue(mockCarton);

    const result = await useCase.execute({ numero: '002', grupoId: 10 });

    expect(result).toEqual(mockCarton);
    expect(mockRepository.findByNumeroAndGrupo).toHaveBeenCalledWith('002', 10);
  });

  it('debería lanzar un error si no se proporciona id ni la dupla (numero, grupoId)', async () => {
    await expect(useCase.execute({})).rejects.toThrow('Debe proporcionar el id o el (numero y grupoId) del cartón');
  });

  it('debería lanzar un error si no se encuentra el cartón', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 999 })).rejects.toThrow('Cartón no encontrado');
  });
});
