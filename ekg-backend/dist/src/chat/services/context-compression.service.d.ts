import { GeminiService } from '../../ai/gemini.service';
import { ConversationMessage } from './redis-conversation.service';
export interface CompressedContext {
    summary: string;
    recentMessages: ConversationMessage[];
    keyEntities: ExtractedEntity[];
    tokenEstimate: number;
}
export interface ExtractedEntity {
    type: 'person' | 'department' | 'project' | 'skill' | 'document' | 'date';
    value: string;
    mentions: number;
    lastMentioned: number;
}
export declare class ContextCompressionService {
    private readonly geminiService;
    private readonly logger;
    private readonly RECENT_MESSAGES_COUNT;
    private readonly MAX_CONTEXT_TOKENS;
    private readonly SUMMARY_TRIGGER_COUNT;
    constructor(geminiService: GeminiService);
    compressContext(messages: ConversationMessage[], options?: {
        maxTokens?: number;
        forceRefresh?: boolean;
    }): Promise<CompressedContext>;
    private summarizeMessages;
    private quickSummarize;
    private extractEntities;
    private estimateTokens;
    private estimateStringTokens;
    buildContextPrompt(compressed: CompressedContext): string;
}
