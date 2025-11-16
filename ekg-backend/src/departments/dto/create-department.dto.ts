import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'ENG', description: 'Mã phòng ban' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Engineering', description: 'Tên phòng ban' })
  @IsString()
  ten: string;
}