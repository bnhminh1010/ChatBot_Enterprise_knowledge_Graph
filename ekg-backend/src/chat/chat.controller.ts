import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatQueryDto, ChatResponseDto } from './dto/chat-query.dto';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private chatService: ChatService,
    private neo4jService: Neo4jService,
  ) {}

  /**
   * POST /chat
   * Process user query and return AI response
   */
  @Post()
  async processQuery(@Body() dto: ChatQueryDto): Promise<ChatResponseDto> {
    try {
      const result = await this.chatService.processQuery(dto.message);

      return {
        message: dto.message,
        response: result.response,
        queryType: result.queryType,
        queryLevel: result.queryLevel,
        processingTime: result.processingTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error processing chat query: ${error}`);
      throw error;
    }
  }

  /**
   * POST /chat/index
   * Manually trigger indexing of entities to ChromaDB
   */
  @Post('index')
  async indexEntities(): Promise<{ message: string }> {
    try {
      await this.chatService.indexEntitiesToChromaDB();
      return { message: 'Entities indexed successfully to ChromaDB' };
    } catch (error) {
      this.logger.error(`Error indexing entities: ${error}`);
      throw error;
    }
  }

  /**
   * GET /chat/health
   * Check system health
   */
  @Get('health')
  async health(): Promise<{
    status: string;
    services: Record<string, boolean | string>;
    timestamp: Date;
  }> {
    const services: Record<string, boolean | string> = {};
    
    // Check Neo4j connection
    try {
      const neo4jConnected = await this.neo4jService.verifyConnection();
      services.neo4j = neo4jConnected;
    } catch (error) {
      services.neo4j = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    // Check environment variables
    services.env = {
      NEO4J_URI: !!process.env.NEO4J_URI,
      NEO4J_USER: !!process.env.NEO4J_USER,
      NEO4J_PASSWORD: !!process.env.NEO4J_PASSWORD,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    };

    const allHealthy = Object.values(services).every(
      (v) => v === true || (typeof v === 'object' && Object.values(v).every((x) => x === true))
    );

    return {
      status: allHealthy ? 'ok' : 'degraded',
      services,
      timestamp: new Date(),
    };
  }
}
