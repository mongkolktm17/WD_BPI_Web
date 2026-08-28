import { IsString, IsNotEmpty, IsArray, ValidateNested, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class PermissionDto {
  @IsString()
  @IsNotEmpty()
  moduleName: string;

  @IsBoolean()
  @IsOptional()
  canRead?: boolean = false;

  @IsBoolean()
  @IsOptional()
  canWrite?: boolean = false;

  @IsBoolean()
  @IsOptional()
  canDelete?: boolean = false;
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  roleName?: string;

  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  @IsOptional()
  permissions?: PermissionDto[];
}
