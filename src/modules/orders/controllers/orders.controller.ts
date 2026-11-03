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

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('metrics')
  async getMetrics() {
    return await this.ordersService.getMetrics();
  }

  @Get()
  async findAll(@Query() filterDto: FilterOrdersDto) {
    return await this.ordersService.findAll(filterDto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.ordersService.findById(id);
  }

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return await this.ordersService.create(createOrderDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return await this.ordersService.updateStatus(id, updateStatusDto.status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.ordersService.delete(id);
  }
}
