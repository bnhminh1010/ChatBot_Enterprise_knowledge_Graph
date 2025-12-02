import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { DocumentReaderService } from './document-reader.service';
import { S3Service } from '../aws/s3.service';
import {
  CreateDocumentDto,
  UploadResponseDto,
} from './dto/create-document.dto';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

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

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private neo: Neo4jService,
    private documentReader: DocumentReaderService,
    private s3Service: S3Service,
  ) {}

  /**
   * Get all documents for a project
   * Returns only documents that have duong_dan attribute
   */
  async getProjectDocuments(projectId: string): Promise<unknown> {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn {id: $projectId})
         OPTIONAL MATCH (p)-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)
         WITH p, collect({
           id: doc.id,
           name: doc.ten,
           duong_dan: doc.duong_dan,
           loai: COALESCE(doc.loai, 'unknown'),
           mo_ta: COALESCE(doc.mo_ta, ''),
           ngay_tao: COALESCE(toString(doc.ngay_tao), ''),
           co_duong_dan: doc.duong_dan IS NOT NULL
         }) AS docs
         RETURN {
           projectId: p.id,
           projectName: p.ten,
           documents: docs
         } AS result`,
        { projectId },
      );

      if (!rows[0]) {
        throw new NotFoundException('Project not found');
      }

      const firstRow = rows[0] as Record<string, unknown>;
      return firstRow?.result || null;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error getting project documents: ${error}`);
      throw new ServiceUnavailableException('Failed to retrieve documents');
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(
    projectId: string,
    docId: string,
  ): Promise<DocumentResult> {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu {id: $docId})
         RETURN {
           id: doc.id,
           name: doc.ten,
           duong_dan: doc.duong_dan,
           loai: COALESCE(doc.loai, 'unknown'),
           mo_ta: COALESCE(doc.mo_ta, ''),
           ngay_tao: COALESCE(toString(doc.ngay_tao), ''),
           co_duong_dan: doc.duong_dan IS NOT NULL
         } AS doc`,
        { projectId, docId },
      );

      if (!rows[0]) {
        throw new NotFoundException('Document not found in this project');
      }

      const firstRow = rows[0] as Record<string, unknown>;
      return firstRow?.doc as DocumentResult;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error getting document: ${error}`);
      throw new ServiceUnavailableException('Failed to retrieve document');
    }
  }

  /**
   * Get document content with PRIORITY LOGIC
   * Priority: if s3_key exists → S3, else → GitHub URL (backward compatible)
   */
  async getDocumentContent(
    projectId: string,
    docId: string,
  ): Promise<DocumentContent> {
    try {
      // Step 1: Get document from Neo4j
      const doc = await this.getDocumentById(projectId, docId);

      let result: {
        content: string;
        fileType: string;
        fileName: string;
        size: number;
      };
      let sourceUrl: string;

      // PRIORITY LOGIC
      if (doc.s3_key) {
        // Priority 1: Read from S3
        this.logger.log(`Reading document from S3: ${doc.s3_key}`);

        result = await this.documentReader.readDocumentFromS3(
          doc.s3_key,
          doc.s3_bucket || process.env.AWS_S3_BUCKET || 'ekg-documents',
          doc.name,
        );
        sourceUrl = `s3://${doc.s3_bucket}/${doc.s3_key}`;

        // Cleanup happens inside readDocumentFromS3
      } else if (doc.duong_dan) {
        // Priority 2: Fallback to GitHub URL (backward compatible)
        this.logger.log(`Reading document from URL: ${doc.duong_dan}`);

        result = await this.documentReader.readDocumentFromUrl(doc.duong_dan);
        sourceUrl = doc.duong_dan;

        // Cleanup happens inside readDocumentFromUrl
      } else {
        throw new NotFoundException(
          'Document has no storage location (no s3_key or duong_dan)',
        );
      }

      // Return content with metadata
      return {
        documentId: doc?.id || '',
        documentName: doc?.name || '',
        documentType: doc?.loai || '',
        description: doc?.mo_ta || '',
        sourceUrl,
        fileInfo: {
          type: result.fileType,
          fileName: result.fileName,
          size: result.size,
        },
        content: result.content,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error reading document content: ${error}`);
      throw new ServiceUnavailableException(
        `Failed to read document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Search documents in a project by name or type
   */
  async searchProjectDocuments(
    projectId: string,
    searchTerm: string,
    options: { onlyWithPath?: boolean } = {},
  ): Promise<unknown[]> {
    try {
      const pathFilter = options.onlyWithPath
        ? 'AND doc.duong_dan IS NOT NULL'
        : '';

      const rows = await this.neo.run(
        `MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)
         WHERE toLower(doc.ten) CONTAINS toLower($searchTerm)
         OR toLower(doc.loai) CONTAINS toLower($searchTerm)
         ${pathFilter}
         RETURN {
           id: doc.id,
           name: doc.ten,
           type: COALESCE(doc.loai, 'unknown'),
           description: COALESCE(doc.mo_ta, ''),
           haspath: doc.duong_dan IS NOT NULL,
           url: COALESCE(doc.duong_dan, null)
         } AS doc
         ORDER BY doc.name`,
        { projectId, searchTerm },
      );

      return rows.map((r: unknown) => {
        const row = r as Record<string, unknown>;
        return row?.doc || {};
      });
    } catch (error) {
      this.logger.error(`Error searching documents: ${error}`);
      throw new ServiceUnavailableException('Failed to search documents');
    }
  }

  /**
   * Get documents with accessible paths (duong_dan)
   * These are the documents that can be fetched and parsed
   */
  async getAccessibleDocuments(projectId: string): Promise<unknown[]> {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)
         WHERE doc.duong_dan IS NOT NULL
         RETURN {
           id: doc.id,
           name: doc.ten,
           type: COALESCE(doc.loai, 'unknown'),
           description: COALESCE(doc.mo_ta, ''),
           url: doc.duong_dan,
           createdAt: COALESCE(toString(doc.ngay_tao), '')
         } AS doc
         ORDER BY doc.name`,
        { projectId },
      );

      return rows.map((r: unknown) => {
        const row = r as Record<string, unknown>;
        return row?.doc || {};
      });
    } catch (error) {
      this.logger.error(`Error getting accessible documents: ${error}`);
      throw new ServiceUnavailableException(
        'Failed to retrieve accessible documents',
      );
    }
  }

  /**
   * Check if document has valid path
   */
  async hasValidPath(projectId: string, docId: string): Promise<boolean> {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu {id: $docId})
         RETURN doc.duong_dan IS NOT NULL AS hasPath`,
        { projectId, docId },
      );

      const firstRow = rows[0] as Record<string, unknown>;
      return (firstRow?.hasPath as boolean) || false;
    } catch (error) {
      this.logger.error(`Error checking document path: ${error}`);
      return false;
    }
  }

  /**
   * Search documents by name (fuzzy search)
   * Returns list of matching documents across all projects or specific project
   */
  async searchDocumentsByName(
    documentName: string,
    projectId?: string,
  ): Promise<DocumentResult[]> {
    try {
      const projectFilter = projectId
        ? 'MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)'
        : 'MATCH (doc:TaiLieu)';

      const rows = await this.neo.run(
        `${projectFilter}
         WHERE toLower(doc.ten) CONTAINS toLower($documentName)
         OPTIONAL MATCH (p2:DuAn)-[:DINH_KEM_TAI_LIEU]->(doc)
         RETURN {
           id: doc.id,
           name: doc.ten,
           duong_dan: doc.duong_dan,
           loai: COALESCE(doc.loai, 'unknown'),
           mo_ta: COALESCE(doc.mo_ta, ''),
           ngay_tao: COALESCE(toString(doc.ngay_tao), ''),
           co_duong_dan: doc.duong_dan IS NOT NULL,
           projectId: COALESCE(p2.id, 'unknown')
         } AS doc
         ORDER BY doc.name
         LIMIT 10`,
        { documentName, projectId },
      );

      return rows.map((r) => {
        const row = r as Record<string, unknown>;
        return row?.doc as DocumentResult;
      });
    } catch (error) {
      this.logger.error(`Error searching documents: ${error}`);
      return [];
    }
  }

  /**
   * Upload document to S3 and create TaiLieu node in Neo4j
   * S3 key structure: documents/{filename} (NO UUID)
   */
  async uploadDocument(
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    userId: string,
    departmentId: string,
  ): Promise<UploadResponseDto> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = file.originalname;

      // Generate S3 key: documents/{filename}
      // NO UUID because S3 Versioning handles duplicates
      const s3Key = `documents/${fileName}`;

      this.logger.log(
        `Uploading document: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${s3Key}`,
      );

      // Upload to S3 (auto multi-part if >= 50MB)
      const uploadResult = await this.s3Service.uploadFile(
        file.buffer,
        s3Key,
        file.mimetype,
      );

      // Create TaiLieu node in Neo4j
      const docId = uuidv4();
      const now = new Date().toISOString();

      await this.neo.run(
        `
        CREATE (doc:TaiLieu {
          id: $docId,
          ten: $ten,
          s3_key: $s3Key,
          s3_bucket: $s3Bucket,
          file_size: $fileSize,
          loai_file: $loaiFile,
          mo_ta: $moTa,
          tag: $tag,
          version: $version,
          department_id: $departmentId,
          created_at: datetime($createdAt)
        })
        RETURN doc
        `,
        {
          docId,
          ten: dto.ten,
          s3Key: uploadResult.key,
          s3Bucket: uploadResult.bucket,
          fileSize: file.size,
          loaiFile: fileExtension.replace('.', ''),
          moTa: dto.mo_ta || '',
          tag: dto.tag || [],
          version: dto.version || '1.0',
          departmentId,
          createdAt: now,
        },
      );

      // Determine target type and ID
      let finalTargetType = dto.targetType;
      let finalTargetId = dto.targetId;

      // Backward compatible: projectId → DuAn
      if (!finalTargetType && dto.projectId) {
        finalTargetType = 'DuAn' as any;
        finalTargetId = dto.projectId;
      }

      // Create relationship to target node (if specified)
      if (finalTargetType && finalTargetId) {
        await this.createDocumentRelationship(
          finalTargetType as string,
          finalTargetId,
          docId,
        );
      }

      // ALWAYS create UPLOAD relationship with user
      await this.neo.run(
        `
        MATCH (user:NhanSu {id: $userId})
        MATCH (doc:TaiLieu {id: $docId})
        CREATE (user)-[:UPLOAD {uploaded_at: datetime()}]->(doc)
        `,
        { userId, docId },
      );

      // Generate signed URL
      const downloadUrl = await this.s3Service.getSignedUrl(uploadResult.key);

      this.logger.log(`Document uploaded successfully: ${docId}`);

      return {
        id: docId,
        ten: dto.ten,
        s3_key: uploadResult.key,
        s3_bucket: uploadResult.bucket,
        file_size: file.size,
        loai_file: fileExtension.replace('.', ''),
        created_at: now,
        download_url: downloadUrl,
        targetType: finalTargetType,
        targetId: finalTargetId,
      };
    } catch (error) {
      this.logger.error(`Failed to upload document: ${error}`);
      throw new ServiceUnavailableException(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create relationship between document and target node
   */
  private async createDocumentRelationship(
    targetType: string,
    targetId: string,
    docId: string,
  ): Promise<void> {
    // Map node type to relationship type
    const relationshipMap: Record<string, string> = {
      DuAn: 'DINH_KEM_TAI_LIEU',
      PhongBan: 'TAI_LIEU_PHONG_BAN',
      CongTy: 'TAI_LIEU_CONG_TY',
      NhanSu: 'TAI_LIEU_CA_NHAN',
    };

    const relType = relationshipMap[targetType];

    if (!relType) {
      this.logger.warn(
        `Unknown target type: ${targetType}. Skipping relationship creation.`,
      );
      return;
    }

    try {
      await this.neo.run(
        `
        MATCH (target:${targetType} {id: $targetId})
        MATCH (doc:TaiLieu {id: $docId})
        MERGE (target)-[:${relType}]->(doc)
        `,
        { targetId, docId },
      );

      this.logger.log(
        `Created relationship: (${targetType} {id: ${targetId}})-[:${relType}]->(TaiLieu {id: ${docId}})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create relationship to ${targetType}: ${error}`,
      );
      // Don't throw - document is already created, just log the error
    }
  }

  /**
   * Get pre-signed download URL for document
   */
  async getDownloadUrl(
    projectId: string,
    docId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    try {
      const doc = await this.getDocumentById(projectId, docId);

      if (!doc.s3_key) {
        throw new NotFoundException('Document is not stored in S3');
      }

      const url = await this.s3Service.getSignedUrl(doc.s3_key);

      return {
        url,
        expiresIn: 3600, // 60 minutes
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get download URL: ${error}`);
      throw new ServiceUnavailableException('Failed to generate download URL');
    }
  }

  /**
   * Delete document from S3 and Neo4j
   * Note: Permission check via (:NhanSu)-[:UPLOAD]->(:TaiLieu) will be added
   * when Neo4j DB is updated
   */
  async deleteDocument(
    projectId: string,
    docId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Get document
      const doc = await this.getDocumentById(projectId, docId);

      // TODO: Verify permissions when Neo4j relationship is added
      // MATCH (u:NhanSu {id: userId})-[:UPLOAD]->(doc:TaiLieu {id: docId})
      // OR check if user.role = 'admin'

      // Delete from S3 if it has s3_key
      if (doc.s3_key) {
        await this.s3Service.deleteFile(doc.s3_key);
        this.logger.log(`Deleted file from S3: ${doc.s3_key}`);
      }

      // Delete node and relationships from Neo4j
      await this.neo.run(
        `
        MATCH (doc:TaiLieu {id: $docId})
        DETACH DELETE doc
        `,
        { docId },
      );

      this.logger.log(`Deleted document: ${docId}`);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to delete document: ${error}`);
      throw new ServiceUnavailableException('Failed to delete document');
    }
  }

  /**
   * Get document by ID only (without projectId requirement)
   * For company-level documents or direct access
   */
  async getDocumentByIdDirect(docId: string): Promise<DocumentResult> {
    try {
      const rows = await this.neo.run(
        `MATCH (doc:TaiLieu {id: $docId})
         RETURN {
           id: doc.id,
           name: doc.ten,
           duong_dan: doc.duong_dan,
           s3_key: doc.s3_key,
           s3_bucket: doc.s3_bucket,
           loai: COALESCE(doc.loai_file, 'unknown'),
           mo_ta: COALESCE(doc.mo_ta, ''),
           ngay_tao: COALESCE(toString(doc.created_at), ''),
           co_duong_dan: doc.duong_dan IS NOT NULL OR doc.s3_key IS NOT NULL,
           file_size: doc.file_size
         } AS doc`,
        { docId },
      );

      if (!rows[0]) {
        throw new NotFoundException(`Document ${docId} not found`);
      }

      const firstRow = rows[0] as Record<string, unknown>;
      return firstRow?.doc as DocumentResult;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error getting document: ${error}`);
      throw new ServiceUnavailableException('Failed to retrieve document');
    }
  }

  /**
   * Get document content by docId only (without project requirement)
   * Uses same priority logic: s3_key first, then duong_dan
   */
  async getDocumentContentDirect(docId: string): Promise<DocumentContent> {
    try {
      const doc = await this.getDocumentByIdDirect(docId);

      let result: {
        content: string;
        fileType: string;
        fileName: string;
        size: number;
      };
      let sourceUrl: string;

      // PRIORITY LOGIC (same as getDocumentContent)
      if (doc.s3_key) {
        this.logger.log(`[Direct] Reading document from S3: ${doc.s3_key}`);
        result = await this.documentReader.readDocumentFromS3(
          doc.s3_key,
          doc.s3_bucket || process.env.AWS_S3_BUCKET || 'ekg-documents',
          doc.name,
        );
        sourceUrl = `s3://${doc.s3_bucket}/${doc.s3_key}`;
      } else if (doc.duong_dan) {
        this.logger.log(`[Direct] Reading document from URL: ${doc.duong_dan}`);
        result = await this.documentReader.readDocumentFromUrl(doc.duong_dan);
        sourceUrl = doc.duong_dan;
      } else {
        throw new NotFoundException('Document has no storage location');
      }

      return {
        documentId: doc?.id || '',
        documentName: doc?.name || '',
        documentType: doc?.loai || '',
        description: doc?.mo_ta || '',
        sourceUrl,
        fileInfo: {
          type: result.fileType,
          fileName: result.fileName,
          size: result.size,
        },
        content: result.content,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error reading document content (direct): ${error}`);
      throw new ServiceUnavailableException(
        `Failed to read document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
