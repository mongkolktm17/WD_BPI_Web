import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMetalDetectorDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสอุปกรณ์' })
  deviceCode: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุตำแหน่ง' })
  location: string;

  @IsString()
  @IsOptional()
  status?: string = 'normal';

  @IsDateString()
  @IsOptional()
  lastCheck?: string;
}
