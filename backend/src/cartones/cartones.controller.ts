import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import {
  listarCartonesSchema,
  reservarSchema,
  venderSchema,
  type ListarCartonesDto,
  type ReservarDto,
  type VenderDto,
} from '@bingo/common';
import { ZodPipe } from '../common/zod.pipe';
import {
  CurrentUser,
  Public,
  RequierePermiso,
  AuthUser,
} from '../auth/decorators';
import { CartonesService } from './cartones.service';

import { GetCartonUseCase } from '../core/application/use-cases/GetCartonUseCase';
import { ReservarCartonUseCase } from '../core/application/use-cases/ReservarCartonUseCase';
import { VenderCartonUseCase } from '../core/application/use-cases/VenderCartonUseCase';
import { LiberarCartonUseCase } from '../core/application/use-cases/LiberarCartonUseCase';
import { EliminarCartonUseCase } from '../core/application/use-cases/EliminarCartonUseCase';

@Controller()
export class CartonesController {
  constructor(
    private readonly cartones: CartonesService,
    private readonly getCartonUseCase: GetCartonUseCase,
    private readonly reservarCartonUseCase: ReservarCartonUseCase,
    private readonly venderCartonUseCase: VenderCartonUseCase,
    private readonly liberarCartonUseCase: LiberarCartonUseCase,
    private readonly eliminarCartonUseCase: EliminarCartonUseCase,
  ) {}

  @Get('cartones')
  listar(
    @CurrentUser() user: AuthUser,
    @Query(new ZodPipe(listarCartonesSchema)) filtros: ListarCartonesDto,
  ) {
    return this.cartones.listar(user, filtros);
  }

  @Get('buscar-numero')
  buscarNumero(@Query('q') q?: string) {
    const numero = q?.trim();
    if (!numero) throw new BadRequestException('Se requiere q');
    return this.cartones.buscarNumero(numero);
  }

  @Get('cartones/:id')
  async detalle(@Param('id', ParseIntPipe) id: number) {
    try {
      const carton = await this.getCartonUseCase.execute({ id });
      return carton;
    } catch (e: any) {
      if (e.message === 'Cartón no encontrado') {
        throw new NotFoundException('Cartón no encontrado');
      }
      throw new BadRequestException(e.message);
    }
  }

  /**
   * Imagen del cartón. Pública (sin JWT), igual que la ruta legacy de Flask
   * que consumía la app Android — permite <img src> directo en la PWA.
   */
  @Public()
  @Get('cartones/:id/imagen')
  async imagen(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const ruta = await this.cartones.rutaImagen(id);
    if (!existsSync(ruta)) throw new NotFoundException('Imagen no encontrada');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(ruta);
  }

  @Post('cartones/:id/vender')
  @RequierePermiso('vender')
  async vender(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(venderSchema)) dto: VenderDto,
    @CurrentUser() user: AuthUser,
  ) {
    try {
      if (!user.grupoId) throw new BadRequestException('Usuario no tiene grupo asignado');
      const carton = await this.venderCartonUseCase.execute({
        id,
        vendedorId: user.id,
        grupoId: user.grupoId,
        comprador: dto.comprador,
        precio: dto.precio,
        telefono: dto.telefono,
      });
      return carton;
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('cartones/:id/reservar')
  @RequierePermiso('reservar')
  async reservar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(reservarSchema)) dto: ReservarDto,
    @CurrentUser() user: AuthUser,
  ) {
    try {
      if (!user.grupoId) throw new BadRequestException('Usuario no tiene grupo asignado');
      const carton = await this.reservarCartonUseCase.execute({
        id,
        vendedorId: user.id,
        grupoId: user.grupoId,
      });
      return carton;
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('cartones/:id/liberar')
  @RequierePermiso('liberar')
  async liberar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    try {
      const carton = await this.liberarCartonUseCase.execute({ id, usuarioId: user.id });
      return carton;
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Delete('cartones/:id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.eliminarCartonUseCase.execute({ id });
      return { ok: true, message: 'Cartón eliminado con éxito' };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
