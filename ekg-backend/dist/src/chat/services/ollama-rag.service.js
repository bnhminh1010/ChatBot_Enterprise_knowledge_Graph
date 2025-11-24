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
var OllamaRAGService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaRAGService = void 0;
const common_1 = require("@nestjs/common");
const ollama_service_1 = require("../../ai/ollama.service");
const chroma_db_service_1 = require("../../ai/chroma-db.service");
let OllamaRAGService = OllamaRAGService_1 = class OllamaRAGService {
    ollamaService;
    chromaDBService;
    logger = new common_1.Logger(OllamaRAGService_1.name);
    constructor(ollamaService, chromaDBService) {
        this.ollamaService = ollamaService;
        this.chromaDBService = chromaDBService;
    }
    async queryWithRAG(query, collectionName = 'employees', topK = 10, conversationHistory) {
        try {
            const searchResults = await this.chromaDBService.search(collectionName, query, topK);
            if (searchResults.length === 0) {
                return 'Xin lỗi, không tìm thấy thông tin liên quan trong hệ thống.';
            }
            const contextText = this.buildContext(searchResults);
            const prompt = this.buildPrompt(query, contextText, conversationHistory);
            const response = await this.ollamaService.generateResponse(prompt, 'llama3.1');
            this.logger.debug(`RAG query completed: ${query.substring(0, 50)}...`);
            return response;
        }
        catch (error) {
            this.logger.error(`RAG query failed: ${error}`);
            const searchResults = await this.chromaDBService.search(collectionName, query, 5);
            return this.formatSearchResults(searchResults);
        }
    }
    buildContext(results) {
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
    buildPrompt(query, context, conversationHistory) {
        let prompt = `You are a helpful enterprise assistant for APTX3107 company knowledge system.

CONTEXT FROM DATABASE:
${context}`;
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
    formatSearchResults(results) {
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
    async isAvailable() {
        return await this.ollamaService.isHealthy();
    }
};
exports.OllamaRAGService = OllamaRAGService;
exports.OllamaRAGService = OllamaRAGService = OllamaRAGService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ollama_service_1.OllamaService,
        chroma_db_service_1.ChromaDBService])
], OllamaRAGService);
//# sourceMappingURL=ollama-rag.service.js.map