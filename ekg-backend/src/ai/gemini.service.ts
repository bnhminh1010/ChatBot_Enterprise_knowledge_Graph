/**
 * @fileoverview Gemini AI Service - Integration với Google Generative AI
 * @module ai/gemini.service
 * 
 * Service này cung cấp các phương thức để tương tác với Google Gemini API:
 * - generateResponse: Tạo response từ prompt đơn giản
 * - generateResponseWithHistory: Tạo response với conversation history
 * - generateResponseWithTools: Function calling với tools
 * - continueChatWithToolResults: Tiếp tục chat sau khi thực thi tools
 * - streamResponse: Streaming response
 * - extractInfo: Trích xuất thông tin từ text
 * - classify: Phân loại text
 * - summarize: Tóm tắt text
 * 
 * @requires @google/generative-ai
 * @author APTX3107 Team
 */
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Service tích hợp với Google Gemini AI.
 * Hỗ trợ function calling, conversation history, và streaming.
 * 
 * @example
 * // Basic usage
 * const response = await geminiService.generateResponse('Hello');
 * 
 * @example
 * // With tools (function calling)
 * const result = await geminiService.generateResponseWithTools(prompt, tools, context);
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  
  /** Model mặc định khi không có config từ env */
  private readonly DEFAULT_MODEL = 'gemini-2.5-pro';
  
  /** Google Generative AI client instance */
  private client: GoogleGenerativeAI;
  
  /** Model instance đang được sử dụng */
  private model: any;
  
  /** Tên model đang active (có thể khác DEFAULT_MODEL nếu fallback) */
  private activeModelName: string;

  /**
   * Khởi tạo Gemini client và model.
   * Tự động fallback sang DEFAULT_MODEL nếu model được chỉ định không tồn tại.
   * 
   * @throws {Error} Nếu GEMINI_API_KEY không được định nghĩa
   * @throws {Error} Nếu không thể khởi tạo model (cả primary và fallback)
   */
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    // Sử dụng gemini-2.5-flash (or from env)
    const modelName = process.env.GEMINI_MODEL || this.DEFAULT_MODEL;
    this.activeModelName = modelName;

    this.client = new GoogleGenerativeAI(apiKey);
    try {
      this.model = this.client.getGenerativeModel({ model: modelName });
      this.logger.log(`Gemini service initialized with model: ${this.activeModelName}`);
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      this.logger.error(
        `Failed to initialize Gemini model "${modelName}": ${errorMsg}`,
      );

      // Nếu model không tồn tại, thử fallback
      if (
        errorMsg.includes('not found') ||
        errorMsg.includes('404') ||
        errorMsg.includes('invalid')
      ) {
        const fallbackModel = this.DEFAULT_MODEL;
        this.logger.warn(`Trying fallback model: ${fallbackModel}`);
        try {
          this.model = this.client.getGenerativeModel({ model: fallbackModel });
          this.activeModelName = fallbackModel;
          this.logger.log(
            `Gemini service initialized with fallback model: ${this.activeModelName}`,
          );
        } catch (fallbackError) {
          throw new Error(
            `Failed to initialize Gemini with both ${modelName} and ${fallbackModel}: ${errorMsg}`,
          );
        }
      } else {
        throw new Error(`Failed to initialize Gemini model: ${errorMsg}`);
      }
    }
  }

  /**
   * Tạo response từ Gemini cho các query phức tạp.
   * Phương thức cơ bản nhất để gọi Gemini API.
   * 
   * @param {string} prompt - Câu hỏi hoặc prompt cần xử lý
   * @param {string} [context] - Context bổ sung (system prompt, background info)
   * @returns {Promise<string>} Response text từ Gemini
   * @throws {Error} Gemini API errors với mã lỗi cụ thể (400, 401, 404, 429, 500)
   * 
   * @example
   * const response = await geminiService.generateResponse(
   *   'Ai là manager của dự án APTX?',
   *   'Bạn là trợ lý AI cho hệ thống quản lý nhân sự'
   * );
   */
  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      const fullPrompt = context ? `${context}\n\nQuestion: ${prompt}` : prompt;

      const result = await this.model.generateContent(fullPrompt);

      if (!result || !result.response) {
        throw new Error(
          'Invalid response from Gemini API: response is null or undefined',
        );
      }

      const response = result.response;

      // Kiểm tra xem response có method text() không
      if (typeof response.text !== 'function') {
        this.logger.error('Response object structure:', {
          response: response,
          keys: Object.keys(response),
        });
        throw new Error(
          'Response.text() is not a function. Response structure may have changed.',
        );
      }

      const text = await response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }

      return text;
    } catch (error: any) {
      // Log chi tiết lỗi để debug
      const errorMessage = error?.message || 'Unknown error';
      const errorStatus =
        error?.status || error?.response?.status || error?.code;
      const errorDetails =
        error?.response?.data || error?.cause || error?.errorDetails;

      this.logger.error(
        `Failed to generate response from Gemini: ${errorMessage}`,
        {
          status: errorStatus,
          details: errorDetails,
          model: this.activeModelName,
          stack: error?.stack,
        },
      );

      // Trả về thông báo lỗi chi tiết hơn
      if (errorStatus === 400 || errorMessage.includes('400')) {
        throw new Error(
          `Gemini API Error: Invalid request. Model "${this.activeModelName}" may not be available. ${errorMessage}`,
        );
      } else if (
        errorStatus === 401 ||
        errorStatus === 403 ||
        errorMessage.includes('401') ||
        errorMessage.includes('403')
      ) {
        throw new Error(
          `Gemini API Error: Authentication failed. Please check your API key. ${errorMessage}`,
        );
      } else if (
        errorStatus === 404 ||
        errorMessage.includes('404') ||
        errorMessage.includes('not found')
      ) {
        throw new Error(
          `Gemini API Error: Model "${this.activeModelName}" not found. Please check model name. ${errorMessage}`,
        );
      } else if (errorStatus === 429 || errorMessage.includes('429')) {
        throw new Error(
          `Gemini API Error: Rate limit exceeded. Please try again later.`,
        );
      } else if (errorStatus === 500 || errorMessage.includes('500')) {
        throw new Error(
          `Gemini API Error: Internal server error. Please try again later.`,
        );
      } else {
        throw new Error(
          `Failed to generate response from Gemini API: ${errorMessage}`,
        );
      }
    }
  }

  /**
   * Wrapper để phân loại query.
   * Sử dụng bởi GeminiQueryClassifierService để xác định loại câu hỏi.
   * 
   * @param {string} prompt - Prompt chứa query cần phân loại
   * @returns {Promise<string>} Kết quả phân loại từ Gemini
   */
  async classifyQuery(prompt: string): Promise<string> {
    return this.generateResponse(prompt);
  }

  /**
   * Tạo response với conversation history.
   * Sử dụng Gemini Chat API để duy trì context qua nhiều lượt họi thoại.
   * Tối ưu cho enterprise chatbot với Vietnamese system prompt.
   * 
   * @param {string} currentMessage - Tin nhắn hiện tại cần trả lời
   * @param {Array<{role: 'user'|'assistant', content: string}>} conversationHistory - Lịch sử hội thoại
   * @param {string} [databaseContext] - Dữ liệu context từ database (Neo4j query results)
   * @returns {Promise<string>} Response text
   * 
   * @example
   * const response = await geminiService.generateResponseWithHistory(
   *   'Nhân viên nào biết React?',
   *   [{ role: 'user', content: 'Xin chào' }, { role: 'assistant', content: 'Chào bạn!' }],
   *   'Dữ liệu nhân viên: ...'
   * );
   */
  async generateResponseWithHistory(
    currentMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    databaseContext?: string,
  ): Promise<string> {
    try {
      // Tạo enhanced system prompt cho enterprise chatbot
      const systemPrompt = `Bạn là trợ lý AI thông minh cho hệ thống quản lý doanh nghiệp APTX3107.

**Vai trò của bạn:**
- Hỗ trợ tra cứu thông tin về nhân viên, phòng ban, dự án, kỹ năng, và tài liệu nội bộ
- Phân tích và cung cấp insights về tổ chức doanh nghiệp
- Trả lời các câu hỏi phức tạp dựa trên Enterprise Knowledge Graph (Neo4j)

**Hướng dẫn trả lời:**
1. **Ngôn ngữ:** Luôn trả lời bằng tiếng Việt chuyên nghiệp, rõ ràng
2. **Context awareness:** Sử dụng lịch sử hội thoại để hiểu đúng ngữ cảnh câu hỏi
3. **Độ chính xác:** Chỉ trả lời dựa trên dữ liệu có sẵn, nếu không chắc chắn thì nói rõ
4. **Format:** Sử dụng bullet points, numbering khi liệt kê; format rõ ràng và dễ đọc
5. **Liên kết:** Khi đề cập đến thực thể (nhân viên, phòng ban, dự án), nêu rõ tên và mã ID nếu có

**Lưu ý quan trọng:**
- Đây là hệ thống nội bộ doanh nghiệp, tôn trọng quyền riêng tư và phân quyền
- Không bịa đặt thông tin không có trong dữ liệu
- Nếu câu hỏi không liên quan đến dữ liệu doanh nghiệp, lịch sự từ chối và hướng dẫn sử dụng đúng`;

      // Build conversation history cho Gemini
      const messages = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
          role: 'model',
          parts: [
            {
              text: 'Tôi hiểu. Tôi sẽ hỗ trợ bạn tra cứu thông tin doanh nghiệp một cách chính xác và chuyên nghiệp.',
            },
          ],
        },
      ];

      // Thêm conversation history
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }

      // Tạo full prompt cho current message
      let fullPrompt = currentMessage;

      if (databaseContext) {
        fullPrompt = `${databaseContext}\n\n---\nCâu hỏi: ${currentMessage}`;
      }

      // Sử dụng chat API với history
      const chat = this.model.startChat({
        history: messages,
        generationConfig: {
          temperature: 0.7, // Balanced creativity và accuracy
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const result = await chat.sendMessage(fullPrompt);
      const response = result.response;
      return response.text();
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(
        `Failed to generate response with history: ${errorMessage}`,
      );

      // Fallback to simple generateResponse if history approach fails
      this.logger.warn('Falling back to simple generateResponse...');
      return this.generateResponse(currentMessage, databaseContext);
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
        throw new Error(
          `Gemini API Error: Authentication failed. Please check your API key. ${errorMessage}`,
        );
      }
      throw new Error(`Failed to chat with Gemini API: ${errorMessage}`);
    }
  }

  /**
   * Streaming response từ Gemini
   */
  async streamResponse(prompt: string, context?: string) {
    try {
      const fullPrompt = context ? `${context}\n\nQuestion: ${prompt}` : prompt;

      const stream = await this.model.generateContentStream(fullPrompt);
      return stream;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const errorStatus = error?.status || error?.response?.status;

      this.logger.error(
        `Failed to stream response from Gemini: ${errorMessage}`,
        {
          status: errorStatus,
          details: error?.response?.data || error?.cause,
        },
      );

      if (errorStatus === 401 || errorStatus === 403) {
        throw new Error(
          `Gemini API Error: Authentication failed. Please check your API key. ${errorMessage}`,
        );
      }
      throw new Error(
        `Failed to stream response from Gemini API: ${errorMessage}`,
      );
    }
  }

  /**
   * Trích xuất thông tin cấu trúc từ văn bản.
   * Sử dụng Gemini để parse text thành JSON theo schema định sẵn.
   * 
   * @param {string} text - Văn bản cần trích xuất thông tin
   * @param {string} schema - JSON schema mô tả cấu trúc output mong muốn
   * @returns {Promise<Record<string, any>>} Object JSON được trích xuất
   * @throws {Error} Nếu không thể parse JSON từ response
   * 
   * @example
   * const info = await geminiService.extractInfo(
   *   'Nguyễn Văn A, 25 tuổi, làm ở phòng kỹ thuật',
   *   '{ "name": "string", "age": "number", "department": "string" }'
   * );
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
   * Phân loại text vào các categories định sẵn.
   * Sử dụng cho intent detection, sentiment analysis, v.v.
   * 
   * @param {string} text - Văn bản cần phân loại
   * @param {string[]} categories - Danh sách các category có thể
   * @returns {Promise<string>} Tên category được chọn
   * 
   * @example
   * const category = await geminiService.classify(
   *   'Tôi muốn biết ai là manager',
   *   ['question', 'command', 'greeting']
   * );
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
   * Tạo response với Function Calling (Tools).
   * Đây là method chính để thực hiện agent-style interactions.
   * 
   * **Flow hoạt động:**
   * 1. Gửi prompt + tools đến Gemini
   * 2. Nếu Gemini trả về function_call -> caller thực thi tool -> gọi continueChatWithToolResults
   * 3. Nếu Gemini trả về text -> trả luôn kết quả
   * 
   * @param {string} prompt - Câu hỏi/yêu cầu từ user
   * @param {any[]} tools - Danh sách tool definitions (từ GeminiToolsService.getTools())
   * @param {string} [context] - System context/instructions
   * @param {Array} [history] - Lịch sử hội thoại trước đó
   * @returns {Promise<{type: 'text'|'function_call', content?: string, functionCalls?: Array, chatSession?: any}>}
   * @throws {Error} Với 429 errors (rate limit) - để caller có thể fallback
   * 
   * @example
   * const result = await geminiService.generateResponseWithTools(
   *   'Ai biết React trong phòng Frontend?',
   *   geminiToolsService.getTools(),
   *   'Bạn là trợ lý AI cho hệ thống quản lý nhân sự'
   * );
   * 
   * if (result.type === 'function_call') {
   *   // Execute tools and continue chat
   * }
   */
  async generateResponseWithTools(
    prompt: string,
    tools: any[],
    context?: string,
    history: Array<{
      role: 'user' | 'assistant' | 'function';
      content: string;
    }> = [],
  ): Promise<any> {
    try {
      // 1. Configure tools
      const toolsConfig = [
        {
          functionDeclarations: tools,
        },
      ];

      // 2. Initialize chat with tools
      // Ensure history starts with 'user' role (Gemini API requirement)
      let validHistory = history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      }));

      // Remove leading 'model' messages to ensure first message is 'user'
      while (validHistory.length > 0 && validHistory[0].role === 'model') {
        validHistory = validHistory.slice(1);
      }

      const chat = this.model.startChat({
        tools: toolsConfig,
        history: validHistory,
      });

      // 3. Send message (with specific error handling for empty model output)
      const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
      let result;
      let response;

      try {
        result = await chat.sendMessage(fullPrompt);
        response = result.response;
      } catch (sendError: any) {
        // Handle "model output must contain either output text or tool calls"
        if (
          sendError.message?.includes(
            'model output must contain either output text or tool calls',
          ) ||
          sendError.message?.includes('empty')
        ) {
          this.logger.warn(
            `Gemini returned empty response: ${sendError.message}`,
          );
          return {
            type: 'text',
            content:
              'Xin lỗi, tôi không thể xử lý yêu cầu này lúc này. Vui lòng thử lại với câu hỏi đơn giản hơn.',
          };
        }
        // Re-throw other errors
        throw sendError;
      }

      // 4. Check for function calls FIRST
      let functionCalls;
      try {
        functionCalls = response.functionCalls();
      } catch (e) {
        functionCalls = null;
      }

      if (functionCalls && functionCalls.length > 0) {
        return {
          type: 'function_call',
          functionCalls: functionCalls,
          chatSession: chat, // Return session to continue conversation after tool execution
        };
      }

      // 5. Return text response (with try-catch for empty response error)
      let textContent = '';
      try {
        textContent = response.text();
      } catch (textError: any) {
        // Handle "model output must contain either output text or tool calls"
        this.logger.warn(`response.text() failed: ${textError.message}`);
        return {
          type: 'text',
          content:
            'Xin lỗi, tôi không thể xử lý yêu cầu này lúc này. Vui lòng thử lại sau.',
        };
      }

      if (!textContent || textContent.trim().length === 0) {
        this.logger.warn('Empty text response from Gemini, using fallback');
        return {
          type: 'text',
          content:
            'Xin lỗi, tôi không thể xử lý yêu cầu này. Vui lòng thử lại.',
        };
      }

      return {
        type: 'text',
        content: textContent,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to generate response with tools: ${error.message}`,
      );

      // 🆕 THROW 429 errors to allow ChatService to fallback to Ollama
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
        throw error; // Let ChatService handle this and fallback to Ollama
      }

      // Return fallback for empty response errors only
      if (error.message?.includes('empty')) {
        return {
          type: 'text',
          content: 'Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau.',
        };
      }

      throw error;
    }
  }

  /**
   * Tiếp tục hội thoại sau khi thực thi tools.
   * Gửi kết quả từ tool execution về Gemini để tạo response cuối cùng.
   * 
   * **Lưu ý:**
   * - Method này có thể trả về thêm function_call (nếu Gemini cần thêm tools)
   * - Có fallback xử lý khi Gemini trả về empty response
   * 
   * @param {any} chatSession - Chat session từ generateResponseWithTools()
   * @param {Array<{name: string, result: any}>} toolResults - Kết quả từ tool execution
   * @returns {Promise<{type: 'text'|'function_call', content?: string, functionCalls?: Array}>}
   * @throws {Error} Với 429 errors (rate limit) - để caller có thể fallback
   * 
   * @example
   * const toolResults = [
   *   { name: 'search_employees', result: { data: [...] } }
   * ];
   * const final = await geminiService.continueChatWithToolResults(
   *   previousResult.chatSession,
   *   toolResults
   * );
   */
  async continueChatWithToolResults(
    chatSession: any,
    toolResults: any[],
  ): Promise<any> {
    try {
      // Send tool results back to Gemini (with error handling)
      let result;
      let response;

      try {
        result = await chatSession.sendMessage(
          toolResults.map((r) => ({
            functionResponse: {
              name: r.name,
              response: r.result,
            },
          })),
        );
        response = result.response;
      } catch (sendError: any) {
        // Handle "model output must contain either output text or tool calls"
        if (
          sendError.message?.includes(
            'model output must contain either output text or tool calls',
          ) ||
          sendError.message?.includes('empty')
        ) {
          this.logger.warn(
            `Gemini returned empty response after tools: ${sendError.message}`,
          );
          // Fallback: format tool results directly
          const fallbackContent = toolResults
            .map((r) => {
              if (r.result?.data) {
                if (Array.isArray(r.result.data)) {
                  return r.result.data
                    .map(
                      (item: any) =>
                        item.ten || item.name || JSON.stringify(item),
                    )
                    .join(', ');
                }
                return (
                  r.result.data.ten ||
                  r.result.data.name ||
                  JSON.stringify(r.result.data)
                );
              }
              if (r.result?.message) {
                return r.result.message;
              }
              return JSON.stringify(r.result);
            })
            .filter(Boolean)
            .join('\n');
          return {
            type: 'text',
            content:
              fallbackContent || 'Đã tìm kiếm nhưng không có kết quả phù hợp.',
          };
        }
        throw sendError;
      }

      // Check for more function calls (with try-catch)
      let functionCalls;
      try {
        functionCalls = response.functionCalls();
      } catch (e) {
        functionCalls = null;
      }

      if (functionCalls && functionCalls.length > 0) {
        return {
          type: 'function_call',
          functionCalls: functionCalls,
          chatSession: chatSession,
        };
      }

      // Return text response (with try-catch for empty response error)
      let textContent = '';
      try {
        textContent = response.text();
      } catch (textError: any) {
        // Handle "model output must contain either output text or tool calls"
        this.logger.warn(
          `response.text() after tools failed: ${textError.message}`,
        );
        // Fallback: format tool results directly
        const fallbackContent = toolResults
          .map((r) => {
            if (r.result?.data) {
              return JSON.stringify(r.result.data, null, 2);
            }
            if (r.result?.message) {
              return r.result.message;
            }
            return JSON.stringify(r.result);
          })
          .join('\n');
        return {
          type: 'text',
          content:
            fallbackContent || 'Đã thực hiện xong nhưng không có kết quả.',
        };
      }

      if (!textContent || textContent.trim().length === 0) {
        this.logger.warn(
          'Empty response after tool execution, using tool results as fallback',
        );
        const fallbackContent = toolResults
          .map((r) => {
            if (r.result?.data) {
              return JSON.stringify(r.result.data, null, 2);
            }
            if (r.result?.message) {
              return r.result.message;
            }
            return JSON.stringify(r.result);
          })
          .join('\n');
        return {
          type: 'text',
          content:
            fallbackContent ||
            'Đã thực hiện xong nhưng không có kết quả để hiển thị.',
        };
      }

      return {
        type: 'text',
        content: textContent,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to continue chat with tool results: ${error.message}`,
      );

      // 🆕 THROW 429 errors to allow ChatService to fallback to Ollama
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
        throw error; // Let ChatService handle this and fallback to Ollama
      }

      // Return fallback for empty response errors only
      if (error.message?.includes('empty')) {
        return {
          type: 'text',
          content: 'Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau.',
        };
      }

      throw error;
    }
  }

  /**
   * Tóm tắt văn bản dài thành ngắn hơn.
   * 
   * @param {string} text - Văn bản cần tóm tắt
   * @param {number} [maxLength=100] - Số ký tự tối đa của bản tóm tắt
   * @returns {Promise<string>} Văn bản đã được tóm tắt
   * 
   * @example
   * const summary = await geminiService.summarize(longReport, 200);
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
