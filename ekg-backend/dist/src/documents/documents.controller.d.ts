import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
export declare class DocumentsController {
    private readonly docsService;
    private readonly logger;
    constructor(docsService: DocumentsService);
    getProjectDocuments(projectId: string): Promise<unknown>;
    getAccessibleDocuments(projectId: string): Promise<unknown[]>;
    searchDocuments(projectId: string, searchTerm: string): Promise<unknown[]>;
    getDocument(projectId: string, docId: string): Promise<unknown>;
    getDocumentContent(projectId: string, docId: string): Promise<unknown>;
    checkDocumentPath(projectId: string, docId: string): Promise<{
        documentId: string;
        hasPath: boolean;
    }>;
    uploadDocument(file: Express.Multer.File, dto: CreateDocumentDto, req: any): Promise<import("./dto/create-document.dto").UploadResponseDto>;
    getDownloadUrl(projectId: string, docId: string): Promise<{
        url: string;
        expiresIn: number;
    }>;
    deleteDocument(projectId: string, docId: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
