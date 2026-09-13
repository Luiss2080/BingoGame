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

@Controller()
export class CartonesController {
  constructor(private readonly cartones: CartonesService) {}

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
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.cartones.detalle(id);
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
  vender(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(venderSchema)) dto: VenderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartones.vender(id, dto, user);
  }

  @Post('cartones/:id/reservar')
  @RequierePermiso('reservar')
  reservar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(reservarSchema)) dto: ReservarDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartones.reservar(id, dto, user);
  }

  @Post('cartones/:id/liberar')
  @RequierePermiso('liberar')
  liberar(@Param('id', ParseIntPipe) id: number) {
    return this.cartones.liberar(id);
  }

  @Delete('cartones/:id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartones.eliminar(id, user);
  }
}
