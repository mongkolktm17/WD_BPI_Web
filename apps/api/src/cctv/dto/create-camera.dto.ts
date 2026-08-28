import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

export class CreateCameraDto {
  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุอาคาร' })
  buildingId: number;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุหมายเลขกล้อง' })
  cameraNo: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อกล้อง' })
  cameraName: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  status?: string = 'normal';
}
