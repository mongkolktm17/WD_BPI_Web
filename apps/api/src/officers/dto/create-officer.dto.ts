import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOfficerDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสพนักงาน' })
  employeeId: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อ' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุนามสกุล' })
  lastName: string;

  @IsString()
  @IsOptional()
  titleName?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  siteLocation?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
