import { IsString, IsOptional, IsDateString, IsInt, IsObject } from 'class-validator';

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

  @IsString()
  @IsOptional()
  inspectorCode?: string;

  @IsString()
  @IsOptional()
  inspectorName?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  spareTireStatus?: string;

  @IsString()
  @IsOptional()
  licensePlates?: string;

  @IsInt()
  @IsOptional()
  totalCars?: number;

  @IsInt()
  @IsOptional()
  motorcycleCount1?: number;

  @IsInt()
  @IsOptional()
  motorcycleCount2?: number;

  @IsInt()
  @IsOptional()
  motorcycleCount3?: number;

  @IsObject()
  @IsOptional()
  lotCounts?: Record<string, any>;
}
