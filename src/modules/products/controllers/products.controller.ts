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
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/enums/permission.enum';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  async findAll(@Query() filterDto: FilterProductsDto) {
    return await this.productsService.findAll(filterDto);
  }

  @Public()
  @Get('brands')
  async findAllBrands() {
    return await this.productsService.findAllBrands();
  }

  @RequirePermissions(Permission.CATEGORIES_MANAGE)
  @Post('brands')
  async createBrand(@Body() createBrandDto: CreateBrandDto) {
    return await this.productsService.createBrand(createBrandDto);
  }

  @Public()
  @Get('categories')
  async findAllCategories() {
    return await this.productsService.findAllCategories();
  }

  @RequirePermissions(Permission.CATEGORIES_MANAGE)
  @Post('categories')
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return await this.productsService.createCategory(createCategoryDto);
  }

  @Public()
  @Get('categories/:id')
  async findCategoryById(@Param('id') id: string) {
    return await this.productsService.findCategoryById(id);
  }

  @RequirePermissions(Permission.CATEGORIES_MANAGE)
  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return await this.productsService.updateCategory(id, updateCategoryDto);
  }

  @RequirePermissions(Permission.CATEGORIES_MANAGE)
  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return await this.productsService.deleteCategory(id);
  }

  @RequirePermissions(Permission.PRODUCTS_VIEW)
  @Get('stock-entries')
  async findAllStockEntries() {
    return await this.productsService.findAllStockEntries();
  }

  @RequirePermissions(Permission.PRODUCTS_VIEW)
  @Get('barcode/:barcode')
  async findByBarcode(@Param('barcode') barcode: string) {
    return await this.productsService.findByBarcode(barcode);
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.productsService.findById(id);
  }

  @RequirePermissions(Permission.PRODUCTS_CREATE)
  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    return await this.productsService.create(createProductDto);
  }

  @RequirePermissions(Permission.PRODUCTS_CREATE)
  @Post('bulk-import')
  async bulkImport(@Body() bulkDto: BulkImportProductsDto) {
    return await this.productsService.bulkImport(bulkDto);
  }

  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  @Post(':id/stock-entry')
  async addStockEntry(
    @Param('id') id: string,
    @Body() stockEntryDto: CreateStockEntryDto,
  ) {
    return await this.productsService.addStockEntry(id, stockEntryDto);
  }

  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await this.productsService.update(id, updateProductDto);
  }

  @RequirePermissions(Permission.PRODUCTS_DELETE)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.productsService.delete(id);
  }
}
