import { IsString, IsInt, IsOptional } from 'class-validator';

export class UpdateCameraDto {
  @IsInt()
  @IsOptional()
  buildingId?: number;

  @IsString()
  @IsOptional()
  cameraNo?: string;

  @IsString()
  @IsOptional()
  cameraName?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
