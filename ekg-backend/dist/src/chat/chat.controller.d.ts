import { ChatService } from './chat.service';
import { ChatQueryDto, ChatResponseDto } from './dto/chat-query.dto';
export declare class ChatController {
    private chatService;
    private readonly logger;
    constructor(chatService: ChatService);
    processQuery(dto: ChatQueryDto): Promise<ChatResponseDto>;
    indexEntities(): Promise<{
        message: string;
    }>;
    health(): Promise<{
        status: string;
        services: Record<string, boolean>;
    }>;
}
