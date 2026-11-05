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

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return await this.combosService.findAll(activeOnly === 'true');
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.combosService.findById(id);
  }

  @Post()
  async create(@Body() createComboDto: CreateComboDto) {
    return await this.combosService.create(createComboDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateComboDto: UpdateComboDto,
  ) {
    return await this.combosService.update(id, updateComboDto);
  }

  @Patch(':id/toggle')
  async toggleActive(@Param('id') id: string) {
    return await this.combosService.toggleActive(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.combosService.remove(id);
  }
}
