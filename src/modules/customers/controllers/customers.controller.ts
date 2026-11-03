import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomersService } from '../services/customers.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { FilterCustomersDto } from '../dto/filter-customers.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query() filterDto: FilterCustomersDto) {
    return await this.customersService.findAll(filterDto);
  }

  @Get('code/:code')
  async findByCode(@Param('code', ParseIntPipe) code: number) {
    return await this.customersService.findByCode(code);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.customersService.findById(id);
  }

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return await this.customersService.create(createCustomerDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return await this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.customersService.delete(id);
  }
}
