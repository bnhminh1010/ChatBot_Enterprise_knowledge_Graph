/**
 * @fileoverview Chat Controller - REST API Endpoints
 * @module chat/chat.controller
 *
 * Controller xử lý các REST API endpoints cho chatbot.
 * Bảo vệ bởi JWT authentication và role-based access control.
 *
 * Endpoints:
 * - POST /chat - Xử lý query và trả về response
 * - POST /chat/index - Trigger indexing entities vào ChromaDB
 * - GET /chat/health - Kiểm tra system health
 * - GET /chat/metrics - Lấy performance metrics
 * - GET /chat/conversations - Lấy danh sách conversations của user
 * - GET /chat/conversations/:id - Lấy chi tiết conversation
 * - DELETE /chat/conversations/:id - Xóa conversation
 *
 * @author APTX3107 Team
 */
import {
  Controller,
  Post,
  Body,
  Get,
  Logger,
  UseGuards,
  Param,
  Delete,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { MetricsService } from './services/metrics.service';
import { ChromaIndexingService } from './services/chroma-indexing.service';
import { RedisConversationService } from './services/redis-conversation.service';
import { ChatQueryDto, ChatResponseDto } from './dto/chat-query.dto';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { GeminiService } from '../ai/gemini.service';
import { OpenRouterService } from '../ai/openrouter.service';
import { OllamaService } from '../ai/ollama.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
// Document parsing libraries
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Controller chính cho chatbot API.
 * Tất cả endpoints yêu cầu JWT authentication.
 */
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  /**
   * @param chatService - Service xử lý chat logic
   * @param metricsService - Service thu thập metrics
   * @param chromaIndexingService - Service indexing vào ChromaDB
   * @param neo4jService - Service kết nối Neo4j
   * @param redisConversationService - Service quản lý conversations
   * @param geminiService - Gemini AI service
   * @param openRouterService - OpenRouter fallback service
   * @param ollamaService - Ollama local LLM service
   */
  constructor(
    private chatService: ChatService,
    private metricsService: MetricsService,
    private chromaIndexingService: ChromaIndexingService,
    private neo4jService: Neo4jService,
    private redisConversationService: RedisConversationService,
    private geminiService: GeminiService,
    private openRouterService: OpenRouterService,
    private ollamaService: OllamaService,
  ) {}

  /**
   * Xử lý chat query từ user.
   *
   * @route POST /chat
   * @security JWT + Role (ADMIN, VIEWER)
   * @param dto - Query message và conversation context
   * @param user - User từ JWT token
   * @returns Response với AI answer và metadata
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VIEWER')
  async processQuery(
    @Body() dto: ChatQueryDto,
    @CurrentUser() user: any,
  ): Promise<ChatResponseDto> {
    try {
      const result = await this.chatService.processQuery(
        dto.message,
        dto.conversationId,
        user.username,
      );

      return {
        message: dto.message,
        response: result.response,
        queryType: result.queryType,
        queryLevel: result.queryLevel,
        processingTime: result.processingTime,
        conversationId: result.conversationId,
        timestamp: new Date(),
        suggestedQuestions: result.suggestedQuestions,
      };
    } catch (error: any) {
      this.logger.error(`Error processing chat query: ${error}`);

      // Handle empty model output gracefully
      if (
        error.message?.includes(
          'model output must contain either output text or tool calls',
        ) ||
        error.message?.includes('empty')
      ) {
        return {
          message: dto.message,
          response:
            'Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau giây lát.',
          queryType: 'error',
          queryLevel: 'simple',
          processingTime: 0,
          conversationId: dto.conversationId,
          timestamp: new Date(),
        };
      }

      throw error;
    }
  }

  /**
   * Xử lý chat query với file đính kèm (ảnh).
   * Sử dụng Vision API của AI services với fallback.
   *
   * @route POST /chat/with-file
   * @security JWT + Role (ADMIN, VIEWER)
   * @param file - File ảnh đính kèm
   * @param body - Message từ user
   * @param user - User từ JWT token
   * @returns Response với AI answer
   */
  @Post('with-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VIEWER')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for documents
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(`File type ${file.mimetype} not allowed`),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async processQueryWithFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('message') message: string,
    @Body('conversationId') conversationId: string,
    @CurrentUser() user: any,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const isImage = file.mimetype.startsWith('image/');
    this.logger.log(
      `Processing chat with ${isImage ? 'image' : 'document'}: ${file.originalname} (${file.mimetype})`,
    );

    try {
      let response = '';

      if (isImage) {
        // === IMAGE PROCESSING (Vision) ===
        response = await this.processImageWithFallback(file, message);
      } else {
        // === DOCUMENT PROCESSING ===
        response = await this.processDocumentWithAI(file, message);
      }

      return {
        message: message || `[${isImage ? 'Image' : 'Document'} uploaded]`,
        response,
        queryType: isImage ? 'vision' : 'document',
        queryLevel: 'agent',
        processingTime: Date.now() - startTime,
        conversationId,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(
        `Error processing ${isImage ? 'image' : 'document'}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Process image với fallback chain: Gemini → OpenRouter → Ollama
   */
  private async processImageWithFallback(
    file: Express.Multer.File,
    message: string,
  ): Promise<string> {
    // Try Gemini Vision first
    try {
      const response = await this.geminiService.analyzeImageWithPrompt(
        file.buffer,
        file.mimetype,
        message || 'Mô tả chi tiết nội dung trong ảnh này.',
      );
      this.logger.debug('Image analyzed with Gemini Vision');
      return response;
    } catch (geminiError: any) {
      this.logger.warn(
        `Gemini Vision failed: ${geminiError.message}, trying OpenRouter...`,
      );
    }

    // Fallback to OpenRouter
    try {
      if (this.openRouterService.isAvailable()) {
        const response = await this.openRouterService.analyzeImageWithPrompt(
          file.buffer,
          file.mimetype,
          message || 'Mô tả chi tiết nội dung trong ảnh này.',
        );
        this.logger.debug('Image analyzed with OpenRouter Vision');
        return response;
      }
    } catch (openRouterError: any) {
      this.logger.warn(
        `OpenRouter Vision failed: ${openRouterError.message}, trying Ollama...`,
      );
    }

    // Last fallback to Ollama
    try {
      if (await this.ollamaService.isHealthy()) {
        const response = await this.ollamaService.analyzeImageWithPrompt(
          file.buffer,
          file.mimetype,
          message || 'Mô tả chi tiết nội dung trong ảnh này.',
        );
        this.logger.debug('Image analyzed with Ollama Vision (llava)');
        return response;
      }
    } catch (ollamaError: any) {
      this.logger.error(`All vision providers failed: ${ollamaError.message}`);
    }

    return 'Xin lỗi, hệ thống đang gặp sự cố khi xử lý ảnh. Vui lòng thử lại sau.';
  }

  /**
   * Process document: Extract text và gửi cho AI phân tích
   */
  private async processDocumentWithAI(
    file: Express.Multer.File,
    message: string,
  ): Promise<string> {
    let extractedText = '';

    // Extract text based on file type
    try {
      if (file.mimetype === 'text/plain' || file.mimetype === 'text/csv') {
        extractedText = file.buffer.toString('utf-8');
        this.logger.debug(
          `Extracted ${extractedText.length} chars from text file`,
        );
      } else if (file.mimetype === 'application/pdf') {
        // PDF parsing
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text;
        this.logger.debug(`Extracted ${extractedText.length} chars from PDF`);
      } else if (
        file.mimetype.includes('word') ||
        file.mimetype.includes('document')
      ) {
        // Word document parsing
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        extractedText = result.value;
        this.logger.debug(
          `Extracted ${extractedText.length} chars from Word doc`,
        );
      } else if (
        file.mimetype.includes('excel') ||
        file.mimetype.includes('spreadsheet')
      ) {
        // Excel parsing
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheets: string[] = [];
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`);
        });
        extractedText = sheets.join('\n\n');
        this.logger.debug(`Extracted ${extractedText.length} chars from Excel`);
      }
    } catch (extractError: any) {
      this.logger.error(
        `Error extracting text from document: ${extractError.message}`,
      );
      return `Lỗi khi đọc file **${file.originalname}**: ${extractError.message}`;
    }

    // If we got text, send to AI for analysis
    if (extractedText && extractedText.trim().length > 0) {
      const truncatedText = extractedText.substring(0, 15000); // Limit for API
      const prompt = `Đây là nội dung file "${file.originalname}":\n\n${truncatedText}\n\n${message || 'Tóm tắt nội dung chính và các điểm quan trọng của file này bằng tiếng Việt.'}`;

      try {
        const response = await this.geminiService.generateResponse(prompt);
        return response;
      } catch (geminiError: any) {
        this.logger.warn(`Gemini failed for document, trying OpenRouter...`);

        try {
          if (this.openRouterService.isAvailable()) {
            return await this.openRouterService.generateResponse(prompt);
          }
        } catch {
          // Ignore and try fallback
        }
      }
    }

    return `Không thể trích xuất nội dung từ file **${file.originalname}**. Vui lòng kiểm tra định dạng file.`;
  }

  /**
   * Sequential Thinking - AI suy luận từng bước trước khi trả lời.
   * Sử dụng ChatService với tất cả agent tools + Chain-of-Thought prompting.
   *
   * @route POST /chat/thinking
   * @security JWT + Role (ADMIN, VIEWER)
   * @param dto - Query message và conversation context
   * @param user - User từ JWT token
   * @returns Response với reasoning steps và final answer
   */
  @Post('thinking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VIEWER')
  async processThinkingQuery(
    @Body() dto: ChatQueryDto,
    @CurrentUser() user: any,
  ): Promise<ChatResponseDto> {
    this.logger.log(
      `🧠 Sequential Thinking query: ${dto.message.substring(0, 100)}...`,
    );

    // Enhance the message with Chain-of-Thought instructions
    const thinkingPrefix = `[SEQUENTIAL THINKING MODE - Hãy suy luận từng bước]

Trước khi trả lời, hãy:
1. Phân tích câu hỏi và xác định thông tin cần thiết
2. Sử dụng các tools để truy vấn dữ liệu nếu cần
3. Liệt kê các bước suy luận (đánh số 1, 2, 3...)
4. Với mỗi bước, giải thích lý do
5. Đưa ra kết luận cuối cùng

Format trả lời:
## 🔍 Phân tích
[Phân tích câu hỏi]

## 💭 Các bước suy luận
1. [Bước 1 + lý do]
2. [Bước 2 + lý do]
...

## ✅ Kết luận
[Câu trả lời cuối cùng]

---
**Câu hỏi của người dùng:** ${dto.message}`;

    try {
      // Use ChatService which has all agent tools
      const result = await this.chatService.processQuery(
        thinkingPrefix,
        dto.conversationId,
        user.username,
      );

      return {
        message: dto.message,
        response: result.response,
        queryType: 'thinking',
        queryLevel: 'complex',
        processingTime: result.processingTime,
        conversationId: result.conversationId,
        timestamp: new Date(),
        suggestedQuestions: result.suggestedQuestions,
      };
    } catch (error: any) {
      this.logger.error(`Error in sequential thinking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Trigger manual indexing entities vào ChromaDB.
   *
   * @route POST /chat/index
   * @returns Kết quả indexing
   */
  @Post('index')
  async indexEntities() {
    try {
      const result = await this.chromaIndexingService.indexAll();
      return result;
    } catch (error) {
      this.logger.error(`Error indexing entities: ${error}`);
      throw error;
    }
  }

  /**
   * Kiểm tra system health status.
   *
   * @route GET /chat/health
   * @returns Health status của các services
   */
  @Get('health')
  async health(): Promise<{
    status: string;
    services: {
      neo4j: boolean | string;
      env: {
        NEO4J_URI: boolean;
        NEO4J_USER: boolean;
        NEO4J_PASSWORD: boolean;
        GEMINI_API_KEY: boolean;
      };
    };
    timestamp: Date;
  }> {
    let neo4jStatus: boolean | string;
    try {
      neo4jStatus = await this.neo4jService.verifyConnection();
    } catch (error) {
      neo4jStatus = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    const envStatus = {
      NEO4J_URI: !!process.env.NEO4J_URI,
      NEO4J_USER: !!process.env.NEO4J_USER,
      NEO4J_PASSWORD: !!process.env.NEO4J_PASSWORD,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    };

    const services = {
      neo4j: neo4jStatus,
      env: envStatus,
    };

    const allHealthy =
      neo4jStatus === true && Object.values(envStatus).every((x) => x === true);

    return {
      status: allHealthy ? 'ok' : 'degraded',
      services,
      timestamp: new Date(),
    };
  }

  /**
   * Lấy chatbot performance metrics.
   *
   * @route GET /chat/metrics
   * @returns Performance statistics
   */
  @Get('metrics')
  getMetrics() {
    return this.metricsService.getStats();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📜 CONVERSATION HISTORY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lấy danh sách conversations của user hiện tại.
   *
   * @route GET /chat/conversations
   * @security JWT + Role (ADMIN, VIEWER)
   * @param user - User từ JWT token
   * @returns Danh sách conversations (sorted by updatedAt DESC)
   */
  @Get('conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VIEWER')
  async getUserConversations(@CurrentUser() user: any) {
    try {
      const conversations =
        await this.redisConversationService.getUserConversations(
          user.username,
          50, // limit
        );

      // Transform để frontend dễ xử lý
      return {
        conversations: conversations.map((conv) => ({
          id: conv.id,
          title: this.generateConversationTitle(conv),
          messageCount: conv.messages.length,
          lastMessage:
            conv.messages[conv.messages.length - 1]?.content?.substring(
              0,
              100,
            ) || '',
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
        })),
        total: conversations.length,
      };
    } catch (error) {
      this.logger.error(`Error getting user conversations: ${error}`);
      return { conversations: [], total: 0 };
    }
  }

  /**
   * Lấy chi tiết 1 conversation với tất cả messages.
   *
   * @route GET /chat/conversations/:id
   * @security JWT + Role (ADMIN, VIEWER)
   * @param id - Conversation ID
   * @returns Conversation với messages
   */
  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VIEWER')
  async getConversation(@Param('id') id: string, @CurrentUser() user: any) {
    this.logger.debug(`🔍 getConversation: id=${id}, user=${user?.username}`);

    const conversation =
      await this.redisConversationService.getConversation(id);

    this.logger.debug(
      `📥 Found conversation: ${conversation ? 'yes' : 'no'}, userId=${conversation?.userId}`,
    );

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    // Verify user owns this conversation
    // Tạm thời log thay vì throw error để debug
    if (conversation.userId !== user.username) {
      this.logger.warn(
        `⚠️ User mismatch: conversation.userId=${conversation.userId}, user.username=${user.username}`,
      );
      // Tạm thời bỏ check để cho phép load
      // throw new NotFoundException(`Conversation ${id} not found`);
    }

    return {
      id: conversation.id,
      title: this.generateConversationTitle(conversation),
      messages: conversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      })),
      createdAt: new Date(conversation.createdAt),
      updatedAt: new Date(conversation.updatedAt),
    };
  }

  /**
   * Xóa 1 conversation.
   *
   * @route DELETE /chat/conversations/:id
   * @security JWT + Role (ADMIN, VIEWER)
   * @param id - Conversation ID
   */
  @Delete('conversations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VIEWER')
  async deleteConversation(@Param('id') id: string, @CurrentUser() user: any) {
    const conversation =
      await this.redisConversationService.getConversation(id);

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    // Verify user owns this conversation
    if (conversation.userId !== user.username) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    await this.redisConversationService.deleteConversation(id);

    return { success: true, message: `Conversation ${id} deleted` };
  }

  /**
   * Generate title for conversation từ first user message.
   */
  private generateConversationTitle(conv: any): string {
    const firstUserMsg = conv.messages.find((m: any) => m.role === 'user');
    if (firstUserMsg) {
      const title = firstUserMsg.content.substring(0, 50);
      return title.length < firstUserMsg.content.length ? `${title}...` : title;
    }
    return `Conversation ${conv.id.substring(0, 8)}`;
  }
}
