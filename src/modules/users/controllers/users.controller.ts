import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FilterUsersDto } from '../dto/filter-users.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../../common/enums/permission.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions(Permission.USERS_VIEW)
  @Get()
  async findAll(@Query() filterDto: FilterUsersDto) {
    return await this.usersService.findAll(filterDto);
  }

  @RequirePermissions(Permission.USERS_VIEW)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.usersService.findById(id);
  }

  @RequirePermissions(Permission.USERS_MANAGE)
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @RequirePermissions(Permission.USERS_MANAGE)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, updateUserDto);
  }

  @RequirePermissions(Permission.USERS_MANAGE)
  @Patch(':id/toggle-status')
  async toggleStatus(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.usersService.toggleStatus(id, currentUserId);
  }

  @RequirePermissions(Permission.USERS_MANAGE)
  @Patch(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    await this.usersService.resetPassword(id, dto.newPassword);
    return {
      success: true,
      message: 'Contraseña actualizada correctamente.',
    };
  }

  @RequirePermissions(Permission.USERS_MANAGE)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.usersService.remove(id, currentUserId);
  }
}
