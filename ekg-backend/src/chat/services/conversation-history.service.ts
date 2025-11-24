import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../../core/neo4j/neo4j.service';
import { Conversation, Message, ConversationHistory, ConversationContext } from '../interfaces/conversation.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ConversationHistoryService {
  private readonly logger = new Logger(ConversationHistoryService.name);
  private readonly MAX_CONTEXT_MESSAGES = 10; // Số message gần nhất để làm context
  private readonly MAX_CONTEXT_LENGTH = 4000; // Max chars cho context

  constructor(private readonly neo4jService: Neo4jService) {}

  /**
   * Tạo conversation mới
   */
  async createConversation(userId: string, title?: string): Promise<Conversation> {
    const conversationId = `CONV_${uuidv4()}`;
    const now = new Date();

    const cypher = `
      MATCH (u:NguoiDung {username: $userId})
      CREATE (c:Conversation {
        id: $conversationId,
        title: $title,
        createdAt: datetime($createdAt),
        updatedAt: datetime($updatedAt)
      })
      CREATE (u)-[:HAS_CONVERSATION]->(c)
      RETURN c
    `;

    const params = {
      userId,
      conversationId,
      title: title || `Chat ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    try {
      const result = await this.neo4jService.runRaw(cypher, params);
      
      if (result.records.length === 0) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const node = result.records[0].get('c');
      return this.mapNodeToConversation(node);
    } catch (error) {
      this.logger.error(`Failed to create conversation: ${error}`);
      throw error;
    }
  }

  /**
   * Thêm message vào conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: {
      queryType?: string;
      queryLevel?: 'simple' | 'medium' | 'complex';
      processingTime?: number;
    },
  ): Promise<Message> {
    const messageId = `MSG_${uuidv4()}`;
    const now = new Date();

    const cypher = `
      MATCH (c:Conversation {id: $conversationId})
      CREATE (m:Message {
        id: $messageId,
        role: $role,
        content: $content,
        queryType: $queryType,
        queryLevel: $queryLevel,
        processingTime: $processingTime,
        timestamp: datetime($timestamp)
      })
      CREATE (c)-[:HAS_MESSAGE]->(m)
      SET c.updatedAt = datetime($timestamp)
      RETURN m
    `;

    const params = {
      conversationId,
      messageId,
      role,
      content,
      queryType: metadata?.queryType,
      queryLevel: metadata?.queryLevel,
      processingTime: metadata?.processingTime,
      timestamp: now.toISOString(),
    };

    try {
      const result = await this.neo4jService.runRaw(cypher, params);
      
      if (result.records.length === 0) {
        throw new NotFoundException(`Conversation ${conversationId} not found`);
      }

      const node = result.records[0].get('m');
      return this.mapNodeToMessage(node, conversationId);
    } catch (error) {
      this.logger.error(`Failed to add message: ${error}`);
      throw error;
    }
  }

  /**
   * Lấy conversation history
   */
  async getConversationHistory(conversationId: string, limit = 50): Promise<ConversationHistory> {
    const cypher = `
      MATCH (c:Conversation {id: $conversationId})
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
      WITH c, m
      ORDER BY m.timestamp DESC
      LIMIT $limit
      RETURN c, collect(m) as messages
    `;

    const params = { conversationId, limit };

    try {
      const result = await this.neo4jService.runRaw(cypher, params);
      
      if (result.records.length === 0) {
        throw new NotFoundException(`Conversation ${conversationId} not found`);
      }

      const record = result.records[0];
      const conversationNode = record.get('c');
      const messageNodes = record.get('messages');

      const conversation = this.mapNodeToConversation(conversationNode);
      const messages = messageNodes
        .filter((node: any) => node !== null)
        .map((node: any) => this.mapNodeToMessage(node, conversationId))
        .reverse(); // Đảo ngược để messages cũ nhất ở đầu

      return { conversation, messages };
    } catch (error) {
      this.logger.error(`Failed to get conversation history: ${error}`);
      throw error;
    }
  }

  /**
   * Lấy context cho Gemini (recent messages)
   */
  async getConversationContext(conversationId: string): Promise<ConversationContext> {
    try {
      const history = await this.getConversationHistory(conversationId, this.MAX_CONTEXT_MESSAGES);
      
      // Lọc chỉ lấy user và assistant messages (không lấy system messages)
      const recentMessages = history.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-this.MAX_CONTEXT_MESSAGES)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Tính tổng length và truncate nếu cần
      let totalLength = recentMessages.reduce((sum, msg) => sum + msg.content.length, 0);
      
      if (totalLength > this.MAX_CONTEXT_LENGTH) {
        // Remove oldest messages until under limit
        while (totalLength > this.MAX_CONTEXT_LENGTH && recentMessages.length > 2) {
          const removed = recentMessages.shift();
          if (removed) {
            totalLength -= removed.content.length;
          }
        }
      }

      return {
        conversationId,
        recentMessages,
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation context: ${error}`);
      // Nếu lỗi, trả về context rỗng thay vì throw
      return {
        conversationId,
        recentMessages: [],
      };
    }
  }

  /**
   * Lấy tất cả conversations của user
   */
  async getUserConversations(userId: string, limit = 20): Promise<Conversation[]> {
    const cypher = `
      MATCH (u:NguoiDung {username: $userId})-[:HAS_CONVERSATION]->(c:Conversation)
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
      WITH c, count(m) as messageCount
      ORDER BY c.updatedAt DESC
      LIMIT $limit
      RETURN c, messageCount
    `;

    const params = { userId, limit };

    try {
      const result = await this.neo4jService.runRaw(cypher, params);
      
      return result.records.map(record => {
        const conversation = this.mapNodeToConversation(record.get('c'));
        conversation.messageCount = record.get('messageCount')?.toNumber() || 0;
        return conversation;
      });
    } catch (error) {
      this.logger.error(`Failed to get user conversations: ${error}`);
      throw error;
    }
  }

  /**
   * Xóa conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const cypher = `
      MATCH (c:Conversation {id: $conversationId})
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
      DETACH DELETE c, m
      RETURN count(c) as deleted
    `;

    try {
      const result = await this.neo4jService.runRaw(cypher, { conversationId });
      const deleted = result.records[0]?.get('deleted')?.toNumber() || 0;
      return deleted > 0;
    } catch (error) {
      this.logger.error(`Failed to delete conversation: ${error}`);
      throw error;
    }
  }

  /**
   * Helper: Map Neo4j node to Conversation
   */
  private mapNodeToConversation(node: any): Conversation {
    const props = node.properties;
    return {
      id: props.id,
      userId: '', // Will be filled by caller if needed
      title: props.title,
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
    };
  }

  /**
   * Helper: Map Neo4j node to Message
   */
  private mapNodeToMessage(node: any, conversationId: string): Message {
    const props = node.properties;
    return {
      id: props.id,
      conversationId,
      role: props.role,
      content: props.content,
      queryType: props.queryType,
      queryLevel: props.queryLevel,
      processingTime: props.processingTime?.toNumber(),
      timestamp: new Date(props.timestamp),
    };
  }
}
