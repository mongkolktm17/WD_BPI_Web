import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateInspectionDto {
  @IsDateString({}, { message: 'กรุณาระบุวันที่ตรวจสอบ' })
  @IsNotEmpty()
  inspectionDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้ตรวจสอบ' })
  inspectorName: string;

  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนที่ตรวจสอบ' })
  totalChecked: number;

  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนที่ผ่าน' })
  totalPassed: number;

  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนที่ไม่ผ่าน' })
  totalFailed: number;

  @IsString()
  @IsOptional()
  summary?: string;
}
