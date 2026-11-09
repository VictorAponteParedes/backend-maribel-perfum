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
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/enums/permission.enum';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @RequirePermissions(Permission.CUSTOMERS_VIEW)
  @Get()
  async findAll(@Query() filterDto: FilterCustomersDto) {
    return await this.customersService.findAll(filterDto);
  }

  @RequirePermissions(Permission.CUSTOMERS_VIEW)
  @Get('code/:code')
  async findByCode(@Param('code', ParseIntPipe) code: number) {
    return await this.customersService.findByCode(code);
  }

  @RequirePermissions(Permission.CUSTOMERS_VIEW)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.customersService.findById(id);
  }

  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return await this.customersService.create(createCustomerDto);
  }

  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return await this.customersService.update(id, updateCustomerDto);
  }

  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.customersService.delete(id);
  }
}
