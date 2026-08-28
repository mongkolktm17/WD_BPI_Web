import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateHandheldDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสอุปกรณ์' })
  deviceCode: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่ออุปกรณ์' })
  deviceName: string;

  @IsString()
  @IsOptional()
  status?: string = 'normal';

  @IsString()
  @IsOptional()
  location?: string;
}
