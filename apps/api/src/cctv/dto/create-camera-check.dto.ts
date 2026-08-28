import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateCameraCheckDto {
  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุกล้อง' })
  cameraId: number;

  @IsDateString({}, { message: 'กรุณาระบุวันที่ตรวจสอบ' })
  @IsNotEmpty()
  checkDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุสถานะ' })
  status: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsString()
  @IsOptional()
  checkedBy?: string;
}
