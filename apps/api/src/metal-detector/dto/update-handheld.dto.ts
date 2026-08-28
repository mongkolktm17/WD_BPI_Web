import { IsString, IsOptional } from 'class-validator';

export class UpdateHandheldDto {
  @IsString()
  @IsOptional()
  deviceCode?: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  location?: string;
}
