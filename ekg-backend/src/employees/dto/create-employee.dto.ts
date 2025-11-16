import { IsString, IsOptional } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() empId: string;
  @IsString() ten: string;
  @IsOptional() @IsString() chucDanh?: string;
  @IsString() phongBanCode: string;
}
