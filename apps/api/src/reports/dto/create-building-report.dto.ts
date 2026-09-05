import { IsNotEmpty, IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export const ALLOWED_BUILDINGS = ['2', '3', '4', '6', '9'];
export const ALLOWED_SHIFTS = ['เช้า', 'ดึก'];

export class CreateBuildingReportDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุวันที่รายงาน' })
  reportDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสพนักงาน' })
  @MaxLength(8, { message: 'รหัสพนักงานต้องไม่เกิน 8 ตัวอักษร' })
  employeeId: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อ-นามสกุล' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุกะ' })
  @IsIn(ALLOWED_SHIFTS, { message: 'กะต้องเป็น เช้า หรือ ดึก เท่านั้น' })
  shift: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุอาคาร' })
  @IsIn(ALLOWED_BUILDINGS, { message: 'อาคารต้องเป็น 2, 3, 4, 6 หรือ 9 เท่านั้น' })
  building: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุจุดรักษาการณ์' })
  guardPost: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเวลารายงาน' })
  reportTime: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบึรายงานเหตุการณ์' })
  incidentReport: string;

  @IsString()
  @IsOptional()
  specialIncident?: string;

  @IsString()
  @IsOptional()
  emergencyIncident?: string;
}
