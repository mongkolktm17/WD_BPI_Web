import { IsString, IsOptional } from 'class-validator';

export class UpdateReportDto {
  @IsString()
  @IsOptional()
  reportType?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  dataJson?: any;
}
