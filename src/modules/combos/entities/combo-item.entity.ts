import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ComboEntity } from './combo.entity';
import { ProductEntity } from '../../products/entities/product.entity';

@Entity('combo_items')
export class ComboItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'combo_id', type: 'uuid' })
  comboId: string;

  @ManyToOne(() => ComboEntity, (combo) => combo.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'combo_id' })
  combo: ComboEntity;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => ProductEntity, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  unitPrice: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
