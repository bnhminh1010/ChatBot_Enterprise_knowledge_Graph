import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum TargetType {
  DuAn = 'DuAn',
  PhongBan = 'PhongBan',
  CongTy = 'CongTy',
  NhanSu = 'NhanSu',
}

export class CreateDocumentDto {
  @IsString()
  ten: string; // Tên tài liệu

  @IsOptional()
  @IsEnum(TargetType)
  targetType?: TargetType; // Loại node đích: DuAn | PhongBan | CongTy | NhanSu

  @IsOptional()
  @IsString()
  targetId?: string; // ID của node đích

  @IsOptional()
  @IsString()
  projectId?: string; // Backward compatible - tương đương targetType=DuAn

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
  targetType?: string;
  targetId?: string;
}
