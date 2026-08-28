import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateHandheldCheckDto {
  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุอุปกรณ์' })
  equipmentId: number;

  @IsDateString({}, { message: 'กรุณาระบุวันที่ตรวจสอบ' })
  @IsNotEmpty()
  checkDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุสถานะ' })
  status: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsString()
  @IsOptional()
  inspector?: string;
}
