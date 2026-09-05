import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ALLOWED_BUILDINGS, ALLOWED_SHIFTS } from './create-building-report.dto';

export class UpdateBuildingReportDto {
  @IsString()
  @IsOptional()
  reportDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  employeeId?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  @IsIn(ALLOWED_SHIFTS)
  shift?: string;

  @IsString()
  @IsOptional()
  @IsIn(ALLOWED_BUILDINGS)
  building?: string;

  @IsString()
  @IsOptional()
  guardPost?: string;

  @IsString()
  @IsOptional()
  reportTime?: string;

  @IsString()
  @IsOptional()
  incidentReport?: string;

  @IsString()
  @IsOptional()
  specialIncident?: string;

  @IsString()
  @IsOptional()
  emergencyIncident?: string;
}
