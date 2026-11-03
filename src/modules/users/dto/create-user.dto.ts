import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.STAFF;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[] = ['*'];

  @IsOptional()
  @IsUUID()
  avatarId?: string;
}
