import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุประเภทรายงาน' })
  reportType: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อรายงาน' })
  title: string;

  @IsNotEmpty({ message: 'กรุณาระบุข้อมูลรายงาน' })
  dataJson: any;
}
