import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสอาคาร' })
  buildingCode: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่ออาคาร' })
  buildingName: string;

  @IsString()
  @IsOptional()
  description?: string;
}
