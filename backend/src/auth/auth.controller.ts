import { Body, Controller, Get, Post } from '@nestjs/common';
import { loginSchema, type LoginDto } from '@bingo/common';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService } from './auth.service';
import { CurrentUser, Public, AuthUser } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body(new ZodPipe(loginSchema)) body: LoginDto) {
    return this.auth.login(body);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
