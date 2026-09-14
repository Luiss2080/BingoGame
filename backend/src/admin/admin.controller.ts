import { Controller, Post } from '@nestjs/common';
import { AdminOnly } from '../auth/decorators';
import { ResetCartonesUseCase } from '../core/application/use-cases/ResetCartonesUseCase';
import { RegenerarImagenesUseCase } from '../core/application/use-cases/RegenerarImagenesUseCase';

@Controller('admin')
@AdminOnly()
export class AdminController {
  constructor(
    private readonly resetCartonesUseCase: ResetCartonesUseCase,
    private readonly regenerarImagenesUseCase: RegenerarImagenesUseCase,
  ) {}

  /** Borra todos los cartones y PDFs (registros + archivos). Conserva usuarios, grupos y banners. */
  @Post('reset-cartones')
  async resetCartones() {
    return this.resetCartonesUseCase.execute();
  }

  /** Encola la regeneración de todas las imágenes (la hace el worker). */
  @Post('regenerar-imagenes')
  async regenerarImagenes() {
    return this.regenerarImagenesUseCase.execute();
  }

  /** Paridad con Flask: endpoint histórico sin operación activa. */
  @Post('migrar-numeros')
  migrarNumeros() {
    return { ok: true, mensaje: 'Sin cambios pendientes.' };
  }
}
