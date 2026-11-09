import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ComboItemEntity } from './combo-item.entity';
import { FileEntity } from '../../files/entities/file.entity';

@Entity('combos')
export class ComboEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 150, default: '★ FAVORITO BOUTIQUE' })
  kicker: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  price: number;

  @Column({
    name: 'original_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  originalPrice: number;

  @Column({
    name: 'savings_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  savingsAmount: number;

  @Column({ name: 'image_id', type: 'uuid', nullable: true })
  imageId: string | null;

  @ManyToOne(() => FileEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'image_id' })
  image: FileEntity | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  images: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => ComboItemEntity, (item) => item.combo, {
    cascade: true,
    eager: true,
  })
  items: ComboItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
