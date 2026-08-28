import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateNvrRecordingDto {
  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุ NVR' })
  nvrId: number;

  @IsDateString({}, { message: 'กรุณาระบุวันที่บันทึก' })
  @IsNotEmpty()
  recordDate: string;

  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนวันที่บันทึก' })
  daysRecorded: number;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุสถานะ' })
  status: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
