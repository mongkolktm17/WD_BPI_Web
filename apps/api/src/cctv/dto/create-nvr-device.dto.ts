import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

export class CreateNvrDeviceDto {
  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุอาคาร' })
  buildingId: number;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อ NVR' })
  nvrName: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsInt()
  @IsOptional()
  totalChannels?: number = 16;
}
