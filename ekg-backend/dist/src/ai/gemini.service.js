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
    client;
    model;
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables');
        }
        this.client = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.client.getGenerativeModel({ model: 'gemini-pro' });
    }
    async generateResponse(prompt, context) {
        try {
            const fullPrompt = context
                ? `${context}\n\nQuestion: ${prompt}`
                : prompt;
            const result = await this.model.generateContent(fullPrompt);
            const response = result.response;
            return response.text();
        }
        catch (error) {
            this.logger.error(`Failed to generate response from Gemini: ${error}`);
            throw new Error('Failed to generate response from Gemini API');
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
            this.logger.error(`Failed to chat with Gemini: ${error}`);
            throw new Error('Failed to chat with Gemini API');
        }
    }
    async streamResponse(prompt, context) {
        try {
            const fullPrompt = context
                ? `${context}\n\nQuestion: ${prompt}`
                : prompt;
            const stream = await this.model.generateContentStream(fullPrompt);
            return stream;
        }
        catch (error) {
            this.logger.error(`Failed to stream response from Gemini: ${error}`);
            throw new Error('Failed to stream response from Gemini API');
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