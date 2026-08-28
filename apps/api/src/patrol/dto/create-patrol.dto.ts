import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreatePatrolDto {
  @IsDateString({}, { message: 'กรุณาระบุวันที่ลาดตระเวน' })
  @IsNotEmpty()
  patrolDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเส้นทางลาดตระเวน' })
  patrolRoute: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อเจ้าหน้าที่' })
  officerName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุสถานะ' })
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
