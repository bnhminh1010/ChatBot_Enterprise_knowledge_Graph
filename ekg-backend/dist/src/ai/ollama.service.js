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
var OllamaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let OllamaService = OllamaService_1 = class OllamaService {
    logger = new common_1.Logger(OllamaService_1.name);
    ollamaUrl;
    modelName;
    constructor() {
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.modelName = process.env.OLLAMA_MODEL || 'mistral';
    }
    async isHealthy() {
        try {
            const response = await axios_1.default.get(`${this.ollamaUrl}/api/tags`, {
                timeout: 5000,
            });
            return response.status === 200;
        }
        catch (error) {
            this.logger.warn('Ollama server is not responding');
            return false;
        }
    }
    async hasModel(modelName = this.modelName) {
        try {
            const response = await axios_1.default.get(`${this.ollamaUrl}/api/tags`);
            const models = response.data?.models || [];
            return models.some((m) => m.name === modelName || m.name.startsWith(modelName + ':'));
        }
        catch (error) {
            return false;
        }
    }
    async generateEmbedding(text, model = this.modelName) {
        try {
            const response = await axios_1.default.post(`${this.ollamaUrl}/api/embeddings`, {
                model,
                prompt: text,
            }, {
                timeout: 30000,
            });
            return response.data.embedding;
        }
        catch (error) {
            this.logger.error(`Failed to generate embedding: ${error}`);
            throw new Error('Failed to generate embedding from Ollama');
        }
    }
    async generateResponse(prompt, model = this.modelName, stream = false) {
        try {
            const response = await axios_1.default.post(`${this.ollamaUrl}/api/generate`, {
                model,
                prompt,
                stream,
            }, {
                timeout: 60000,
            });
            return response.data.response;
        }
        catch (error) {
            this.logger.error(`Failed to generate response: ${error}`);
            throw new Error('Failed to generate response from Ollama');
        }
    }
    async pullModel(modelName = this.modelName) {
        try {
            this.logger.log(`Pulling model: ${modelName}...`);
            await axios_1.default.post(`${this.ollamaUrl}/api/pull`, {
                name: modelName,
                stream: false,
            }, {
                timeout: 600000,
            });
            this.logger.log(`Model ${modelName} pulled successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to pull model: ${error}`);
            throw new Error(`Failed to pull model ${modelName}`);
        }
    }
};
exports.OllamaService = OllamaService;
exports.OllamaService = OllamaService = OllamaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OllamaService);
//# sourceMappingURL=ollama.service.js.map