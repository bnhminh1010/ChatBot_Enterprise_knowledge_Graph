import { Injectable, Logger } from '@nestjs/common';

export interface ChunkConfig {
  maxTokens: number; // 512 tokens per chunk
  overlapTokens: number; // 50 tokens overlap
  preserveSentences: boolean; // không cắt giữa câu
}

export interface DocumentChunk {
  id: string; // doc-001-chunk-1
  parentId: string; // doc-001
  content: string;
  position: number; // chunk index
  metadata: {
    startOffset: number;
    endOffset: number;
    totalChunks: number;
  };
}

/**
 * Document Chunking Service
 * Tách documents thành chunks nhỏ hơn để embedding hiệu quả hơn
 */
@Injectable()
export class DocumentChunkingService {
  private readonly logger = new Logger(DocumentChunkingService.name);

  private readonly DEFAULT_CONFIG: ChunkConfig = {
    maxTokens: parseInt(process.env.RAG_CHUNK_SIZE || '512'),
    overlapTokens: parseInt(process.env.RAG_CHUNK_OVERLAP || '50'),
    preserveSentences: true,
  };

  /**
   * Chunk document thành các phần nhỏ hơn
   */
  async chunkDocument(
    documentId: string,
    content: string,
    config?: Partial<ChunkConfig>,
  ): Promise<DocumentChunk[]> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      // Choose chunking strategy based on content type
      if (this.isMarkdown(content)) {
        return this.chunkBySection(documentId, content, finalConfig);
      } else {
        return this.chunkBySentence(documentId, content, finalConfig);
      }
    } catch (error) {
      this.logger.error(`Failed to chunk document ${documentId}: ${error}`);
      // Fallback: return entire document as single chunk
      return [
        {
          id: `${documentId}-chunk-1`,
          parentId: documentId,
          content,
          position: 0,
          metadata: {
            startOffset: 0,
            endOffset: content.length,
            totalChunks: 1,
          },
        },
      ];
    }
  }

  /**
   * Chunk by sentences with sliding window
   */
  private chunkBySentence(
    documentId: string,
    content: string,
    config: ChunkConfig,
  ): DocumentChunk[] {
    const sentences = this.splitIntoSentences(content);
    const chunks: DocumentChunk[] = [];

    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    let chunkIndex = 0;
    let startOffset = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.estimateTokenCount(sentence);

      // If adding this sentence exceeds maxTokens, save current chunk
      if (
        currentTokenCount + sentenceTokens > config.maxTokens &&
        currentChunk.length > 0
      ) {
        const chunkContent = currentChunk.join(' ');
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex + 1}`,
          parentId: documentId,
          content: chunkContent,
          position: chunkIndex,
          metadata: {
            startOffset,
            endOffset: startOffset + chunkContent.length,
            totalChunks: 0, // Will update later
          },
        });

        // Sliding window: keep last few sentences for overlap
        const overlapSentenceCount = this.calculateOverlapSentences(
          currentChunk,
          config.overlapTokens,
        );
        currentChunk = currentChunk.slice(-overlapSentenceCount);
        currentTokenCount = this.estimateTokenCount(currentChunk.join(' '));

        chunkIndex++;
        startOffset += chunkContent.length - currentTokenCount;
      }

      currentChunk.push(sentence);
      currentTokenCount += sentenceTokens;
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      chunks.push({
        id: `${documentId}-chunk-${chunkIndex + 1}`,
        parentId: documentId,
        content: chunkContent,
        position: chunkIndex,
        metadata: {
          startOffset,
          endOffset: startOffset + chunkContent.length,
          totalChunks: 0,
        },
      });
    }

    // Update totalChunks in metadata
    const totalChunks = chunks.length;
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = totalChunks;
    });

    this.logger.debug(
      `Chunked document ${documentId} into ${totalChunks} chunks`,
    );
    return chunks;
  }

  /**
   * Chunk by sections (for markdown/structured documents)
   */
  private chunkBySection(
    documentId: string,
    content: string,
    config: ChunkConfig,
  ): DocumentChunk[] {
    const sections = this.splitIntoSections(content);
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      const sectionTokens = this.estimateTokenCount(section);

      if (sectionTokens <= config.maxTokens) {
        // Section fits in one chunk
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex + 1}`,
          parentId: documentId,
          content: section,
          position: chunkIndex,
          metadata: {
            startOffset: 0,
            endOffset: section.length,
            totalChunks: 0,
          },
        });
        chunkIndex++;
      } else {
        // Section too large, split by sentences
        const sectionChunks = this.chunkBySentence(
          `${documentId}-section-${chunkIndex}`,
          section,
          config,
        );
        chunks.push(...sectionChunks);
        chunkIndex += sectionChunks.length;
      }
    }

    // Update totalChunks
    const totalChunks = chunks.length;
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = totalChunks;
    });

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be improved with NLP library)
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Split markdown into sections by headers
   */
  private splitIntoSections(markdown: string): string[] {
    const sections: string[] = [];
    const lines = markdown.split('\n');
    let currentSection: string[] = [];

    for (const line of lines) {
      if (line.match(/^#{1,6}\s/)) {
        // Header line - start new section
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
          currentSection = [];
        }
      }
      currentSection.push(line);
    }

    // Add final section
    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }

    return sections.filter((s) => s.trim().length > 0);
  }

  /**
   * Estimate token count (rough approximation)
   * Real tokenization would use tiktoken or similar
   */
  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English
    // Vietnamese might be different, but this is good enough
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate how many sentences to keep for overlap
   */
  private calculateOverlapSentences(
    sentences: string[],
    targetOverlapTokens: number,
  ): number {
    let tokenCount = 0;
    let sentenceCount = 0;

    // Count from the end
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentenceTokens = this.estimateTokenCount(sentences[i]);
      if (tokenCount + sentenceTokens > targetOverlapTokens) {
        break;
      }
      tokenCount += sentenceTokens;
      sentenceCount++;
    }

    return sentenceCount;
  }

  /**
   * Check if content is markdown
   */
  private isMarkdown(content: string): boolean {
    // Simple heuristic: check for markdown headers
    return /^#{1,6}\s/m.test(content);
  }

  /**
   * Batch chunk multiple documents
   */
  async chunkDocuments(
    documents: Array<{ id: string; content: string }>,
    config?: Partial<ChunkConfig>,
  ): Promise<Map<string, DocumentChunk[]>> {
    const results = new Map<string, DocumentChunk[]>();

    for (const doc of documents) {
      const chunks = await this.chunkDocument(doc.id, doc.content, config);
      results.set(doc.id, chunks);
    }

    return results;
  }
}
