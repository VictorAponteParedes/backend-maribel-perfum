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
  announcementText?: string;

  @IsOptional()
  @IsBoolean()
  announcementActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  storeAddress?: string;

  @IsOptional()
  @IsArray()
  bankDetails?: BankDetail[];

  @IsOptional()
  @IsArray()
  deliveryRates?: DeliveryRate[];
}
