import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  projectId: string;

  @IsString()
  ten: string; // Tên tài liệu

  @IsOptional()
  @IsString()
  mo_ta?: string; // Mô tả

  @IsOptional()
  @IsArray()
  tag?: string[];

  @IsOptional()
  @IsString()
  version?: string;
}

export class UploadResponseDto {
  id: string;
  ten: string;
  s3_key: string;
  s3_bucket: string;
  file_size: number;
  loai_file: string;
  created_at: string;
  download_url: string; // Pre-signed URL
}
