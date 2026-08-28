import { IsNotEmpty, IsString, IsOptional, IsDateString, IsObject, IsInt } from 'class-validator';

export class CreateParkingDto {
  @IsDateString({}, { message: 'กรุณาระบุวันที่บันทึก' })
  @IsNotEmpty()
  recordDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุหมายเลขช่องจอด' })
  slotNo: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุหมายเลขทะเบียนรถ' })
  carLicense: string;

  @IsString()
  @IsOptional()
  driverName?: string;

  @IsString()
  @IsOptional()
  timeIn?: string;

  @IsString()
  @IsOptional()
  status?: string = 'parked';

  @IsObject()
  @IsOptional()
  lotCounts?: Record<string, { vehicleType: string; vehicleCount: string }>;

  @IsInt()
  @IsOptional()
  totalCars?: number;

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
  parkingLot?: string;

  @IsString()
  @IsOptional()
  spareTireStatus?: string;

  @IsString()
  @IsOptional()
  licensePlates?: string;

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
}
