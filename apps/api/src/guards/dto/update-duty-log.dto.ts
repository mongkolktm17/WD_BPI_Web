import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateDutyLogDto {
  @IsDateString()
  @IsOptional()
  logDate?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  guardName?: string;

  @IsString()
  @IsOptional()
  dutyPost?: string;

  @IsString()
  @IsOptional()
  eventLog?: string;
}
