import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateBuildingReportDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุวันที่รายงาน' })
  reportDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสพนักงาน' })
  employeeId: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อ-นามสกุล' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุกะ' })
  shift: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุอาคาร' })
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
