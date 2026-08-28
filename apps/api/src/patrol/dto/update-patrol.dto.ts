import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdatePatrolDto {
  @IsDateString()
  @IsOptional()
  patrolDate?: string;

  @IsString()
  @IsOptional()
  patrolRoute?: string;

  @IsString()
  @IsOptional()
  officerName?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
