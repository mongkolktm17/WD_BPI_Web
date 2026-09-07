import { IsString, IsInt, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsInt()
  @IsOptional()
  roleId?: number;

  @IsString()
  @IsOptional()
  department?: string;

  @IsOptional()
  isActive?: boolean;

  @IsString()
  @MaxLength(8, { message: 'รหัสพนักงานต้องไม่เกิน 8 ตัวอักษร' })
  @IsOptional()
  employeeId?: string;
}
