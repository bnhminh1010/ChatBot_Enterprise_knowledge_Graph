import { S3Service } from '../aws/s3.service';
export declare class DocumentReaderService {
    private readonly s3Service;
    private readonly logger;
    private readonly tempDir;
    constructor(s3Service: S3Service);
    downloadFile(url: string): Promise<string>;
    parseFile(filePath: string): Promise<string>;
    readDocumentFromUrl(url: string): Promise<{
        content: string;
        fileType: string;
        fileName: string;
        size: number;
    }>;
    private parseDocx;
    private parsePdf;
    private parseText;
    private parseJson;
    private isValidUrl;
    private normalizeGithubUrl;
    private generateTempFilename;
    private extractFilename;
    cleanupOldTempFiles(maxAgeHours?: number): Promise<number>;
    readDocumentFromS3(s3Key: string, s3Bucket: string, fileName: string): Promise<{
        content: string;
        fileType: string;
        fileName: string;
        size: number;
    }>;
}
