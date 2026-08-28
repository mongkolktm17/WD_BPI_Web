import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateCctvReportDto {
  @IsDateString({}, { message: 'กรุณาระบุวันที่รายงาน' })
  @IsNotEmpty()
  reportDate: string;

  @IsInt()
  @IsOptional()
  totalNormal?: number = 0;

  @IsInt()
  @IsOptional()
  totalAbnormal?: number = 0;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้รายงาน' })
  reporterName: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
