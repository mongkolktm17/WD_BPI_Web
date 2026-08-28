import { IsNotEmpty, IsString, IsInt, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้ใช้' })
  username: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  @IsNotEmpty({ message: 'กรุณาระบุรหัสผ่าน' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อ-นามสกุล' })
  fullName: string;

  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุบทบาท' })
  roleId: number;

  @IsString()
  @IsOptional()
  department?: string;
}
