import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './entities/product.entity';
import { BrandEntity } from './entities/brand.entity';
import { CategoryEntity } from './entities/category.entity';
import { InventoryStockEntity } from './entities/inventory-stock.entity';
import { StockEntryEntity } from './entities/stock-entry.entity';
import { FileEntity } from '../files/entities/file.entity';
import { ProductsService } from './services/products.service';
import { ProductsController } from './controllers/products.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      BrandEntity,
      CategoryEntity,
      InventoryStockEntity,
      StockEntryEntity,
      FileEntity,
    ]),
    FilesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
