import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRole } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<UserEntity | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .leftJoinAndSelect('user.avatar', 'avatar');

    if (includePassword) {
      query.addSelect('user.password').addSelect('user.refreshToken');
    }

    return await query.getOne();
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { avatar: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const existing = await this.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException(
        `Ya existe un usuario con el correo "${createUserDto.email}".`,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: createUserDto.fullName.trim(),
      role: createUserDto.role ?? UserRole.STAFF,
      permissions: createUserDto.permissions ?? ['*'],
      avatarId: createUserDto.avatarId ?? null,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    let hashedToken: string | null = null;
    if (refreshToken) {
      const salt = await bcrypt.genSalt(10);
      hashedToken = await bcrypt.hash(refreshToken, salt);
    }

    await this.userRepository.update(userId, {
      refreshToken: hashedToken,
    });
  }

  private async seedAdminUser() {
    try {
      const adminCount = await this.userRepository.count();
      if (adminCount === 0) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123456', salt);

        const admin = this.userRepository.create({
          email: 'admin@maribelregalos.com',
          password: hashedPassword,
          fullName: 'Maribel Admin',
          role: UserRole.ADMIN,
          permissions: ['*'],
          isActive: true,
        });

        await this.userRepository.save(admin);
        console.log('👤 Usuario Administrador por defecto inicializado: admin@maribelregalos.com');
      }
    } catch {
      // Ignorar si la tabla aún no fue creada
    }
  }
}
