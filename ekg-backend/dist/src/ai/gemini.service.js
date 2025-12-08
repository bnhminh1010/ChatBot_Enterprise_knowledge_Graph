"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const generative_ai_1 = require("@google/generative-ai");
let GeminiService = GeminiService_1 = class GeminiService {
    logger = new common_1.Logger(GeminiService_1.name);
    DEFAULT_MODEL = 'gemini-2.5-pro';
    client;
    model;
    activeModelName;
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables');
        }
        const modelName = process.env.GEMINI_MODEL || this.DEFAULT_MODEL;
        this.activeModelName = modelName;
        this.client = new generative_ai_1.GoogleGenerativeAI(apiKey);
        try {
            this.model = this.client.getGenerativeModel({ model: modelName });
            this.logger.log(`Gemini service initialized with model: ${this.activeModelName}`);
        }
        catch (error) {
            const errorMsg = error?.message || 'Unknown error';
            this.logger.error(`Failed to initialize Gemini model "${modelName}": ${errorMsg}`);
            if (errorMsg.includes('not found') ||
                errorMsg.includes('404') ||
                errorMsg.includes('invalid')) {
                const fallbackModel = this.DEFAULT_MODEL;
                this.logger.warn(`Trying fallback model: ${fallbackModel}`);
                try {
                    this.model = this.client.getGenerativeModel({ model: fallbackModel });
                    this.activeModelName = fallbackModel;
                    this.logger.log(`Gemini service initialized with fallback model: ${this.activeModelName}`);
                }
                catch (fallbackError) {
                    throw new Error(`Failed to initialize Gemini with both ${modelName} and ${fallbackModel}: ${errorMsg}`);
                }
            }
            else {
                throw new Error(`Failed to initialize Gemini model: ${errorMsg}`);
            }
        }
    }
    async generateResponse(prompt, context) {
        try {
            const fullPrompt = context ? `${context}\n\nQuestion: ${prompt}` : prompt;
            const result = await this.model.generateContent(fullPrompt);
            if (!result || !result.response) {
                throw new Error('Invalid response from Gemini API: response is null or undefined');
            }
            const response = result.response;
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
        }
        catch (error) {
            const errorMessage = error?.message || 'Unknown error';
            const errorStatus = error?.status || error?.response?.status || error?.code;
            const errorDetails = error?.response?.data || error?.cause || error?.errorDetails;
            this.logger.error(`Failed to generate response from Gemini: ${errorMessage}`, {
                status: errorStatus,
                details: errorDetails,
                model: this.activeModelName,
                stack: error?.stack,
            });
            if (errorStatus === 400 || errorMessage.includes('400')) {
                throw new Error(`Gemini API Error: Invalid request. Model "${this.activeModelName}" may not be available. ${errorMessage}`);
            }
            else if (errorStatus === 401 ||
                errorStatus === 403 ||
                errorMessage.includes('401') ||
                errorMessage.includes('403')) {
                throw new Error(`Gemini API Error: Authentication failed. Please check your API key. ${errorMessage}`);
            }
            else if (errorStatus === 404 ||
                errorMessage.includes('404') ||
                errorMessage.includes('not found')) {
                throw new Error(`Gemini API Error: Model "${this.activeModelName}" not found. Please check model name. ${errorMessage}`);
            }
            else if (errorStatus === 429 || errorMessage.includes('429')) {
                throw new Error(`Gemini API Error: Rate limit exceeded. Please try again later.`);
            }
            else if (errorStatus === 500 || errorMessage.includes('500')) {
                throw new Error(`Gemini API Error: Internal server error. Please try again later.`);
            }
            else {
                throw new Error(`Failed to generate response from Gemini API: ${errorMessage}`);
            }
        }
    }
    async classifyQuery(prompt) {
        return this.generateResponse(prompt);
    }
    async generateResponseWithHistory(currentMessage, conversationHistory, databaseContext) {
        try {
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
            for (const msg of conversationHistory) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }],
                });
            }
            let fullPrompt = currentMessage;
            if (databaseContext) {
                fullPrompt = `${databaseContext}\n\n---\nCâu hỏi: ${currentMessage}`;
            }
            const chat = this.model.startChat({
                history: messages,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            });
            const result = await chat.sendMessage(fullPrompt);
            const response = result.response;
            return response.text();
        }
        catch (error) {
            const errorMessage = error?.message || 'Unknown error';
            this.logger.error(`Failed to generate response with history: ${errorMessage}`);
            this.logger.warn('Falling back to simple generateResponse...');
            return this.generateResponse(currentMessage, databaseContext);
        }
    }
    async chat(messages) {
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
        }
        catch (error) {
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
    async streamResponse(prompt, context) {
        try {
            const fullPrompt = context ? `${context}\n\nQuestion: ${prompt}` : prompt;
            const stream = await this.model.generateContentStream(fullPrompt);
            return stream;
        }
        catch (error) {
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
    async extractInfo(text, schema) {
        try {
            const prompt = `Extract information from the following text and return as JSON matching this schema:
${schema}

Text to extract from:
${text}

Return only valid JSON.`;
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Could not extract JSON from response');
        }
        catch (error) {
            this.logger.error(`Failed to extract info from Gemini: ${error}`);
            throw error;
        }
    }
    async classify(text, categories) {
        try {
            const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}

Text: "${text}"

Return only the category name.`;
            const result = await this.model.generateContent(prompt);
            return result.response.text().trim();
        }
        catch (error) {
            this.logger.error(`Failed to classify text with Gemini: ${error}`);
            throw error;
        }
    }
    async generateResponseWithTools(prompt, tools, context, history = []) {
        try {
            const toolsConfig = [
                {
                    functionDeclarations: tools,
                },
            ];
            let validHistory = history.map((msg) => ({
                role: msg.role === 'assistant' ? 'model' : msg.role,
                parts: [{ text: msg.content }],
            }));
            while (validHistory.length > 0 && validHistory[0].role === 'model') {
                validHistory = validHistory.slice(1);
            }
            const chat = this.model.startChat({
                tools: toolsConfig,
                history: validHistory,
            });
            const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
            let result;
            let response;
            try {
                result = await chat.sendMessage(fullPrompt);
                response = result.response;
            }
            catch (sendError) {
                if (sendError.message?.includes('model output must contain either output text or tool calls') ||
                    sendError.message?.includes('empty')) {
                    this.logger.warn(`Gemini returned empty response: ${sendError.message}`);
                    return {
                        type: 'text',
                        content: 'Xin lỗi, tôi không thể xử lý yêu cầu này lúc này. Vui lòng thử lại với câu hỏi đơn giản hơn.',
                    };
                }
                throw sendError;
            }
            let functionCalls;
            try {
                functionCalls = response.functionCalls();
            }
            catch (e) {
                functionCalls = null;
            }
            if (functionCalls && functionCalls.length > 0) {
                return {
                    type: 'function_call',
                    functionCalls: functionCalls,
                    chatSession: chat,
                };
            }
            let textContent = '';
            try {
                textContent = response.text();
            }
            catch (textError) {
                this.logger.warn(`response.text() failed: ${textError.message}`);
                return {
                    type: 'text',
                    content: 'Xin lỗi, tôi không thể xử lý yêu cầu này lúc này. Vui lòng thử lại sau.',
                };
            }
            if (!textContent || textContent.trim().length === 0) {
                this.logger.warn('Empty text response from Gemini, using fallback');
                return {
                    type: 'text',
                    content: 'Xin lỗi, tôi không thể xử lý yêu cầu này. Vui lòng thử lại.',
                };
            }
            return {
                type: 'text',
                content: textContent,
            };
        }
        catch (error) {
            this.logger.error(`Failed to generate response with tools: ${error.message}`);
            if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
                throw error;
            }
            if (error.message?.includes('empty')) {
                return {
                    type: 'text',
                    content: 'Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau.',
                };
            }
            throw error;
        }
    }
    async continueChatWithToolResults(chatSession, toolResults) {
        try {
            let result;
            let response;
            try {
                result = await chatSession.sendMessage(toolResults.map((r) => ({
                    functionResponse: {
                        name: r.name,
                        response: r.result,
                    },
                })));
                response = result.response;
            }
            catch (sendError) {
                if (sendError.message?.includes('model output must contain either output text or tool calls') ||
                    sendError.message?.includes('empty')) {
                    this.logger.warn(`Gemini returned empty response after tools: ${sendError.message}`);
                    const fallbackContent = toolResults
                        .map((r) => {
                        if (r.result?.data) {
                            if (Array.isArray(r.result.data)) {
                                return r.result.data
                                    .map((item) => item.ten || item.name || JSON.stringify(item))
                                    .join(', ');
                            }
                            return (r.result.data.ten ||
                                r.result.data.name ||
                                JSON.stringify(r.result.data));
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
                        content: fallbackContent || 'Đã tìm kiếm nhưng không có kết quả phù hợp.',
                    };
                }
                throw sendError;
            }
            let functionCalls;
            try {
                functionCalls = response.functionCalls();
            }
            catch (e) {
                functionCalls = null;
            }
            if (functionCalls && functionCalls.length > 0) {
                return {
                    type: 'function_call',
                    functionCalls: functionCalls,
                    chatSession: chatSession,
                };
            }
            let textContent = '';
            try {
                textContent = response.text();
            }
            catch (textError) {
                this.logger.warn(`response.text() after tools failed: ${textError.message}`);
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
                    content: fallbackContent || 'Đã thực hiện xong nhưng không có kết quả.',
                };
            }
            if (!textContent || textContent.trim().length === 0) {
                this.logger.warn('Empty response after tool execution, using tool results as fallback');
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
                    content: fallbackContent ||
                        'Đã thực hiện xong nhưng không có kết quả để hiển thị.',
                };
            }
            return {
                type: 'text',
                content: textContent,
            };
        }
        catch (error) {
            this.logger.error(`Failed to continue chat with tool results: ${error.message}`);
            if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
                throw error;
            }
            if (error.message?.includes('empty')) {
                return {
                    type: 'text',
                    content: 'Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau.',
                };
            }
            throw error;
        }
    }
    async summarize(text, maxLength = 100) {
        try {
            const prompt = `Summarize the following text in maximum ${maxLength} characters:

${text}`;
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        }
        catch (error) {
            this.logger.error(`Failed to summarize text with Gemini: ${error}`);
            throw error;
        }
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map