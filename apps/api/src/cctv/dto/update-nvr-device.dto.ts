import { IsString, IsInt, IsOptional } from 'class-validator';

export class UpdateNvrDeviceDto {
  @IsInt()
  @IsOptional()
  buildingId?: number;

  @IsString()
  @IsOptional()
  nvrName?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsInt()
  @IsOptional()
  totalChannels?: number;
}
