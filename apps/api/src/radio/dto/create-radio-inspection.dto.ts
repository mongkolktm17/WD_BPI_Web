import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString, IsBoolean, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class RadioInspectionItemDto {
  @IsInt()
  @IsNotEmpty({ message: 'กรุณาระบุเครื่องวิทยุ' })
  equipmentId: number;

  @IsBoolean()
  isPresent: boolean;

  @IsBoolean()
  isWorking: boolean;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}

export class CreateRadioInspectionDto {
  @IsDateString({}, { message: 'กรุณาระบุวันที่ตรวจสอบ' })
  @IsNotEmpty()
  inspectionDate: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุกะการทำงาน' })
  shift: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้ตรวจ' })
  inspectorName: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'กรุณาระบุรายการวิทยุอย่างน้อย 1 เครื่อง' })
  @ValidateNested({ each: true })
  @Type(() => RadioInspectionItemDto)
  items: RadioInspectionItemDto[];
}
