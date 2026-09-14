import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { LoginDto } from '@bingo/common';
import { esHashWerkzeug, verificarHashWerkzeug } from '../../../auth/werkzeug-hash';
import { PermisosService } from '../../../permisos/permisos.service';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly permisosService: PermisosService,
  ) {}

  async execute(dto: LoginDto) {
    const user = await this.userRepository.findByUsername(dto.username);
    if (!user || !user.activo) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    let valido = false;
    if (esHashWerkzeug(user.passwordHash)) {
      valido = verificarHashWerkzeug(user.passwordHash, dto.password);
      if (valido) {
        // Actualizamos a Argon2 en texto plano
        user.passwordHash = await argon2.hash(dto.password);
        await this.userRepository.update(user);
      }
    } else {
      valido = await argon2.verify(user.passwordHash, dto.password).catch(() => false);
    }

    if (!valido) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const token = await this.jwtService.signAsync({
      sub: String(user.id),
      rol: user.rol,
      username: user.username,
    });

    const permisos = await this.permisosService.getForRol(user.rol);

    return {
      token,
      user: { id: user.id, username: user.username, rol: user.rol },
      permisos,
    };
  }
}
