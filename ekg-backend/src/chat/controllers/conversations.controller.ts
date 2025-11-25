import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisConversationService, Conversation } from '../services/redis-conversation.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

/**
 * Controller để quản lý conversation history
 */
@Controller('chat/conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'VIEWER')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(
    private readonly redisConversation: RedisConversationService,
  ) {}

  /**
   * GET /chat/conversations
   * Lấy danh sách tất cả conversations của user hiện tại
   */
  @Get()
  async getUserConversations(
    @CurrentUser() user: any,
  ): Promise<Conversation[]> {
    try {
      const conversations = await this.redisConversation.getUserConversations(
        user.username,
        20, // Limit 20 conversations
      );

      // Thêm title derived từ first message nếu chưa có
      const conversationsWithTitle = conversations.map((conv) => {
        const firstUserMessage = conv.messages.find((m) => m.role === 'user');
        return {
          ...conv,
          title: firstUserMessage
            ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
            : 'New Chat',
        };
      });

      this.logger.log(`Retrieved ${conversationsWithTitle.length} conversations for user ${user.username}`);
      return conversationsWithTitle;
    } catch (error) {
      this.logger.error(`Error getting user conversations: ${error}`);
      throw new HttpException(
        'Failed to retrieve conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /chat/conversations/:id
   * Lấy chi tiết một conversation
   */
  @Get(':id')
  async getConversation(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ): Promise<Conversation> {
    try {
      const conversation = await this.redisConversation.getConversation(conversationId);

      if (!conversation) {
        throw new HttpException(
          'Conversation not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Verify ownership
      if (conversation.userId !== user.username) {
        throw new HttpException(
          'Unauthorized access to conversation',
          HttpStatus.FORBIDDEN,
        );
      }

      this.logger.log(`Retrieved conversation ${conversationId} for user ${user.username}`);
      return conversation;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error getting conversation ${conversationId}: ${error}`);
      throw new HttpException(
        'Failed to retrieve conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /chat/conversations/:id
   * Xóa một conversation
   */
  @Delete(':id')
  async deleteConversation(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    try {
      const conversation = await this.redisConversation.getConversation(conversationId);

      if (!conversation) {
        throw new HttpException(
          'Conversation not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Verify ownership
      if (conversation.userId !== user.username) {
        throw new HttpException(
          'Unauthorized to delete this conversation',
          HttpStatus.FORBIDDEN,
        );
      }

      await this.redisConversation.deleteConversation(conversationId);

      this.logger.log(`Deleted conversation ${conversationId} for user ${user.username}`);
      return {
        message: `Conversation ${conversationId} deleted successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error deleting conversation ${conversationId}: ${error}`);
      throw new HttpException(
        'Failed to delete conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
