import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MetricsService } from './services/metrics.service';
import { ChatQueryDto, ChatResponseDto } from './dto/chat-query.dto';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private chatService: ChatService,
    private metricsService: MetricsService,
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
    // Check Neo4j connection
    let neo4jStatus: boolean | string;
    try {
      neo4jStatus = await this.neo4jService.verifyConnection();
    } catch (error) {
      neo4jStatus = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    // Check environment variables
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
      neo4jStatus === true &&
      Object.values(envStatus).every((x) => x === true);

    return {
      status: allHealthy ? 'ok' : 'degraded',
      services,
      timestamp: new Date(),
    };
  }

  /**
   * GET /chat/metrics
   * Get chatbot performance metrics
   */
  @Get('metrics')
  getMetrics() {
    return this.metricsService.getStats();
  }
}
