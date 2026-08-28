import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateMetalDetectorDto {
  @IsString()
  @IsOptional()
  deviceCode?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  lastCheck?: string;
}
