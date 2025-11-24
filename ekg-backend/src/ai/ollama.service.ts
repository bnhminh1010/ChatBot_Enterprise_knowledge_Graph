import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;
  private readonly modelName: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'mistral';
  }

  /**
   * Kiểm tra Ollama server có chạy không
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.warn('Ollama server is not responding');
      return false;
    }
  }

  /**
   * Kiểm tra model có tồn tại không
   */
  async hasModel(modelName: string = this.modelName): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const models = response.data?.models || [];
      return models.some(
        (m: any) =>
          m.name === modelName || m.name.startsWith(modelName + ':'),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Tạo embedding từ text (dùng cho ChromaDB)
   * @param text - Text cần tạo embedding
   * @param model - Model dùng cho embedding (mặc định là modelName)
   */
  async generateEmbedding(
    text: string,
    model: string = this.modelName,
  ): Promise<number[]> {
    try {
      const response = await axios.post<OllamaEmbeddingResponse>(
        `${this.ollamaUrl}/api/embeddings`,
        {
          model,
          prompt: text,
        },
        {
          timeout: 30000,
        },
      );

      return response.data.embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error}`);
      throw new Error('Failed to generate embedding from Ollama');
    }
  }

  /**
   * Sinh response từ prompt (dùng cho complex queries)
   * Lưu ý: Đây chỉ dùng cho fallback, thường dùng Gemini cho quality tốt hơn
   */
  async generateResponse(
    prompt: string,
    model: string = this.modelName,
    stream: boolean = false,
  ): Promise<string> {
    try {
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.ollamaUrl}/api/generate`,
        {
          model,
          prompt,
          stream,
        },
        {
          timeout: 60000,
        },
      );

      return response.data.response;
    } catch (error) {
      this.logger.error(`Failed to generate response: ${error}`);
      throw new Error('Failed to generate response from Ollama');
    }
  }

  /**
   * Pull (download) model từ Ollama registry
   * Dùng để setup model lần đầu
   */
  async pullModel(modelName: string = this.modelName): Promise<void> {
    try {
      this.logger.log(`Pulling model: ${modelName}...`);
      await axios.post(
        `${this.ollamaUrl}/api/pull`,
        {
          name: modelName,
          stream: false,
        },
        {
          timeout: 600000, // 10 minutes
        },
      );
      this.logger.log(`Model ${modelName} pulled successfully`);
    } catch (error) {
      this.logger.error(`Failed to pull model: ${error}`);
      throw new Error(`Failed to pull model ${modelName}`);
    }
  }
}
