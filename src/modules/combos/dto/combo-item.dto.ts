import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class ComboItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
