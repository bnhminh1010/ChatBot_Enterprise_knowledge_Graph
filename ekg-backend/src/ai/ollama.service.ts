/**
 * @fileoverview Ollama Service - Local LLM Integration
 * @module ai/ollama.service
 *
 * Service tích hợp với Ollama local LLM server.
 * Cung cấp embeddings và text generation cho fallback hoặc local processing.
 *
 * Tính năng:
 * - Health check server
 * - Model availability check
 * - Embedding generation (cho ChromaDB)
 * - Text generation
 * - Model pulling
 *
 * @author APTX3107 Team
 */
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Response interface cho embedding API.
 */
export interface OllamaEmbeddingResponse {
  embedding: number[];
}

/**
 * Response interface cho generate API.
 */
export interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

/**
 * Service tích hợp với Ollama local LLM.
 * Sử dụng làm fallback khi Gemini không khả dụng.
 *
 * @example
 * if (await ollamaService.isHealthy()) {
 *   const response = await ollamaService.generateResponse(prompt);
 * }
 */
@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);

  /** URL của Ollama server */
  private readonly ollamaUrl: string;

  /** Tên model mặc định */
  private readonly modelName: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'mistral';
  }

  /**
   * Kiểm tra Ollama server có đang chạy không.
   *
   * @returns true nếu server respond, false nếu không
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
   * Kiểm tra model có tồn tại trên server không.
   *
   * @param modelName - Tên model cần kiểm tra (mặc định: config model)
   * @returns true nếu model tồn tại
   */
  async hasModel(modelName: string = this.modelName): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const models = response.data?.models || [];
      return models.some(
        (m: any) => m.name === modelName || m.name.startsWith(modelName + ':'),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Tạo embedding từ text.
   * Sử dụng cho ChromaDB vector storage.
   *
   * @param text - Text cần tạo embedding
   * @param model - Model dùng cho embedding (mặc định: config model)
   * @returns Vector embedding
   * @throws Error nếu không thể tạo embedding
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
   * Sinh text response từ prompt.
   * Sử dụng làm fallback cho complex queries khi Gemini không khả dụng.
   *
   * @param prompt - Prompt cần generate
   * @param model - Model name (mặc định: config model)
   * @param stream - Enable streaming (mặc định: false)
   * @returns Generated text response
   * @throws Error nếu không thể generate
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
   * Pull (download) model từ Ollama registry.
   * Sử dụng để setup model lần đầu.
   *
   * @param modelName - Tên model cần pull (mặc định: config model)
   * @throws Error nếu không thể pull model
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

  /**
   * Phân tích ảnh với Ollama Vision model (llava).
   * Yêu cầu model llava phải được pull trước.
   * 
   * @param imageBuffer - Ảnh dưới dạng buffer
   * @param mimeType - MIME type của ảnh
   * @param prompt - Câu hỏi về ảnh
   * @returns Phân tích từ model
   */
  async analyzeImageWithPrompt(
    imageBuffer: Buffer,
    mimeType: string,
    prompt: string,
  ): Promise<string> {
    try {
      this.logger.debug(`Analyzing image with Ollama Vision (llava): ${mimeType}`);
      
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Use llava model for vision
      const visionModel = 'llava';
      
      // Check if llava is available
      const hasLlava = await this.hasModel(visionModel);
      if (!hasLlava) {
        this.logger.warn('llava model not available, falling back to text description');
        return 'Xin lỗi, model xử lý ảnh (llava) chưa được cài đặt trên server. Vui lòng liên hệ admin.';
      }
      
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.ollamaUrl}/api/generate`,
        {
          model: visionModel,
          prompt: prompt || 'Mô tả chi tiết nội dung trong ảnh này bằng tiếng Việt.',
          images: [base64Image],
          stream: false,
        },
        {
          timeout: 120000, // 2 minutes for image processing
        },
      );

      const content = response.data.response || '';
      this.logger.debug(`Ollama Vision analysis completed: ${content.substring(0, 100)}...`);
      return content;
    } catch (error: any) {
      this.logger.error(`Ollama Vision error: ${error.message}`);
      throw error;
    }
  }
}
