import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class UpdateGuardCountDto {
  @IsDateString()
  @IsOptional()
  recordDate?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsInt()
  @IsOptional()
  totalGuards?: number;

  @IsInt()
  @IsOptional()
  presentGuards?: number;

  @IsInt()
  @IsOptional()
  absentGuards?: number;

  @IsString()
  @IsOptional()
  remark?: string;
}
