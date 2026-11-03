import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { FilterSalesDto } from '../dto/filter-sales.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('metrics')
  async getMetrics() {
    return await this.salesService.getMetrics();
  }

  @Get()
  async findAll(@Query() filterDto: FilterSalesDto) {
    return await this.salesService.findAll(filterDto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.salesService.findById(id);
  }

  @Post()
  async create(@Body() createSaleDto: CreateSaleDto) {
    return await this.salesService.create(createSaleDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.salesService.delete(id);
  }
}
