import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { DocumentReaderService } from './document-reader.service';

interface DocumentResult {
  id: string;
  name: string;
  duong_dan: string | null;
  loai: string;
  mo_ta: string;
  ngay_tao: string;
  co_duong_dan: boolean;
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
         RETURN {
           projectId: p.id,
           projectName: p.ten,
           documents: collect({
             id: doc.id,
             name: doc.ten,
             duong_dan: doc.duong_dan,
             loai: COALESCE(doc.loai, 'unknown'),
             mo_ta: COALESCE(doc.mo_ta, ''),
             ngay_tao: COALESCE(toString(doc.ngay_tao), ''),
             co_duong_dan: doc.duong_dan IS NOT NULL
           }) AS docs
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
   * Get document content from URL stored in duong_dan attribute
   * Main feature: Downloads and parses file content
   */
  async getDocumentContent(
    projectId: string,
    docId: string,
  ): Promise<DocumentContent> {
    try {
      // Step 1: Get document from Neo4j
      const doc = await this.getDocumentById(projectId, docId);

      if (!doc?.co_duong_dan || !doc?.duong_dan) {
        throw new NotFoundException(
          'Document does not have a path (duong_dan) configured',
        );
      }

      this.logger.log(`Reading document content from: ${doc.duong_dan}`);

      // Step 2: Download and parse file from URL
      const result = await this.documentReader.readDocumentFromUrl(
        doc.duong_dan,
      );

      // Return content with metadata
      return {
        documentId: doc?.id || '',
        documentName: doc?.name || '',
        documentType: doc?.loai || '',
        description: doc?.mo_ta || '',
        sourceUrl: doc?.duong_dan || '',
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
}
