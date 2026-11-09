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
import { OrdersService } from '../services/orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { FilterOrdersDto } from '../dto/filter-orders.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/enums/permission.enum';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @RequirePermissions(Permission.ORDERS_VIEW)
  @Get('metrics')
  async getMetrics() {
    return await this.ordersService.getMetrics();
  }

  @RequirePermissions(Permission.ORDERS_VIEW)
  @Get()
  async findAll(@Query() filterDto: FilterOrdersDto) {
    return await this.ordersService.findAll(filterDto);
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.ordersService.findById(id);
  }

  @Public()
  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return await this.ordersService.create(createOrderDto);
  }

  @RequirePermissions(Permission.ORDERS_UPDATE)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return await this.ordersService.updateStatus(id, updateStatusDto.status);
  }

  @RequirePermissions(Permission.ORDERS_DELETE)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.ordersService.delete(id);
  }
}
