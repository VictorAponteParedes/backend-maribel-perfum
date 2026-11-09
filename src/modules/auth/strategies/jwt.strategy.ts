import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/services/users.service';
import { UserRole } from '../../users/entities/user.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../common/enums/permission.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'super_secret_jwt_key_perfum_2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token inválido o usuario inactivo.');
    }

    const rawPermissions = user.permissions || [];
    const hasWildcard = rawPermissions.includes('*');

    const effectivePermissions =
      user.role === UserRole.ADMIN
        ? ['*']
        : hasWildcard || rawPermissions.length === 0
        ? DEFAULT_ROLE_PERMISSIONS[user.role] || []
        : rawPermissions.filter((p) => p !== '*');

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: effectivePermissions,
      avatarUrl: user.avatar?.url ?? null,
    };
  }
}
