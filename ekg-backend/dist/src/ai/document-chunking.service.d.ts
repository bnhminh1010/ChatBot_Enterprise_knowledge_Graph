export interface ChunkConfig {
    maxTokens: number;
    overlapTokens: number;
    preserveSentences: boolean;
}
export interface DocumentChunk {
    id: string;
    parentId: string;
    content: string;
    position: number;
    metadata: {
        startOffset: number;
        endOffset: number;
        totalChunks: number;
    };
}
export declare class DocumentChunkingService {
    private readonly logger;
    private readonly DEFAULT_CONFIG;
    chunkDocument(documentId: string, content: string, config?: Partial<ChunkConfig>): Promise<DocumentChunk[]>;
    private chunkBySentence;
    private chunkBySection;
    private splitIntoSentences;
    private splitIntoSections;
    private estimateTokenCount;
    private calculateOverlapSentences;
    private isMarkdown;
    chunkDocuments(documents: Array<{
        id: string;
        content: string;
    }>, config?: Partial<ChunkConfig>): Promise<Map<string, DocumentChunk[]>>;
}
