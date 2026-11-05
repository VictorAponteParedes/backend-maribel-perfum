import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComboEntity } from './entities/combo.entity';
import { ComboItemEntity } from './entities/combo-item.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { FileEntity } from '../files/entities/file.entity';
import { CombosService } from './services/combos.service';
import { CombosController } from './controllers/combos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComboEntity,
      ComboItemEntity,
      ProductEntity,
      FileEntity,
    ]),
  ],
  controllers: [CombosController],
  providers: [CombosService],
  exports: [CombosService, TypeOrmModule],
})
export class CombosModule {}
