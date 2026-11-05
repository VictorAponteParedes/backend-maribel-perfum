import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('campaigns')
export class CampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 150, default: 'EDICIÓN ESPECIAL ✨' })
  tag: string;

  @Column({ type: 'varchar', length: 255, default: 'Regalos que enamoran · Fragancias Exclusivas' })
  title: string;

  @Column({
    type: 'text',
    default:
      'Envío gratis desde Gs. 250.000 + Caja de lujo Maribel con tarjeta dedicatoria de obsequio.',
  })
  subtitle: string;

  @Column({ name: 'button_text', type: 'varchar', length: 100, default: 'Ver Colección Especial ✨' })
  buttonText: string;

  @Column({ name: 'button_link', type: 'varchar', length: 255, default: '/combos' })
  buttonLink: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'display_order', type: 'int', default: 1 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
