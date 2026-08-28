import { IsNotEmpty, IsString, IsOptional, IsDateString, IsObject, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ParkingVehicleDto {
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  lot?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  spareTireStatus?: string;
}

export class CreateParkingBatchDto {
  @IsDateString({}, { message: 'กรุณาระบุวันที่บันทึก' })
  @IsNotEmpty()
  recordDate: string;

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

  @IsObject()
  @IsOptional()
  carLotCounts?: Record<string, number>;

  @IsObject()
  @IsOptional()
  motorcycleLotCounts?: Record<string, number>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParkingVehicleDto)
  @IsOptional()
  vehicles?: ParkingVehicleDto[];

  // Legacy compat: allow old fields
  @IsString()
  @IsOptional()
  licensePlates?: string;

  @IsString()
  @IsOptional()
  parkingLot?: string;

  @IsString()
  @IsOptional()
  motorcycleParkingLot?: string;

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
  lotCounts?: Record<string, { vehicleType: string; vehicleCount: string }>;
}
