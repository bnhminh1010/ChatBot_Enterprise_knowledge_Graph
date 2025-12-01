import { Neo4jService } from '../core/neo4j/neo4j.service';
import { DocumentReaderService } from './document-reader.service';
import { S3Service } from '../aws/s3.service';
import { CreateDocumentDto, UploadResponseDto } from './dto/create-document.dto';
interface DocumentResult {
    id: string;
    name: string;
    duong_dan: string | null;
    s3_key?: string | null;
    s3_bucket?: string | null;
    loai: string;
    mo_ta: string;
    ngay_tao: string;
    co_duong_dan: boolean;
    file_size?: number;
}
interface DocumentContent {
    documentId: string;
    documentName: string;
    documentType: string;
    description: string;
    sourceUrl: string;
    fileInfo: {
        type: string;
        fileName: string;
        size: number;
    };
    content: string;
    retrievedAt: string;
}
export declare class DocumentsService {
    private neo;
    private documentReader;
    private s3Service;
    private readonly logger;
    constructor(neo: Neo4jService, documentReader: DocumentReaderService, s3Service: S3Service);
    getProjectDocuments(projectId: string): Promise<unknown>;
    getDocumentById(projectId: string, docId: string): Promise<DocumentResult>;
    getDocumentContent(projectId: string, docId: string): Promise<DocumentContent>;
    searchProjectDocuments(projectId: string, searchTerm: string, options?: {
        onlyWithPath?: boolean;
    }): Promise<unknown[]>;
    getAccessibleDocuments(projectId: string): Promise<unknown[]>;
    hasValidPath(projectId: string, docId: string): Promise<boolean>;
    searchDocumentsByName(documentName: string, projectId?: string): Promise<DocumentResult[]>;
    uploadDocument(file: Express.Multer.File, dto: CreateDocumentDto, userId: string, departmentId: string): Promise<UploadResponseDto>;
    getDownloadUrl(projectId: string, docId: string): Promise<{
        url: string;
        expiresIn: number;
    }>;
    deleteDocument(projectId: string, docId: string, userId: string): Promise<void>;
}
export {};
