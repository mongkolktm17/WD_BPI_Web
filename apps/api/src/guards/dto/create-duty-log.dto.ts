import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CreateDutyLogDto {
  @IsDateString({}, { message: 'กรุณาระบุวันที่' })
  @IsNotEmpty()
  logDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุช่วงเวลา' })
  shift: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อยาม' })
  guardName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุตำแหน่งปฏิบัติหน้าที่' })
  dutyPost: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุบันทึกเหตุการณ์' })
  eventLog: string;
}
