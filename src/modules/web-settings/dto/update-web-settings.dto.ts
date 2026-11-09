import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BankDetail, DeliveryRate } from '../entities/web-setting.entity';

export class UpdateWebSettingsDto {
  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  storeBio?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  storeAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  mapsUrl?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  tiktokUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  footerCopyright?: string;

  @IsOptional()
  @IsString()
  announcementText?: string;

  @IsOptional()
  @IsBoolean()
  announcementActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @IsOptional()
  @IsArray()
  bankDetails?: BankDetail[];

  @IsOptional()
  @IsArray()
  deliveryRates?: DeliveryRate[];

  @IsOptional()
  @IsBoolean()
  showStockInWeb?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  blockOutOfStockOrders?: boolean;
}
