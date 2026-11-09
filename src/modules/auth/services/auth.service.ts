import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtPayload } from '../strategies/jwt.strategy';
import { UserEntity, UserRole } from '../../users/entities/user.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../common/enums/permission.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private mapUserResponse(user: UserEntity) {
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

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email, true);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta se encuentra desactivada.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.mapUserResponse(user),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.mapUserResponse(user),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(token: string) {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'super_secret_refresh_key_perfum_2026';

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: refreshSecret,
      });

      const user = await this.usersService.findByEmail(payload.email, true);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Token de actualización inválido.');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        token,
        user.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Token de actualización inválido.');
      }

      const tokens = await this.generateTokens(user);
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        user: this.mapUserResponse(user),
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Token de actualización inválido o expirado.');
    }
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    return this.mapUserResponse(user);
  }

  private async generateTokens(user: UserEntity) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'super_secret_jwt_key_perfum_2026';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super_secret_refresh_key_perfum_2026';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: (this.configService.get<string>('JWT_EXPIRATION') as any) || '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') as any) || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
