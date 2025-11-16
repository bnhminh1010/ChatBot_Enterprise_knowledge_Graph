import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Kỹ thuật', description: 'Tên phòng ban mới' })
  @IsOptional()
  @IsString()
  ten?: string;
}