import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class UpdateNvrRecordingDto {
  @IsInt()
  @IsOptional()
  nvrId?: number;

  @IsDateString()
  @IsOptional()
  recordDate?: string;

  @IsInt()
  @IsOptional()
  daysRecorded?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
