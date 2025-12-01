import { Injectable, Logger } from '@nestjs/common';
import { ProjectsService } from '../../projects/projects.service';
import { DepartmentsService } from '../../departments/departments.service';
import { ChatResponse } from '../dto/chat-response.dto';

@Injectable()
export class UploadIntentHandlerService {
  private readonly logger = new Logger(UploadIntentHandlerService.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  /**
   * Handle upload intent - detect target and return upload prompt
   */
  async handleUploadIntent(message: string): Promise<ChatResponse | null> {
    // Check if this is a help/guide query (e.g., "làm sao để upload")
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

    let targetType: 'DuAn' | 'PhongBan' | 'CongTy' | null = null;
    let targetKeyword: string | null = null;

    // Check for DuAn (Project)
    const projectPattern = /(?:dự án|project)\s+([^,.\n]+)/i;
    const projectMatch = message.match(projectPattern);

    if (projectMatch) {
      targetType = 'DuAn';
      targetKeyword = projectMatch[1].trim();
      this.logger.debug(`Detected project upload: ${targetKeyword}`);
    }

    // Check for PhongBan (Department)
    const deptPattern = /(?:phòng|phòng ban|department)\s+([^,.\n]+)/i;
    const deptMatch = message.match(deptPattern);

    if (deptMatch && !targetType) {
      // Only use if project not already detected
      targetType = 'PhongBan';
      targetKeyword = deptMatch[1].trim();
      this.logger.debug(`Detected department upload: ${targetKeyword}`);
    }

    // Check for CongTy (Company-wide documents)
    if (
      message.match(/(?:công ty|chung|nội bộ|toàn công ty)/i) &&
      !targetType
    ) {
      targetType = 'CongTy';
      targetKeyword = 'company';
      this.logger.debug('Detected company-wide upload');
    }

    if (!targetType || !targetKeyword) {
      this.logger.debug('Could not determine upload target from message');
      return null; // Can't determine target
    }

    // Find target in Neo4j
    const target = await this.findTargetNode(targetType, targetKeyword);

    if (!target) {
      return {
        type: 'text',
        content: `Không tìm thấy ${this.getTargetLabel(targetType)} "${targetKeyword}". Vui lòng kiểm tra lại tên.`,
      };
    }

    // Return upload prompt with action config
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

  /**
   * Find target node in Neo4j by type and keyword
   */
  private async findTargetNode(
    type: 'DuAn' | 'PhongBan' | 'CongTy',
    keyword: string,
  ): Promise<{ id: string; name: string } | null> {
    try {
      if (type === 'DuAn') {
        const projects = await this.projectsService.list();
        const found = projects.find((p: any) =>
          p.name.toLowerCase().includes(keyword.toLowerCase()),
        );
        return found ? { id: found.id, name: found.name } : null;
      }

      if (type === 'PhongBan') {
        const depts = await this.departmentsService.list();
        const found = depts.find((d: any) =>
          d.name.toLowerCase().includes(keyword.toLowerCase()),
        );
        return found ? { id: found.id, name: found.name } : null;
      }

      if (type === 'CongTy') {
        // Return company info
        return { id: 'company-mebisoft', name: 'MebiSoft' };
      }

      return null;
    } catch (error) {
      this.logger.error(`Error finding target node: ${error}`);
      return null;
    }
  }

  /**
   * Get display label for target type
   */
  private getTargetLabel(type: 'DuAn' | 'PhongBan' | 'CongTy'): string {
    switch (type) {
      case 'DuAn':
        return 'dự án';
      case 'PhongBan':
        return 'phòng ban';
      case 'CongTy':
        return 'công ty';
    }
  }

  /**
   * Check if message is asking for help/guidance
   */
  private isHelpQuery(message: string): boolean {
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

  /**
   * Check if message has upload intent
   */
  hasUploadIntent(message: string): boolean {
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
}
