import { IsString, IsOptional } from 'class-validator';

export class UpdateWalkthroughDto {
  @IsString()
  @IsOptional()
  detectorCode?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
