import { Injectable, Logger } from '@nestjs/common';
import { OllamaService } from '../../ai/ollama.service';
import { ChromaDBService } from '../../ai/chroma-db.service';

@Injectable()
export class OllamaRAGService {
  private readonly logger = new Logger(OllamaRAGService.name);

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
    topK: number = 10,
    conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>,
  ): Promise<string> {
    try {
      // Step 1: Retrieve relevant context from ChromaDB
      const searchResults = await this.chromaDBService.search(
        collectionName,
        query,
        topK,
      );

      if (searchResults.length === 0) {
        return 'Xin lỗi, không tìm thấy thông tin liên quan trong hệ thống.';
      }

      // Step 2: Build context from search results
      const contextText = this.buildContext(searchResults);

      // Step 3: Generate response using Ollama (local LLM)
      const prompt = this.buildPrompt(query, contextText, conversationHistory);
      
      const response = await this.ollamaService.generateResponse(
        prompt,
        'llama3.1', // Fast, good quality
      );

      this.logger.debug(`RAG query completed: ${query.substring(0, 50)}...`);
      
      return response;
    } catch (error) {
      this.logger.error(`RAG query failed: ${error}`);
      
      // Fallback: Return search results directly
      const searchResults = await this.chromaDBService.search(collectionName, query, 5);
      return this.formatSearchResults(searchResults);
    }
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
    conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>
  ): string {
    let prompt = `You are a helpful enterprise assistant for APTX3107 company knowledge system.

CONTEXT FROM DATABASE:
${context}`;

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += `

CONVERSATION HISTORY:
${conversationHistory.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}`;
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

    const items = results.map((r, idx) => {
      const metadata = r.metadata || {};
      return `${idx + 1}. ${metadata.name || 'Unknown'}
   Độ liên quan: ${(r.similarity * 100).toFixed(1)}%
   ${metadata.role ? `Vị trí: ${metadata.role}` : ''}
   ${metadata.department ? `Phòng ban: ${metadata.department}` : ''}`;
    }).join('\n\n');

    return `Tìm thấy ${results.length} kết quả:\n\n${items}`;
  }

  /**
   * Quick health check
   */
  async isAvailable(): Promise<boolean> {
    return await this.ollamaService.isHealthy();
  }
}
