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
import { CombosService } from '../services/combos.service';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/enums/permission.enum';

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Public()
  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return await this.combosService.findAll(activeOnly === 'true');
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.combosService.findById(id);
  }

  @RequirePermissions(Permission.COMBOS_MANAGE)
  @Post()
  async create(@Body() createComboDto: CreateComboDto) {
    return await this.combosService.create(createComboDto);
  }

  @RequirePermissions(Permission.COMBOS_MANAGE)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateComboDto: UpdateComboDto,
  ) {
    return await this.combosService.update(id, updateComboDto);
  }

  @RequirePermissions(Permission.COMBOS_MANAGE)
  @Patch(':id/toggle')
  async toggleActive(@Param('id') id: string) {
    return await this.combosService.toggleActive(id);
  }

  @RequirePermissions(Permission.COMBOS_MANAGE)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.combosService.remove(id);
  }
}
