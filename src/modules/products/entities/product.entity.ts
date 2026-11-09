import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BrandEntity } from './brand.entity';
import { CategoryEntity } from './category.entity';
import { InventoryStockEntity } from './inventory-stock.entity';
import { StockEntryEntity } from './stock-entry.entity';
import { FileEntity } from '../../files/entities/file.entity';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  barcode: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, default: '100 ml' })
  size: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => CategoryEntity, (category) => category.products, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity | null;

  @Column({ name: 'is_web_visible', type: 'boolean', default: false })
  isWebVisible: boolean;

  @Column({ name: 'web_badge', type: 'varchar', length: 100, nullable: true })
  webBadge: string | null;

  @Column({
    name: 'web_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  webPrice: number | null;

  @Column({
    name: 'cost_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  costPrice: number | null;

  @Column({
    name: 'selling_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  sellingPrice: number | null;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => BrandEntity, (brand) => brand.products, {
    eager: true,
  })
  @JoinColumn({ name: 'brand_id' })
  brand: BrandEntity;

  @Column({ name: 'image_id', type: 'uuid', nullable: true })
  imageId: string | null;

  @ManyToOne(() => FileEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'image_id' })
  image: FileEntity | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  images: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'reception_date', type: 'date', nullable: true })
  receptionDate: Date | null;

  @OneToOne(() => InventoryStockEntity, (stock) => stock.product, {
    cascade: true,
    eager: true,
  })
  stock: InventoryStockEntity;

  @OneToMany(() => StockEntryEntity, (entry) => entry.product)
  stockEntries: StockEntryEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
