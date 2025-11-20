import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private client: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    // Sử dụng model mới nhất: gemini-1.5-flash (nhanh) hoặc gemini-1.5-pro (chất lượng cao)
    // gemini-pro đã bị deprecated, nên dùng gemini-1.5-flash hoặc gemini-1.5-pro
    // gemini-2.0-flash-lite có thể chưa available, nên có fallback
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    
    this.client = new GoogleGenerativeAI(apiKey);
    try {
      this.model = this.client.getGenerativeModel({ model: modelName });
      this.logger.log(`Gemini service initialized with model: ${modelName}`);
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      this.logger.error(`Failed to initialize Gemini model "${modelName}": ${errorMsg}`);
      
      // Nếu model không tồn tại, thử fallback
      if (errorMsg.includes('not found') || errorMsg.includes('404') || errorMsg.includes('invalid')) {
        const fallbackModel = 'gemini-1.5-flash';
        this.logger.warn(`Trying fallback model: ${fallbackModel}`);
        try {
          this.model = this.client.getGenerativeModel({ model: fallbackModel });
          this.logger.log(`Gemini service initialized with fallback model: ${fallbackModel}`);
        } catch (fallbackError) {
          throw new Error(`Failed to initialize Gemini with both ${modelName} and ${fallbackModel}: ${errorMsg}`);
        }
      } else {
        throw new Error(`Failed to initialize Gemini model: ${errorMsg}`);
      }
    }
  }

  /**
   * Generate response từ Gemini cho complex queries
   */
  async generateResponse(
    prompt: string,
    context?: string,
  ): Promise<string> {
    try {
      const fullPrompt = context
        ? `${context}\n\nQuestion: ${prompt}`
        : prompt;

      const result = await this.model.generateContent(fullPrompt);
      
      if (!result || !result.response) {
        throw new Error('Invalid response from Gemini API: response is null or undefined');
      }

      const response = result.response;
      
      // Kiểm tra xem response có method text() không
      if (typeof response.text !== 'function') {
        this.logger.error('Response object structure:', {
          response: response,
          keys: Object.keys(response),
        });
        throw new Error('Response.text() is not a function. Response structure may have changed.');
      }

      const text = await response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }

      return text;
    } catch (error: any) {
      // Log chi tiết lỗi để debug
      const errorMessage = error?.message || 'Unknown error';
      const errorStatus = error?.status || error?.response?.status || error?.code;
      const errorDetails = error?.response?.data || error?.cause || error?.errorDetails;
      
      this.logger.error(`Failed to generate response from Gemini: ${errorMessage}`, {
        status: errorStatus,
        details: errorDetails,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite',
        stack: error?.stack,
      });
      
      // Trả về thông báo lỗi chi tiết hơn
      if (errorStatus === 400 || errorMessage.includes('400')) {
        throw new Error(`Gemini API Error: Invalid request. Model "${process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite'}" may not be available. ${errorMessage}`);
      } else if (errorStatus === 401 || errorStatus === 403 || errorMessage.includes('401') || errorMessage.includes('403')) {
        throw new Error(`Gemini API Error: Authentication failed. Please check your API key. ${errorMessage}`);
      } else if (errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('not found')) {
        throw new Error(`Gemini API Error: Model "${process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite'}" not found. Please check model name. ${errorMessage}`);
      } else if (errorStatus === 429 || errorMessage.includes('429')) {
        throw new Error(`Gemini API Error: Rate limit exceeded. Please try again later.`);
      } else if (errorStatus === 500 || errorMessage.includes('500')) {
        throw new Error(`Gemini API Error: Internal server error. Please try again later.`);
      } else {
        throw new Error(`Failed to generate response from Gemini API: ${errorMessage}`);
      }
    }
  }

  /**
   * Chat conversation (stateful)
   */
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    try {
      const chat = this.model.startChat({
        history: messages.slice(0, -1).map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      return response.text();
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const errorStatus = error?.status || error?.response?.status;
      
      this.logger.error(`Failed to chat with Gemini: ${errorMessage}`, {
        status: errorStatus,
        details: error?.response?.data || error?.cause,
      });
      
      if (errorStatus === 401 || errorStatus === 403) {
        throw new Error(`Gemini API Error: Authentication failed. Please check your API key. ${errorMessage}`);
      }
      throw new Error(`Failed to chat with Gemini API: ${errorMessage}`);
    }
  }

  /**
   * Streaming response từ Gemini
   */
  async streamResponse(prompt: string, context?: string) {
    try {
      const fullPrompt = context
        ? `${context}\n\nQuestion: ${prompt}`
        : prompt;

      const stream = await this.model.generateContentStream(fullPrompt);
      return stream;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const errorStatus = error?.status || error?.response?.status;
      
      this.logger.error(`Failed to stream response from Gemini: ${errorMessage}`, {
        status: errorStatus,
        details: error?.response?.data || error?.cause,
      });
      
      if (errorStatus === 401 || errorStatus === 403) {
        throw new Error(`Gemini API Error: Authentication failed. Please check your API key. ${errorMessage}`);
      }
      throw new Error(`Failed to stream response from Gemini API: ${errorMessage}`);
    }
  }

  /**
   * Extract information từ text (dùng cho structured data extraction)
   */
  async extractInfo(
    text: string,
    schema: string,
  ): Promise<Record<string, any>> {
    try {
      const prompt = `Extract information from the following text and return as JSON matching this schema:
${schema}

Text to extract from:
${text}

Return only valid JSON.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Could not extract JSON from response');
    } catch (error) {
      this.logger.error(`Failed to extract info from Gemini: ${error}`);
      throw error;
    }
  }

  /**
   * Classify text (dùng cho intent detection, sentiment, etc.)
   */
  async classify(text: string, categories: string[]): Promise<string> {
    try {
      const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}

Text: "${text}"

Return only the category name.`;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      this.logger.error(`Failed to classify text with Gemini: ${error}`);
      throw error;
    }
  }

  /**
   * Summarize text
   */
  async summarize(text: string, maxLength: number = 100): Promise<string> {
    try {
      const prompt = `Summarize the following text in maximum ${maxLength} characters:

${text}`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error(`Failed to summarize text with Gemini: ${error}`);
      throw error;
    }
  }
}
