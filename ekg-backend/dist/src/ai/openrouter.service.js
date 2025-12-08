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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OpenRouterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let OpenRouterService = OpenRouterService_1 = class OpenRouterService {
    logger = new common_1.Logger(OpenRouterService_1.name);
    client;
    apiKey;
    baseUrl = 'https://openrouter.ai/api/v1';
    defaultModel = process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free';
    constructor() {
        this.apiKey = process.env.OPEN_ROUTER_API_KEY || null;
        if (!this.apiKey) {
            this.logger.warn('OPEN_ROUTER_API_KEY not defined - OpenRouter fallback disabled');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
                'HTTP-Referer': process.env.APP_URL || 'http://localhost:3002',
                'X-Title': 'EKG Chatbot',
            },
        });
        if (this.apiKey) {
            this.logger.log(`✅ OpenRouter service initialized with model: ${this.defaultModel}`);
        }
    }
    isAvailable() {
        return !!this.apiKey;
    }
    async generateResponseWithTools(prompt, tools, context, history = []) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }
        try {
            const openRouterTools = tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            }));
            const messages = [];
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
                const functionCalls = choice.message.tool_calls.map((tc) => ({
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
        }
        catch (error) {
            this.logger.error(`OpenRouter API error: ${error.message}`);
            if (error.response?.status === 429 ||
                error.message?.includes('429') ||
                error.message?.includes('quota') ||
                error.message?.includes('rate limit')) {
                throw new Error(`OpenRouter quota exceeded: ${error.response?.data?.error?.message || error.message}`);
            }
            throw error;
        }
    }
    async continueChatWithToolResults(previousMessages, toolResults, tools) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }
        try {
            const messages = [...previousMessages];
            for (const result of toolResults) {
                messages.push({
                    role: 'tool',
                    content: JSON.stringify(result.result),
                    tool_call_id: result.tool_call_id || result.name,
                });
            }
            const openRouterTools = tools.map((tool) => ({
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
                const functionCalls = choice.message.tool_calls.map((tc) => ({
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
        }
        catch (error) {
            this.logger.error(`OpenRouter continue chat error: ${error.message}`);
            if (error.response?.status === 429 || error.message?.includes('quota')) {
                throw new Error(`OpenRouter quota exceeded: ${error.message}`);
            }
            throw error;
        }
    }
    async generateResponse(prompt, context) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }
        try {
            const messages = [];
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
        }
        catch (error) {
            this.logger.error(`OpenRouter generate error: ${error.message}`);
            throw error;
        }
    }
};
exports.OpenRouterService = OpenRouterService;
exports.OpenRouterService = OpenRouterService = OpenRouterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OpenRouterService);
//# sourceMappingURL=openrouter.service.js.map