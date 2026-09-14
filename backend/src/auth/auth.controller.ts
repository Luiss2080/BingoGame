import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { loginSchema, type LoginDto } from '@bingo/common';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentUser, Public, AuthUser } from './decorators';
import { LoginUseCase } from '../core/application/use-cases/LoginUseCase';
import { GetPerfilUseCase } from '../core/application/use-cases/GetPerfilUseCase';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getPerfilUseCase: GetPerfilUseCase,
  ) {}

  @Public()
  @Post('login')
  async login(@Body(new ZodPipe(loginSchema)) body: LoginDto) {
    try {
      return await this.loginUseCase.execute(body);
    } catch (e: any) {
      throw new UnauthorizedException(e.message);
    }
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    try {
      return await this.getPerfilUseCase.execute(user.id);
    } catch (e: any) {
      throw new UnauthorizedException(e.message);
    }
  }
}
