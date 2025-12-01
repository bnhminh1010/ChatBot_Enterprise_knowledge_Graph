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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const documents_service_1 = require("./documents.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const create_document_dto_1 = require("./dto/create-document.dto");
const path = __importStar(require("path"));
let DocumentsController = DocumentsController_1 = class DocumentsController {
    docsService;
    logger = new common_1.Logger(DocumentsController_1.name);
    constructor(docsService) {
        this.docsService = docsService;
    }
    async getProjectDocuments(projectId) {
        this.logger.log(`Fetching documents for project: ${projectId}`);
        return this.docsService.getProjectDocuments(projectId);
    }
    async getAccessibleDocuments(projectId) {
        this.logger.log(`Fetching accessible documents for project: ${projectId}`);
        return this.docsService.getAccessibleDocuments(projectId);
    }
    async searchDocuments(projectId, searchTerm) {
        this.logger.log(`Searching documents in project ${projectId} for: ${searchTerm}`);
        return this.docsService.searchProjectDocuments(projectId, searchTerm);
    }
    async getDocument(projectId, docId) {
        this.logger.log(`Fetching document ${docId} from project ${projectId}`);
        return this.docsService.getDocumentById(projectId, docId);
    }
    async getDocumentContent(projectId, docId) {
        this.logger.log(`Fetching document content for ${docId} in project ${projectId}`);
        return this.docsService.getDocumentContent(projectId, docId);
    }
    async checkDocumentPath(projectId, docId) {
        this.logger.log(`Checking path for document ${docId} in project ${projectId}`);
        const hasPath = await this.docsService.hasValidPath(projectId, docId);
        return { documentId: docId, hasPath };
    }
    async uploadDocument(file, dto, req) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        const userId = req.user?.id || 'unknown';
        const departmentId = req.user?.department_id || 'unknown';
        this.logger.log(`Uploading document: ${file.originalname} for user: ${userId}`);
        return this.docsService.uploadDocument(file, dto, userId, departmentId);
    }
    async getDownloadUrl(projectId, docId) {
        this.logger.log(`Generating download URL for document ${docId}`);
        return this.docsService.getDownloadUrl(projectId, docId);
    }
    async deleteDocument(projectId, docId, req) {
        const userId = req.user?.id || 'unknown';
        this.logger.log(`Deleting document ${docId} by user ${userId}`);
        await this.docsService.deleteDocument(projectId, docId, userId);
        return { success: true, message: 'Document deleted successfully' };
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)('projects/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getProjectDocuments", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/accessible'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getAccessibleDocuments", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/search/:searchTerm'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('searchTerm')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "searchDocuments", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/docs/:docId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('docId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/docs/:docId/content'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('docId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getDocumentContent", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/docs/:docId/check-path'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('docId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "checkDocumentPath", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: {
            fileSize: 200 * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
            const allowedTypes = [
                '.pdf',
                '.docx',
                '.txt',
                '.md',
                '.json',
                '.xlsx',
                '.pptx',
                '.csv',
            ];
            const ext = path.extname(file.originalname).toLowerCase();
            if (!allowedTypes.includes(ext)) {
                return cb(new common_1.BadRequestException(`File type ${ext} not allowed`), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_document_dto_1.CreateDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/docs/:docId/download-url'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('docId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getDownloadUrl", null);
__decorate([
    (0, common_1.Delete)('projects/:projectId/docs/:docId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('docId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "deleteDocument", null);
exports.DocumentsController = DocumentsController = DocumentsController_1 = __decorate([
    (0, common_1.Controller)('documents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map