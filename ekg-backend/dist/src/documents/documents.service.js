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
var DocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
const document_reader_service_1 = require("./document-reader.service");
const s3_service_1 = require("../aws/s3.service");
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
let DocumentsService = DocumentsService_1 = class DocumentsService {
    neo;
    documentReader;
    s3Service;
    logger = new common_1.Logger(DocumentsService_1.name);
    constructor(neo, documentReader, s3Service) {
        this.neo = neo;
        this.documentReader = documentReader;
        this.s3Service = s3Service;
    }
    async getProjectDocuments(projectId) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn {id: $projectId})
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
         } AS result`, { projectId });
            if (!rows[0]) {
                throw new common_1.NotFoundException('Project not found');
            }
            const firstRow = rows[0];
            return firstRow?.result || null;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error(`Error getting project documents: ${error}`);
            throw new common_1.ServiceUnavailableException('Failed to retrieve documents');
        }
    }
    async getDocumentById(projectId, docId) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu {id: $docId})
         RETURN {
           id: doc.id,
           name: doc.ten,
           duong_dan: doc.duong_dan,
           loai: COALESCE(doc.loai, 'unknown'),
           mo_ta: COALESCE(doc.mo_ta, ''),
           ngay_tao: COALESCE(toString(doc.ngay_tao), ''),
           co_duong_dan: doc.duong_dan IS NOT NULL
         } AS doc`, { projectId, docId });
            if (!rows[0]) {
                throw new common_1.NotFoundException('Document not found in this project');
            }
            const firstRow = rows[0];
            return firstRow?.doc;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error(`Error getting document: ${error}`);
            throw new common_1.ServiceUnavailableException('Failed to retrieve document');
        }
    }
    async getDocumentContent(projectId, docId) {
        try {
            const doc = await this.getDocumentById(projectId, docId);
            let result;
            let sourceUrl;
            if (doc.s3_key) {
                this.logger.log(`Reading document from S3: ${doc.s3_key}`);
                result = await this.documentReader.readDocumentFromS3(doc.s3_key, doc.s3_bucket || process.env.AWS_S3_BUCKET || 'ekg-documents', doc.name);
                sourceUrl = `s3://${doc.s3_bucket}/${doc.s3_key}`;
            }
            else if (doc.duong_dan) {
                this.logger.log(`Reading document from URL: ${doc.duong_dan}`);
                result = await this.documentReader.readDocumentFromUrl(doc.duong_dan);
                sourceUrl = doc.duong_dan;
            }
            else {
                throw new common_1.NotFoundException('Document has no storage location (no s3_key or duong_dan)');
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
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error(`Error reading document content: ${error}`);
            throw new common_1.ServiceUnavailableException(`Failed to read document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async searchProjectDocuments(projectId, searchTerm, options = {}) {
        try {
            const pathFilter = options.onlyWithPath
                ? 'AND doc.duong_dan IS NOT NULL'
                : '';
            const rows = await this.neo.run(`MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)
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
         ORDER BY doc.name`, { projectId, searchTerm });
            return rows.map((r) => {
                const row = r;
                return row?.doc || {};
            });
        }
        catch (error) {
            this.logger.error(`Error searching documents: ${error}`);
            throw new common_1.ServiceUnavailableException('Failed to search documents');
        }
    }
    async getAccessibleDocuments(projectId) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)
         WHERE doc.duong_dan IS NOT NULL
         RETURN {
           id: doc.id,
           name: doc.ten,
           type: COALESCE(doc.loai, 'unknown'),
           description: COALESCE(doc.mo_ta, ''),
           url: doc.duong_dan,
           createdAt: COALESCE(toString(doc.ngay_tao), '')
         } AS doc
         ORDER BY doc.name`, { projectId });
            return rows.map((r) => {
                const row = r;
                return row?.doc || {};
            });
        }
        catch (error) {
            this.logger.error(`Error getting accessible documents: ${error}`);
            throw new common_1.ServiceUnavailableException('Failed to retrieve accessible documents');
        }
    }
    async hasValidPath(projectId, docId) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu {id: $docId})
         RETURN doc.duong_dan IS NOT NULL AS hasPath`, { projectId, docId });
            const firstRow = rows[0];
            return firstRow?.hasPath || false;
        }
        catch (error) {
            this.logger.error(`Error checking document path: ${error}`);
            return false;
        }
    }
    async searchDocumentsByName(documentName, projectId) {
        try {
            const projectFilter = projectId
                ? 'MATCH (p:DuAn {id: $projectId})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)'
                : 'MATCH (doc:TaiLieu)';
            const rows = await this.neo.run(`${projectFilter}
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
         LIMIT 10`, { documentName, projectId });
            return rows.map((r) => {
                const row = r;
                return row?.doc;
            });
        }
        catch (error) {
            this.logger.error(`Error searching documents: ${error}`);
            return [];
        }
    }
    async uploadDocument(file, dto, userId, departmentId) {
        try {
            const fileExtension = path.extname(file.originalname);
            const fileName = file.originalname;
            const s3Key = `documents/${departmentId}/${userId}/${fileName}`;
            this.logger.log(`Uploading document: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${s3Key}`);
            const uploadResult = await this.s3Service.uploadFile(file.buffer, s3Key, file.mimetype);
            const docId = (0, uuid_1.v4)();
            const now = new Date().toISOString();
            await this.neo.run(`
        MATCH (p:DuAn {id: $projectId})
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
        CREATE (p)-[:DINH_KEM_TAI_LIEU]->(doc)
        RETURN doc
        `, {
                projectId: dto.projectId,
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
            });
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
            };
        }
        catch (error) {
            this.logger.error(`Failed to upload document: ${error}`);
            throw new common_1.ServiceUnavailableException(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getDownloadUrl(projectId, docId) {
        try {
            const doc = await this.getDocumentById(projectId, docId);
            if (!doc.s3_key) {
                throw new common_1.NotFoundException('Document is not stored in S3');
            }
            const url = await this.s3Service.getSignedUrl(doc.s3_key);
            return {
                url,
                expiresIn: 3600,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error(`Failed to get download URL: ${error}`);
            throw new common_1.ServiceUnavailableException('Failed to generate download URL');
        }
    }
    async deleteDocument(projectId, docId, userId) {
        try {
            const doc = await this.getDocumentById(projectId, docId);
            if (doc.s3_key) {
                await this.s3Service.deleteFile(doc.s3_key);
                this.logger.log(`Deleted file from S3: ${doc.s3_key}`);
            }
            await this.neo.run(`
        MATCH (doc:TaiLieu {id: $docId})
        DETACH DELETE doc
        `, { docId });
            this.logger.log(`Deleted document: ${docId}`);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error(`Failed to delete document: ${error}`);
            throw new common_1.ServiceUnavailableException('Failed to delete document');
        }
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = DocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService,
        document_reader_service_1.DocumentReaderService,
        s3_service_1.S3Service])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map