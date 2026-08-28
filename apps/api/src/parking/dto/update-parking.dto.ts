import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateParkingDto {
  @IsDateString()
  @IsOptional()
  recordDate?: string;

  @IsString()
  @IsOptional()
  slotNo?: string;

  @IsString()
  @IsOptional()
  carLicense?: string;

  @IsString()
  @IsOptional()
  driverName?: string;

  @IsString()
  @IsOptional()
  timeIn?: string;

  @IsString()
  @IsOptional()
  timeOut?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
