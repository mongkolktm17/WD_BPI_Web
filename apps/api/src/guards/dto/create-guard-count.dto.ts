import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateGuardCountDto {
  @IsDateString({}, { message: 'กรุณาระบุวันที่บันทึก' })
  @IsNotEmpty()
  recordDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุช่วงเวลา' })
  shift: string;

  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนยามทั้งหมด' })
  totalGuards: number;

  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนยามที่มาปฏิบัติหน้าที่' })
  presentGuards: number;

  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนยามที่ไม่มา' })
  absentGuards: number;

  @IsString()
  @IsOptional()
  remark?: string;
}
