"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DocumentReaderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentReaderService = void 0;
const common_1 = require("@nestjs/common");
const axios = __importStar(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const s3_service_1 = require("../aws/s3.service");
let DocumentReaderService = DocumentReaderService_1 = class DocumentReaderService {
    s3Service;
    logger = new common_1.Logger(DocumentReaderService_1.name);
    tempDir = path.join(os.tmpdir(), 'ekg-documents');
    constructor(s3Service) {
        this.s3Service = s3Service;
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    async downloadFile(url) {
        try {
            this.logger.debug(`Downloading file from: ${url}`);
            if (!this.isValidUrl(url)) {
                throw new common_1.BadRequestException('Invalid URL format');
            }
            const finalUrl = this.normalizeGithubUrl(url);
            const response = await axios.default.get(finalUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'EKG-Backend/1.0',
                },
            });
            const filename = this.generateTempFilename(finalUrl);
            const tempFilePath = path.join(this.tempDir, filename);
            fs.writeFileSync(tempFilePath, response.data);
            this.logger.log(`File downloaded successfully to: ${tempFilePath}`);
            return tempFilePath;
        }
        catch (error) {
            this.logger.error(`Error downloading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new common_1.BadRequestException(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async parseFile(filePath) {
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
                    throw new common_1.BadRequestException(`Unsupported file type: ${extension}`);
            }
        }
        catch (error) {
            this.logger.error(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async readDocumentFromUrl(url) {
        let filePath = null;
        try {
            filePath = await this.downloadFile(url);
            const stats = fs.statSync(filePath);
            const extension = path.extname(filePath).toLowerCase();
            const content = await this.parseFile(filePath);
            const fileName = this.extractFilename(url);
            this.logger.log(`Successfully read document: ${fileName} (${stats.size} bytes)`);
            return {
                content,
                fileType: extension.replace('.', ''),
                fileName,
                size: stats.size,
            };
        }
        finally {
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    this.logger.debug(`Cleaned up temp file: ${filePath}`);
                }
                catch (err) {
                    this.logger.warn(`Failed to clean up temp file: ${filePath}`);
                }
            }
        }
    }
    async parseDocx(filePath) {
        try {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value || '';
        }
        catch (error) {
            this.logger.error(`Failed to parse .docx file: ${error}`);
            throw new common_1.BadRequestException(`Failed to parse .docx file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async parsePdf(filePath) {
        try {
            const pdfjsLib = await import('pdfjs-dist');
            const pdf = pdfjsLib.default;
            pdf.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdf.version}/pdf.worker.min.js`;
            const fileBuffer = fs.readFileSync(filePath);
            const document = await pdf.getDocument({ data: fileBuffer }).promise;
            let fullText = '';
            for (let pageNum = 1; pageNum <= document.numPages; pageNum++) {
                const page = await document.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item) => item.str)
                    .join(' ');
                fullText += pageText + '\n';
            }
            return fullText;
        }
        catch (error) {
            this.logger.warn('pdfjs-dist not available, using fallback');
            throw new common_1.BadRequestException('PDF parsing requires pdfjs-dist package. Please install: npm install pdfjs-dist');
        }
    }
    parseText(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
    }
    parseJson(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
            const json = JSON.parse(content);
            return JSON.stringify(json, null, 2);
        }
        catch (error) {
            return content;
        }
    }
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    normalizeGithubUrl(url) {
        const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.*)/;
        const match = url.match(githubRegex);
        if (match) {
            const [, user, repo, branch, filePath] = match;
            return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
        }
        return url;
    }
    generateTempFilename(url) {
        const filename = this.extractFilename(url);
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        return `${timestamp}-${randomStr}-${filename}`;
    }
    extractFilename(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop() || 'document';
            return filename.split('?')[0];
        }
        catch (error) {
            return 'document';
        }
    }
    async cleanupOldTempFiles(maxAgeHours = 24) {
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
        }
        catch (error) {
            this.logger.warn(`Failed to cleanup temp files: ${error}`);
            return 0;
        }
    }
    async readDocumentFromS3(s3Key, s3Bucket, fileName) {
        let tempFilePath = null;
        try {
            this.logger.log(`Reading document from S3: ${s3Key}`);
            const buffer = await this.s3Service.getObject(s3Key);
            const extension = path.extname(fileName);
            const timestamp = Date.now();
            tempFilePath = path.join(this.tempDir, `${timestamp}-${fileName}`);
            fs.writeFileSync(tempFilePath, buffer);
            this.logger.debug(`Downloaded from S3 to temp: ${tempFilePath} (${buffer.length} bytes)`);
            const content = await this.parseFile(tempFilePath);
            this.logger.log(`Successfully read document from S3: ${fileName} (${buffer.length} bytes)`);
            return {
                content,
                fileType: extension.replace('.', ''),
                fileName,
                size: buffer.length,
            };
        }
        finally {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    this.logger.debug(`Cleaned up temp file: ${tempFilePath}`);
                }
                catch (err) {
                    this.logger.warn(`Failed to clean up temp file: ${tempFilePath} - ${err}`);
                }
            }
        }
    }
};
exports.DocumentReaderService = DocumentReaderService;
exports.DocumentReaderService = DocumentReaderService = DocumentReaderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [s3_service_1.S3Service])
], DocumentReaderService);
//# sourceMappingURL=document-reader.service.js.map