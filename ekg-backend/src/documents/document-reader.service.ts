import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class DocumentReaderService {
  private readonly logger = new Logger(DocumentReaderService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'ekg-documents');

  constructor() {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Download file from URL and return file path
   * Supports GitHub raw URLs and direct HTTP(S) URLs
   */
  async downloadFile(url: string): Promise<string> {
    try {
      this.logger.debug(`Downloading file from: ${url}`);

      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new BadRequestException('Invalid URL format');
      }

      // Handle GitHub raw URLs
      const finalUrl = this.normalizeGithubUrl(url);

      // Download file with timeout
      const response = await axios.default.get(finalUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
        headers: {
          'User-Agent': 'EKG-Backend/1.0',
        },
      });

      // Generate temp filename based on URL
      const filename = this.generateTempFilename(finalUrl);
      const tempFilePath = path.join(this.tempDir, filename);

      // Write file to temp directory
      fs.writeFileSync(tempFilePath, response.data);
      this.logger.log(`File downloaded successfully to: ${tempFilePath}`);

      return tempFilePath;
    } catch (error) {
      this.logger.error(`Error downloading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse file content based on file type
   * Supports: .docx, .pdf, .txt, .md, .json
   */
  async parseFile(filePath: string): Promise<string> {
    try {
      const extension = path.extname(filePath).toLowerCase();

      this.logger.debug(`Parsing file: ${filePath} (type: ${extension})`);

      switch (extension) {
        case '.docx':
          return await this.parseDocx(filePath);
        case '.pdf':
          return await this.parsePdf(filePath);
        case '.txt':
        case '.md':
          return this.parseText(filePath);
        case '.json':
          return this.parseJson(filePath);
        default:
          throw new BadRequestException(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      this.logger.error(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Main method: Download and parse file from URL
   */
  async readDocumentFromUrl(url: string): Promise<{
    content: string;
    fileType: string;
    fileName: string;
    size: number;
  }> {
    let filePath: string | null = null;

    try {
      // Step 1: Download file
      filePath = await this.downloadFile(url);

      // Step 2: Get file stats
      const stats = fs.statSync(filePath);
      const extension = path.extname(filePath).toLowerCase();

      // Step 3: Parse file content
      const content = await this.parseFile(filePath);

      // Step 4: Extract filename from URL
      const fileName = this.extractFilename(url);

      this.logger.log(`Successfully read document: ${fileName} (${stats.size} bytes)`);

      return {
        content,
        fileType: extension.replace('.', ''),
        fileName,
        size: stats.size,
      };
    } finally {
      // Clean up temp file
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.logger.debug(`Cleaned up temp file: ${filePath}`);
        } catch (err) {
          this.logger.warn(`Failed to clean up temp file: ${filePath}`);
        }
      }
    }
  }

  /**
   * Parse .docx files
   * Uses mammoth package
   */
  private async parseDocx(filePath: string): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    } catch (error) {
      this.logger.error(`Failed to parse .docx file: ${error}`);
      throw new BadRequestException(
        `Failed to parse .docx file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parse .pdf files
   * Uses pdfjs-dist package
   */
  private async parsePdf(filePath: string): Promise<string> {
    try {
      // Dynamic import
      const pdfjsLib = await import('pdfjs-dist');
      const pdf = pdfjsLib.default;

      // Set worker
      pdf.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdf.version}/pdf.worker.min.js`;

      const fileBuffer = fs.readFileSync(filePath);
      const document = await pdf.getDocument({ data: fileBuffer }).promise;

      let fullText = '';

      for (let pageNum = 1; pageNum <= document.numPages; pageNum++) {
        const page = await document.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      this.logger.warn('pdfjs-dist not available, using fallback');
      throw new BadRequestException('PDF parsing requires pdfjs-dist package. Please install: npm install pdfjs-dist');
    }
  }

  /**
   * Parse plain text files (.txt, .md)
   */
  private parseText(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  }

  /**
   * Parse JSON files
   */
  private parseJson(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      const json = JSON.parse(content);
      // Convert JSON to readable string
      return JSON.stringify(json, null, 2);
    } catch (error) {
      return content;
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Normalize GitHub URLs to raw.githubusercontent.com
   */
  private normalizeGithubUrl(url: string): string {
    // Convert github.com/user/repo/blob/branch/path to raw.githubusercontent.com
    const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.*)/;
    const match = url.match(githubRegex);

    if (match) {
      const [, user, repo, branch, filePath] = match;
      return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
    }

    return url;
  }

  /**
   * Generate temporary filename
   */
  private generateTempFilename(url: string): string {
    const filename = this.extractFilename(url);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    return `${timestamp}-${randomStr}-${filename}`;
  }

  /**
   * Extract filename from URL
   */
  private extractFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'document';
      // Remove query parameters if any
      return filename.split('?')[0];
    } catch (error) {
      return 'document';
    }
  }

  /**
   * Clean up old temp files (optional maintenance)
   */
  async cleanupOldTempFiles(maxAgeHours: number = 24): Promise<number> {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        if (ageHours > maxAgeHours) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      this.logger.log(`Cleaned up ${deletedCount} old temp files`);
      return deletedCount;
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp files: ${error}`);
      return 0;
    }
  }
}
