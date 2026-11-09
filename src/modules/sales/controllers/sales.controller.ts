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
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/enums/permission.enum';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @RequirePermissions(Permission.SALES_VIEW)
  @Get('metrics')
  async getMetrics() {
    return await this.salesService.getMetrics();
  }

  @RequirePermissions(Permission.SALES_VIEW)
  @Get()
  async findAll(@Query() filterDto: FilterSalesDto) {
    return await this.salesService.findAll(filterDto);
  }

  @RequirePermissions(Permission.SALES_VIEW)
  @Get(':id')
  async findById(@Param('id') id: string) {
    const sale = await this.salesService.findById(id);
    return this.salesService.mapToFrontendSale(sale);
  }

  @RequirePermissions(Permission.SALES_CREATE)
  @Post()
  async create(@Body() createSaleDto: CreateSaleDto) {
    return await this.salesService.create(createSaleDto);
  }

  @RequirePermissions(Permission.SALES_CANCEL)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.salesService.delete(id);
  }
}
