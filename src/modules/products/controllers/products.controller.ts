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
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { FilterProductsDto } from '../dto/filter-products.dto';
import { CreateStockEntryDto } from '../dto/create-stock-entry.dto';
import { BulkImportProductsDto } from '../dto/bulk-import-products.dto';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() filterDto: FilterProductsDto) {
    return await this.productsService.findAll(filterDto);
  }

  @Get('brands')
  async findAllBrands() {
    return await this.productsService.findAllBrands();
  }

  @Post('brands')
  async createBrand(@Body() createBrandDto: CreateBrandDto) {
    return await this.productsService.createBrand(createBrandDto);
  }

  @Get('categories')
  async findAllCategories() {
    return await this.productsService.findAllCategories();
  }

  @Post('categories')
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return await this.productsService.createCategory(createCategoryDto);
  }

  @Get('stock-entries')
  async findAllStockEntries() {
    return await this.productsService.findAllStockEntries();
  }

  @Get('barcode/:barcode')
  async findByBarcode(@Param('barcode') barcode: string) {
    return await this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.productsService.findById(id);
  }

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    return await this.productsService.create(createProductDto);
  }

  @Post('bulk-import')
  async bulkImport(@Body() bulkDto: BulkImportProductsDto) {
    return await this.productsService.bulkImport(bulkDto);
  }

  @Post(':id/stock-entry')
  async addStockEntry(
    @Param('id') id: string,
    @Body() stockEntryDto: CreateStockEntryDto,
  ) {
    return await this.productsService.addStockEntry(id, stockEntryDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.productsService.delete(id);
  }
}
