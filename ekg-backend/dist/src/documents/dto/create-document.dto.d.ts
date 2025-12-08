export declare enum TargetType {
    DuAn = "DuAn",
    PhongBan = "PhongBan",
    CongTy = "CongTy",
    NhanSu = "NhanSu"
}
export declare class CreateDocumentDto {
    ten: string;
    targetType?: TargetType;
    targetId?: string;
    projectId?: string;
    mo_ta?: string;
    tag?: string[];
    version?: string;
}
export declare class UploadResponseDto {
    id: string;
    ten: string;
    s3_key: string;
    s3_bucket: string;
    file_size: number;
    loai_file: string;
    created_at: string;
    download_url: string;
    targetType?: string;
    targetId?: string;
}
