import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

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
    name: 'trade_name',
    type: 'varchar',
    length: 150,
    default: 'Maribel Tienda de Regalos',
  })
  tradeName: string;

  @Column({
    name: 'store_bio',
    type: 'text',
    default:
      'Perfumería fina, fragancias exclusivas y detalles especiales con atención cálida en Pedro Juan Caballero y envíos a todo Paraguay.',
  })
  storeBio: string;

  @Column({
    name: 'legal_name',
    type: 'varchar',
    length: 150,
    default: 'Maribel Escriva',
  })
  legalName: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 50, default: '4815234-7' })
  taxId: string;

  @Column({
    name: 'whatsapp_number',
    type: 'varchar',
    length: 50,
    default: '0986 314 630',
  })
  whatsappNumber: string;

  @Column({
    name: 'business_phone',
    type: 'varchar',
    length: 50,
    default: '0986 314 630',
  })
  businessPhone: string;

  @Column({
    name: 'store_address',
    type: 'varchar',
    length: 255,
    default: 'Avda. Dr. Francia e/ Tte. Herrero',
  })
  storeAddress: string;

  @Column({ type: 'varchar', length: 100, default: 'Pedro Juan Caballero' })
  city: string;

  @Column({ type: 'varchar', length: 100, default: 'Paraguay' })
  country: string;

  @Column({
    name: 'maps_url',
    type: 'text',
    default: 'https://maps.google.com/?q=Pedro+Juan+Caballero',
  })
  mapsUrl: string;

  @Column({
    name: 'opening_hours',
    type: 'varchar',
    length: 150,
    default: 'Lunes a Sábados: 07:30 a 19:30 hs',
  })
  openingHours: string;

  @Column({
    name: 'instagram_url',
    type: 'varchar',
    length: 255,
    default: 'https://instagram.com/maribel_tiendaderegalos',
  })
  instagramUrl: string;

  @Column({
    name: 'facebook_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  facebookUrl: string | null;

  @Column({
    name: 'tiktok_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  tiktokUrl: string | null;

  @Column({ name: 'logo_url', type: 'text', default: '/logo-maribel.png' })
  logoUrl: string;

  @Column({
    name: 'footer_copyright',
    type: 'varchar',
    length: 255,
    default: '© 2026 Maribel Tienda de Regalos. Todos los derechos reservados.',
  })
  footerCopyright: string;

  // Ajustes de tienda web y marketing
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

  @Column({ name: 'bank_details', type: 'jsonb', nullable: true })
  bankDetails: BankDetail[] | null;

  @Column({ name: 'delivery_rates', type: 'jsonb', nullable: true })
  deliveryRates: DeliveryRate[] | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
