import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(private readonly docsService: DocumentsService) {}

  /**
   * GET /documents/projects/:projectId
   * Get all documents for a project
   */
  @Get('projects/:projectId')
  async getProjectDocuments(@Param('projectId') projectId: string) {
    this.logger.log(`Fetching documents for project: ${projectId}`);
    return this.docsService.getProjectDocuments(projectId);
  }

  /**
   * GET /documents/projects/:projectId/accessible
   * Get only documents with valid paths (duong_dan)
   */
  @Get('projects/:projectId/accessible')
  async getAccessibleDocuments(@Param('projectId') projectId: string) {
    this.logger.log(`Fetching accessible documents for project: ${projectId}`);
    return this.docsService.getAccessibleDocuments(projectId);
  }

  /**
   * GET /documents/projects/:projectId/search/:searchTerm
   * Search documents by name or type
   */
  @Get('projects/:projectId/search/:searchTerm')
  async searchDocuments(
    @Param('projectId') projectId: string,
    @Param('searchTerm') searchTerm: string,
  ) {
    this.logger.log(
      `Searching documents in project ${projectId} for: ${searchTerm}`,
    );
    return this.docsService.searchProjectDocuments(projectId, searchTerm);
  }

  /**
   * GET /documents/projects/:projectId/docs/:docId
   * Get document metadata
   */
  @Get('projects/:projectId/docs/:docId')
  async getDocument(
    @Param('projectId') projectId: string,
    @Param('docId') docId: string,
  ): Promise<unknown> {
    this.logger.log(`Fetching document ${docId} from project ${projectId}`);
    return this.docsService.getDocumentById(projectId, docId);
  }

  /**
   * GET /documents/projects/:projectId/docs/:docId/content
   * 🔥 MAIN FEATURE: Get document content by downloading and parsing file from URL
   *
   * How it works:
   * 1. Retrieves document from Neo4j
   * 2. Checks if document has duong_dan (path/URL) attribute
   * 3. Downloads file from the URL (GitHub, HTTP, etc.)
   * 4. Parses file content (.docx, .pdf, .txt, .md, .json)
   * 5. Returns parsed content with metadata
   *
   * Example response:
   * {
   *   "documentId": "doc123",
   *   "documentName": "Project Requirements",
   *   "documentType": "docx",
   *   "description": "Requirements specification",
   *   "sourceUrl": "https://raw.githubusercontent.com/...",
   *   "fileInfo": {
   *     "type": "docx",
   *     "fileName": "requirements.docx",
   *     "size": 15240
   *   },
   *   "content": "Full extracted text from the file...",
   *   "retrievedAt": "2025-11-25T10:30:00.000Z"
   * }
   */
  @Get('projects/:projectId/docs/:docId/content')
  async getDocumentContent(
    @Param('projectId') projectId: string,
    @Param('docId') docId: string,
  ): Promise<unknown> {
    this.logger.log(
      `Fetching document content for ${docId} in project ${projectId}`,
    );
    return this.docsService.getDocumentContent(projectId, docId);
  }

  /**
   * GET /documents/projects/:projectId/docs/:docId/check-path
   * Check if document has a valid path configured
   */
  @Get('projects/:projectId/docs/:docId/check-path')
  async checkDocumentPath(
    @Param('projectId') projectId: string,
    @Param('docId') docId: string,
  ) {
    this.logger.log(
      `Checking path for document ${docId} in project ${projectId}`,
    );
    const hasPath = await this.docsService.hasValidPath(projectId, docId);
    return { documentId: docId, hasPath };
  }
}
