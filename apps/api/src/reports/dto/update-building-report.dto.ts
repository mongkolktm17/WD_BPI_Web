import { IsString, IsOptional } from 'class-validator';

export class UpdateBuildingReportDto {
  @IsString()
  @IsOptional()
  reportDate?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
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
