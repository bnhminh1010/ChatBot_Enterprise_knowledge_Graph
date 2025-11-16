import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddSkillToEmployeeDto {
  @ApiProperty({ example: 'E001', description: 'Mã nhân sự' })
  @IsString()
  empId: string;

  @ApiProperty({ example: 'Node.js', description: 'Tên kỹ năng' })
  @IsString()
  ten: string;

  @ApiProperty({ example: 3, description: 'Mức độ thành thạo (1-5)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level?: number;
}