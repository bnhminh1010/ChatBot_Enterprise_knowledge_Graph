import { Injectable, Logger } from '@nestjs/common';
import { OllamaService } from '../../ai/ollama.service';
import { ChromaDBService, SearchResult } from '../../ai/chroma-db.service';

interface RerankItem extends SearchResult {
  rerankScore: number;
}

@Injectable()
export class OllamaRAGService {
  private readonly logger = new Logger(OllamaRAGService.name);

  // Configuration from environment
  private readonly TOP_K_CANDIDATES = parseInt(
    process.env.RAG_TOP_K_CANDIDATES || '20',
  );
  private readonly TOP_K_FINAL = parseInt(process.env.RAG_TOP_K_FINAL || '5');
  private readonly VECTOR_WEIGHT = parseFloat(
    process.env.HYBRID_VECTOR_WEIGHT || '0.7',
  );
  private readonly KEYWORD_WEIGHT = parseFloat(
    process.env.HYBRID_KEYWORD_WEIGHT || '0.3',
  );

  constructor(
    private ollamaService: OllamaService,
    private chromaDBService: ChromaDBService,
  ) {}

  /**
   * RAG query using Ollama for medium-complexity queries
   * Faster and FREE alternative to Gemini
   */
  async queryWithRAG(
    query: string,
    collectionName: string = 'employees',
    topK?: number,
    conversationHistory?: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>,
  ): Promise<string> {
    try {
      // Stage 1: Hybrid search to get top-K candidates
      this.logger.debug(
        `Stage 1: Hybrid search for top-${this.TOP_K_CANDIDATES} candidates`,
      );
      const candidates = await this.chromaDBService.hybridSearch(
        collectionName,
        query,
        this.TOP_K_CANDIDATES,
        {
          vectorWeight: this.VECTOR_WEIGHT,
          keywordWeight: this.KEYWORD_WEIGHT,
        },
      );

      if (candidates.length === 0) {
        return 'Xin lỗi, không tìm thấy thông tin liên quan trong hệ thống.';
      }

      // Stage 2: Re-rank based on context relevance
      this.logger.debug('Stage 2: Re-ranking candidates');
      const reranked = this.rerankResults(
        candidates,
        query,
        conversationHistory,
      );

      // Stage 3: Diversity filtering to avoid redundant info
      this.logger.debug('Stage 3: Diversity filtering');
      const diverse = this.diversityFilter(reranked, topK || this.TOP_K_FINAL);

      // Stage 4: Build context and generate response
      this.logger.debug('Stage 4: Generating response');
      const contextText = this.buildContext(diverse);
      const prompt = this.buildPrompt(query, contextText, conversationHistory);

      const response = await this.ollamaService.generateResponse(
        prompt,
        'qwen2.5:7b',
      );

      this.logger.debug(
        `RAG completed: ${diverse.length} contexts used for "${query.substring(0, 40)}..."`,
      );

      return response;
    } catch (error) {
      this.logger.error(`RAG query failed: ${error}`);

      // Fallback: Return search results directly
      const searchResults = await this.chromaDBService.search(
        collectionName,
        query,
        5,
      );
      return this.formatSearchResults(searchResults);
    }
  }

  /**
   * Re-rank results based on multiple factors
   */
  private rerankResults(
    results: SearchResult[],
    query: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): RerankItem[] {
    const queryLower = query.toLowerCase();
    const queryKeywords = queryLower.split(/\s+/);

    return results
      .map((result) => {
        let rerankScore = result.similarity; // Base score from hybrid search

        // Factor 1: Keyword overlap bonus
        const contentLower = result.content.toLowerCase();
        const keywordMatches = queryKeywords.filter((kw) =>
          contentLower.includes(kw),
        ).length;
        const keywordBonus = (keywordMatches / queryKeywords.length) * 0.1;
        rerankScore += keywordBonus;

        // Factor 2: Recency bias (if metadata has timestamp)
        if (result.metadata.timestamp) {
          const age =
            Date.now() - new Date(result.metadata.timestamp).getTime();
          const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
          // Boost recent items (exponential decay)
          const recencyBonus = Math.exp(-daysSinceUpdate / 365) * 0.05;
          rerankScore += recencyBonus;
        }

        // Factor 3: Context relevance (check against conversation history)
        if (conversationHistory && conversationHistory.length > 0) {
          const historyText = conversationHistory
            .map((h) => h.content)
            .join(' ')
            .toLowerCase();
          const contextKeywords = historyText.split(/\s+/);
          const contextMatches = contextKeywords.filter((kw) =>
            contentLower.includes(kw),
          ).length;
          if (contextMatches > 0) {
            rerankScore += 0.05;
          }
        }

        return {
          ...result,
          rerankScore,
        };
      })
      .sort((a, b) => b.rerankScore - a.rerankScore);
  }

  /**
   * Diversity filtering to avoid redundant information
   */
  private diversityFilter(results: RerankItem[], topK: number): SearchResult[] {
    if (results.length <= topK) {
      return results;
    }

    const selected: RerankItem[] = [];
    const remaining = [...results];

    // Always select top result
    selected.push(remaining.shift()!);

    // Select diverse results
    while (selected.length < topK && remaining.length > 0) {
      let maxDiversity = -1;
      let maxIndex = 0;

      // Find result most dissimilar to already selected ones
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        let minSimilarity = 1.0;

        // Calculate min similarity to selected items
        for (const selectedItem of selected) {
          const similarity = this.textSimilarity(
            candidate.content,
            selectedItem.content,
          );
          minSimilarity = Math.min(minSimilarity, similarity);
        }

        // Combined score: rerank score + diversity bonus
        const diversityScore =
          candidate.rerankScore * 0.7 + (1 - minSimilarity) * 0.3;

        if (diversityScore > maxDiversity) {
          maxDiversity = diversityScore;
          maxIndex = i;
        }
      }

      selected.push(remaining.splice(maxIndex, 1)[0]);
    }

    return selected;
  }

  /**
   * Simple text similarity (Jaccard index on words)
   */
  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word)),
    );
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Build context from ChromaDB search results
   */
  private buildContext(results: any[]): string {
    return results
      .map((result, idx) => {
        const metadata = result.metadata || {};
        return `[${idx + 1}] ${result.content}
Relevance: ${(result.similarity * 100).toFixed(1)}%
${metadata.name ? `Name: ${metadata.name}` : ''}
${metadata.skills ? `Skills: ${metadata.skills.join(', ')}` : ''}
${metadata.department ? `Department: ${metadata.department}` : ''}`;
      })
      .join('\n\n');
  }

  /**
   * Build prompt for Ollama WITH conversation history
   */
  private buildPrompt(
    query: string,
    context: string,
    conversationHistory?: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>,
  ): string {
    let prompt = `You are a helpful enterprise assistant for APTX3107 company knowledge system.

CONTEXT FROM DATABASE:
${context}`;

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += `

CONVERSATION HISTORY:
${conversationHistory.map((h) => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}`;
    }

    prompt += `

USER QUESTION:
${query}

INSTRUCTIONS:
1. Answer the question based on the context AND conversation history
2. If referring to previous answers, be specific
3. If the context doesn't contain relevant information, say "Không tìm thấy thông tin"
4. Be concise and professional in Vietnamese
5. Format your answer with bullet points when listing items
6. Include relevant names, IDs, or numbers from the context

ANSWER (in Vietnamese):`;

    return prompt;
  }

  /**
   * Fallback: Format search results directly
   */
  private formatSearchResults(results: any[]): string {
    if (results.length === 0) {
      return 'Không tìm thấy kết quả phù hợp.';
    }

    const items = results
      .map((r, idx) => {
        const metadata = r.metadata || {};
        return `${idx + 1}. ${metadata.name || 'Unknown'}
   Độ liên quan: ${(r.similarity * 100).toFixed(1)}%
   ${metadata.role ? `Vị trí: ${metadata.role}` : ''}
   ${metadata.department ? `Phòng ban: ${metadata.department}` : ''}`;
      })
      .join('\n\n');

    return `Tìm thấy ${results.length} kết quả:\n\n${items}`;
  }

  /**
   * Quick health check
   */
  async isAvailable(): Promise<boolean> {
    return await this.ollamaService.isHealthy();
  }
}
