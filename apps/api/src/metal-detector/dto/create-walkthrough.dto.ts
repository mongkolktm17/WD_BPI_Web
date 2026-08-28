import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateWalkthroughDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสเครื่องตรวจ' })
  detectorCode: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุตำแหน่ง' })
  location: string;

  @IsString()
  @IsOptional()
  status?: string = 'normal';
}
