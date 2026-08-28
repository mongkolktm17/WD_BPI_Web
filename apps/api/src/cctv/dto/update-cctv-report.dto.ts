import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class UpdateCctvReportDto {
  @IsDateString()
  @IsOptional()
  reportDate?: string;

  @IsInt()
  @IsOptional()
  totalNormal?: number;

  @IsInt()
  @IsOptional()
  totalAbnormal?: number;

  @IsString()
  @IsOptional()
  reporterName?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
