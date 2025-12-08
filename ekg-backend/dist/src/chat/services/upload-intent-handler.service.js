"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadIntentHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadIntentHandlerService = void 0;
const common_1 = require("@nestjs/common");
const projects_service_1 = require("../../projects/projects.service");
const departments_service_1 = require("../../departments/departments.service");
let UploadIntentHandlerService = UploadIntentHandlerService_1 = class UploadIntentHandlerService {
    projectsService;
    departmentsService;
    logger = new common_1.Logger(UploadIntentHandlerService_1.name);
    constructor(projectsService, departmentsService) {
        this.projectsService = projectsService;
        this.departmentsService = departmentsService;
    }
    async handleUploadIntent(message) {
        if (this.isHelpQuery(message)) {
            return {
                type: 'text',
                content: `📚 **Hướng dẫn upload tài liệu:**

**Cách 1: Upload cho dự án cụ thể**
Nói: "Upload tài liệu cho dự án [tên dự án]"
Ví dụ: "Upload tài liệu cho dự án APTX"

**Cách 2: Upload cho phòng ban**
Nói: "Thêm file cho phòng [tên phòng]"
Ví dụ: "Thêm file cho phòng HR"

**Cách 3: Upload tài liệu chung công ty**
Nói: "Upload tài liệu chung công ty"

Sau khi bạn nói, tôi sẽ hiển thị nút upload để bạn chọn file.

**Định dạng hỗ trợ:** .pdf, .docx, .txt, .md, .json, .xlsx, .pptx, .csv (max 200MB)`,
            };
        }
        let targetType = null;
        let targetKeyword = null;
        const projectPattern = /(?:dự án|project)\s+([^,.\n]+)/i;
        const projectMatch = message.match(projectPattern);
        if (projectMatch) {
            targetType = 'DuAn';
            targetKeyword = projectMatch[1].trim();
            this.logger.debug(`Detected project upload: ${targetKeyword}`);
        }
        const deptPattern = /(?:phòng|phòng ban|department)\s+([^,.\n]+)/i;
        const deptMatch = message.match(deptPattern);
        if (deptMatch && !targetType) {
            targetType = 'PhongBan';
            targetKeyword = deptMatch[1].trim();
            this.logger.debug(`Detected department upload: ${targetKeyword}`);
        }
        if (message.match(/(?:công ty|chung|nội bộ|toàn công ty)/i) &&
            !targetType) {
            targetType = 'CongTy';
            targetKeyword = 'company';
            this.logger.debug('Detected company-wide upload');
        }
        if (!targetType || !targetKeyword) {
            this.logger.debug('Could not determine upload target from message');
            return null;
        }
        const target = await this.findTargetNode(targetType, targetKeyword);
        if (!target) {
            return {
                type: 'text',
                content: `Không tìm thấy ${this.getTargetLabel(targetType)} "${targetKeyword}". Vui lòng kiểm tra lại tên.`,
            };
        }
        return {
            type: 'upload_prompt',
            content: `Tìm thấy ${this.getTargetLabel(targetType)}: **"${target.name}"** (ID: ${target.id}).\n\nNhấn nút bên dưới để upload tài liệu.`,
            action: {
                type: 'show_upload',
                config: {
                    targetType,
                    targetId: target.id,
                    targetName: target.name,
                },
            },
        };
    }
    async findTargetNode(type, keyword) {
        try {
            if (type === 'DuAn') {
                const projects = await this.projectsService.list();
                const found = projects.find((p) => p.name.toLowerCase().includes(keyword.toLowerCase()));
                return found ? { id: found.id, name: found.name } : null;
            }
            if (type === 'PhongBan') {
                const depts = await this.departmentsService.list();
                const found = depts.find((d) => d.name.toLowerCase().includes(keyword.toLowerCase()));
                return found ? { id: found.id, name: found.name } : null;
            }
            if (type === 'CongTy') {
                return { id: 'company-mebisoft', name: 'MebiSoft' };
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Error finding target node: ${error}`);
            return null;
        }
    }
    getTargetLabel(type) {
        switch (type) {
            case 'DuAn':
                return 'dự án';
            case 'PhongBan':
                return 'phòng ban';
            case 'CongTy':
                return 'công ty';
        }
    }
    isHelpQuery(message) {
        const helpPatterns = [
            /làm sao.*upload/i,
            /làm thế nào.*upload/i,
            /cách.*upload/i,
            /hướng dẫn.*upload/i,
            /how.*upload/i,
            /upload.*như thế nào/i,
            /upload.*thế nào/i,
        ];
        return helpPatterns.some((pattern) => pattern.test(message));
    }
    hasUploadIntent(message) {
        const uploadKeywords = [
            'upload',
            'tải lên',
            'up file',
            'thêm tài liệu',
            'thêm file',
            'đăng tài liệu',
            'upload tài liệu',
        ];
        return uploadKeywords.some((kw) => message.toLowerCase().includes(kw));
    }
};
exports.UploadIntentHandlerService = UploadIntentHandlerService;
exports.UploadIntentHandlerService = UploadIntentHandlerService = UploadIntentHandlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService,
        departments_service_1.DepartmentsService])
], UploadIntentHandlerService);
//# sourceMappingURL=upload-intent-handler.service.js.map