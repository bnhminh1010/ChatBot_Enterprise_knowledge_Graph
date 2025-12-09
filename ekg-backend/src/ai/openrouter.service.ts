/**
 * @fileoverview OpenRouter Service - Fallback LLM Provider
 * @module ai/openrouter.service
 *
 * Service tích hợp với OpenRouter.ai làm fallback LLM provider.
 * Hỗ trợ function calling và compatible với Gemini response format.
 *
 * Tính năng:
 * - Function calling (tools)
 * - Conversation history
 * - Rate limit handling
 * - Compatible response format với GeminiService
 *
 * @author APTX3107 Team
 */
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Message format cho OpenRouter API.
 */
interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

/**
 * Tool definition format cho OpenRouter (OpenAI-compatible).
 */
interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

/**
 * Response format - compatible với GeminiService.
 */
interface OpenRouterResponse {
  type: 'text' | 'function_call';
  content?: string;
  functionCalls?: Array<{ name: string; args: any }>;
  rawResponse?: any;
}

/**
 * Service tích hợp với OpenRouter.ai.
 * Sử dụng làm fallback khi Gemini gặp rate limit (429).
 *
 * @example
 * if (openRouterService.isAvailable()) {
 *   const result = await openRouterService.generateResponseWithTools(prompt, tools);
 * }
 */
@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  /** Axios client với base config */
  private client: AxiosInstance;

  /** API key (null nếu chưa config) */
  private apiKey: string | null;

  /** OpenRouter API base URL */
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  /** Model mặc định */
  private readonly defaultModel =
    process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free';

  constructor() {
    this.apiKey = process.env.OPEN_ROUTER_API_KEY || null;

    if (!this.apiKey) {
      this.logger.warn(
        'OPEN_ROUTER_API_KEY not defined - OpenRouter fallback disabled',
      );
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3002',
        'X-Title': 'EKG Chatbot',
      },
    });

    if (this.apiKey) {
      this.logger.log(
        `✅ OpenRouter service initialized with model: ${this.defaultModel}`,
      );
    }
  }

  /**
   * Kiểm tra OpenRouter có khả dụng không (có API key).
   *
   * @returns true nếu có API key
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Tạo response với function calling (tools).
   * Format compatible với GeminiService để dễ dàng switch.
   *
   * @param prompt - Câu hỏi từ user
   * @param tools - Danh sách tools (Gemini format)
   * @param context - System context
   * @param history - Conversation history
   * @returns Response với type 'text' hoặc 'function_call'
   * @throws Error khi rate limit hoặc quota exceeded
   */
  async generateResponseWithTools(
    prompt: string,
    tools: any[],
    context?: string,
    history: Array<{
      role: 'user' | 'assistant' | 'function';
      content: string;
    }> = [],
  ): Promise<OpenRouterResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      // Convert tools to OpenRouter format (OpenAI-compatible)
      const openRouterTools: OpenRouterTool[] = tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      // Build messages array
      const messages: OpenRouterMessage[] = [];

      if (context) {
        messages.push({
          role: 'system',
          content: context,
        });
      }

      for (const msg of history) {
        messages.push({
          role: msg.role === 'function' ? 'tool' : msg.role,
          content: msg.content,
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      // Make API request
      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages,
        tools: openRouterTools.length > 0 ? openRouterTools : undefined,
        tool_choice: openRouterTools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const choice = response.data.choices?.[0];

      if (!choice) {
        throw new Error('Empty response from OpenRouter');
      }

      // Check for tool calls
      if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
        const functionCalls = choice.message.tool_calls.map((tc: any) => ({
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments || '{}'),
        }));

        return {
          type: 'function_call',
          functionCalls,
          rawResponse: response.data,
        };
      }

      return {
        type: 'text',
        content: choice.message?.content || '',
        rawResponse: response.data,
      };
    } catch (error: any) {
      this.logger.error(`OpenRouter API error: ${error.message}`);

      if (
        error.response?.status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('quota') ||
        error.message?.includes('rate limit')
      ) {
        throw new Error(
          `OpenRouter quota exceeded: ${error.response?.data?.error?.message || error.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * Tiếp tục conversation sau khi thực thi tools.
   *
   * @param previousMessages - Messages trước đó
   * @param toolResults - Kết quả từ tool execution
   * @param tools - Danh sách tools (để tiếp tục nếu cần)
   * @returns Response với type 'text' hoặc 'function_call'
   */
  async continueChatWithToolResults(
    previousMessages: OpenRouterMessage[],
    toolResults: Array<{ name: string; result: any; tool_call_id?: string }>,
    tools: any[],
  ): Promise<OpenRouterResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const messages = [...previousMessages];

      // Add tool results
      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          content: JSON.stringify(result.result),
          tool_call_id: result.tool_call_id || result.name,
        });
      }

      // Convert tools to OpenRouter format
      const openRouterTools: OpenRouterTool[] = tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages,
        tools: openRouterTools.length > 0 ? openRouterTools : undefined,
        tool_choice: openRouterTools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const choice = response.data.choices?.[0];

      if (!choice) {
        throw new Error('Empty response from OpenRouter');
      }

      if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
        const functionCalls = choice.message.tool_calls.map((tc: any) => ({
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments || '{}'),
        }));

        return {
          type: 'function_call',
          functionCalls,
          rawResponse: response.data,
        };
      }

      return {
        type: 'text',
        content: choice.message?.content || '',
        rawResponse: response.data,
      };
    } catch (error: any) {
      this.logger.error(`OpenRouter continue chat error: ${error.message}`);

      if (error.response?.status === 429 || error.message?.includes('quota')) {
        throw new Error(`OpenRouter quota exceeded: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Tạo text response đơn giản (không có tools).
   *
   * @param prompt - Prompt cần generate
   * @param context - System context
   * @returns Generated text
   */
  async generateResponse(prompt: string, context?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const messages: OpenRouterMessage[] = [];

      if (context) {
        messages.push({ role: 'system', content: context });
      }

      messages.push({ role: 'user', content: prompt });

      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      return response.data.choices?.[0]?.message?.content || '';
    } catch (error: any) {
      this.logger.error(`OpenRouter generate error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Phân tích ảnh với OpenRouter Vision API.
   * Sử dụng model hỗ trợ vision như llava hoặc gpt-4-vision.
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
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      this.logger.debug(`Analyzing image with OpenRouter Vision: ${mimeType}`);

      // Convert buffer to base64 data URL
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // Use a vision-capable model
      const visionModel = 'google/gemini-flash-1.5'; // Free vision model on OpenRouter

      const response = await this.client.post('/chat/completions', {
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  prompt ||
                  'Mô tả chi tiết nội dung trong ảnh này bằng tiếng Việt.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      });

      const content = response.data.choices?.[0]?.message?.content || '';
      this.logger.debug(
        `OpenRouter Vision analysis completed: ${content.substring(0, 100)}...`,
      );
      return content;
    } catch (error: any) {
      this.logger.error(`OpenRouter Vision error: ${error.message}`);
      throw error;
    }
  }
}
