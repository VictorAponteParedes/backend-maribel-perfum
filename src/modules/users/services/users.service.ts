import {
  BadRequestException,
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
import { UpdateUserDto } from '../dto/update-user.dto';
import { FilterUsersDto } from '../dto/filter-users.dto';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../common/enums/permission.enum';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  async findAll(filterDto?: FilterUsersDto): Promise<UserEntity[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.avatar', 'avatar')
      .orderBy('user.createdAt', 'DESC');

    if (filterDto?.search) {
      const search = `%${filterDto.search.toLowerCase().trim()}%`;
      query.andWhere(
        '(LOWER(user.fullName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search },
      );
    }

    if (filterDto?.role) {
      query.andWhere('user.role = :role', { role: filterDto.role });
    }

    if (filterDto?.isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', {
        isActive: filterDto.isActive,
      });
    }

    return await query.getMany();
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

    const assignedRole = createUserDto.role ?? UserRole.STAFF;
    const assignedPermissions =
      createUserDto.permissions && createUserDto.permissions.length > 0
        ? createUserDto.permissions
        : DEFAULT_ROLE_PERMISSIONS[assignedRole];

    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: createUserDto.fullName.trim(),
      role: assignedRole,
      permissions: assignedPermissions,
      avatarId: createUserDto.avatarId ?? null,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    if (updateUserDto.fullName !== undefined) {
      user.fullName = updateUserDto.fullName.trim();
    }

    if (updateUserDto.avatarId !== undefined) {
      user.avatarId = updateUserDto.avatarId;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.role !== undefined && updateUserDto.role !== user.role) {
      user.role = updateUserDto.role;
      // Si no se pasaron permisos personalizados explícitos, sincronizar con los del nuevo rol
      if (!updateUserDto.permissions) {
        user.permissions = DEFAULT_ROLE_PERMISSIONS[user.role];
      }
    }

    if (updateUserDto.permissions !== undefined) {
      user.permissions = updateUserDto.permissions;
    }

    return await this.userRepository.save(user);
  }

  async toggleStatus(id: string, currentUserId: string): Promise<UserEntity> {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta.');
    }

    const user = await this.findById(id);
    user.isActive = !user.isActive;

    // Si se desactiva, invalidar su refresh token
    if (!user.isActive) {
      user.refreshToken = null;
    }

    return await this.userRepository.save(user);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.refreshToken = null;

    await this.userRepository.save(user);
  }

  async remove(id: string, currentUserId: string): Promise<{ success: boolean; message: string }> {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta.');
    }

    await this.findById(id);
    await this.userRepository.softDelete(id);

    return {
      success: true,
      message: 'Usuario eliminado exitosamente.',
    };
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
