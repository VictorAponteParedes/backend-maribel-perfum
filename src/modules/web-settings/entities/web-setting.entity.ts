import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface BankDetail {
  bank: string;
  accountType: string;
  accountNumber: string;
  holder: string;
  ruc: string;
}

export interface DeliveryRate {
  city: string;
  cost: number;
}

@Entity('web_settings')
export class WebSettingEntity {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({
    name: 'announcement_text',
    type: 'text',
    default:
      'Envíos a todo el país · Caja de lujo de obsequio con tarjeta dedicatoria en compras desde Gs. 250.000',
  })
  announcementText: string;

  @Column({ name: 'announcement_active', type: 'boolean', default: true })
  announcementActive: boolean;

  @Column({
    name: 'free_shipping_threshold',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 250000,
  })
  freeShippingThreshold: number;

  @Column({
    name: 'whatsapp_number',
    type: 'varchar',
    length: 50,
    default: '0981445892',
  })
  whatsappNumber: string;

  @Column({
    name: 'store_address',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: 'Asunción, Paraguay',
  })
  storeAddress: string | null;

  @Column({ name: 'bank_details', type: 'jsonb', nullable: true })
  bankDetails: BankDetail[] | null;

  @Column({ name: 'delivery_rates', type: 'jsonb', nullable: true })
  deliveryRates: DeliveryRate[] | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
