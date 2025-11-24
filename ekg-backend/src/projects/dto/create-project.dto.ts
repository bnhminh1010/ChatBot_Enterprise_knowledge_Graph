import { IsString, IsOptional } from 'class-validator';
export class CreateProjectDto {
  @IsString() key: string;
  @IsString() ten: string;
  @IsOptional() @IsString() trangThai?: string;
}
