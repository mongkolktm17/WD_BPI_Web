import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class ChangePasswordDto {
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่านปัจจุบัน' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่านใหม่' })
  newPassword: string;
}
