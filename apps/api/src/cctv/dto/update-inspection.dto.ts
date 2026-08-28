import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class UpdateInspectionDto {
  @IsDateString()
  @IsOptional()
  inspectionDate?: string;

  @IsString()
  @IsOptional()
  inspectorName?: string;

  @IsInt()
  @IsOptional()
  totalChecked?: number;

  @IsInt()
  @IsOptional()
  totalPassed?: number;

  @IsInt()
  @IsOptional()
  totalFailed?: number;

  @IsString()
  @IsOptional()
  summary?: string;
}
