export interface UploadResult {
    key: string;
    bucket: string;
    location: string;
    etag?: string;
}
export declare class S3Service {
    private readonly logger;
    private readonly s3Client;
    private readonly bucket;
    constructor();
    uploadFile(fileBuffer: Buffer, key: string, contentType?: string): Promise<UploadResult>;
    private uploadSimple;
    private uploadMultipart;
    getSignedUrl(key: string, expiresIn?: number): Promise<string>;
    getObject(key: string): Promise<Buffer>;
    deleteFile(key: string): Promise<void>;
    private delay;
}
