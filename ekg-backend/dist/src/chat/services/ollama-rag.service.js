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
    TOP_K_CANDIDATES = parseInt(process.env.RAG_TOP_K_CANDIDATES || '20');
    TOP_K_FINAL = parseInt(process.env.RAG_TOP_K_FINAL || '5');
    VECTOR_WEIGHT = parseFloat(process.env.HYBRID_VECTOR_WEIGHT || '0.7');
    KEYWORD_WEIGHT = parseFloat(process.env.HYBRID_KEYWORD_WEIGHT || '0.3');
    constructor(ollamaService, chromaDBService) {
        this.ollamaService = ollamaService;
        this.chromaDBService = chromaDBService;
    }
    async queryWithRAG(query, collectionName = 'employees', topK, conversationHistory) {
        try {
            this.logger.debug(`Stage 1: Hybrid search for top-${this.TOP_K_CANDIDATES} candidates`);
            const candidates = await this.chromaDBService.hybridSearch(collectionName, query, this.TOP_K_CANDIDATES, {
                vectorWeight: this.VECTOR_WEIGHT,
                keywordWeight: this.KEYWORD_WEIGHT,
            });
            if (candidates.length === 0) {
                return 'Xin lỗi, không tìm thấy thông tin liên quan trong hệ thống.';
            }
            this.logger.debug('Stage 2: Re-ranking candidates');
            const reranked = this.rerankResults(candidates, query, conversationHistory);
            this.logger.debug('Stage 3: Diversity filtering');
            const diverse = this.diversityFilter(reranked, topK || this.TOP_K_FINAL);
            this.logger.debug('Stage 4: Generating response');
            const contextText = this.buildContext(diverse);
            const prompt = this.buildPrompt(query, contextText, conversationHistory);
            const response = await this.ollamaService.generateResponse(prompt, 'qwen2.5:7b');
            this.logger.debug(`RAG completed: ${diverse.length} contexts used for "${query.substring(0, 40)}..."`);
            return response;
        }
        catch (error) {
            this.logger.error(`RAG query failed: ${error}`);
            const searchResults = await this.chromaDBService.search(collectionName, query, 5);
            return this.formatSearchResults(searchResults);
        }
    }
    rerankResults(results, query, conversationHistory) {
        const queryLower = query.toLowerCase();
        const queryKeywords = queryLower.split(/\s+/);
        return results
            .map((result) => {
            let rerankScore = result.similarity;
            const contentLower = result.content.toLowerCase();
            const keywordMatches = queryKeywords.filter((kw) => contentLower.includes(kw)).length;
            const keywordBonus = (keywordMatches / queryKeywords.length) * 0.1;
            rerankScore += keywordBonus;
            if (result.metadata.timestamp) {
                const age = Date.now() - new Date(result.metadata.timestamp).getTime();
                const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
                const recencyBonus = Math.exp(-daysSinceUpdate / 365) * 0.05;
                rerankScore += recencyBonus;
            }
            if (conversationHistory && conversationHistory.length > 0) {
                const historyText = conversationHistory
                    .map((h) => h.content)
                    .join(' ')
                    .toLowerCase();
                const contextKeywords = historyText.split(/\s+/);
                const contextMatches = contextKeywords.filter((kw) => contentLower.includes(kw)).length;
                if (contextMatches > 0) {
                    rerankScore += 0.05;
                }
            }
            return {
                ...result,
                rerankScore,
            };
        })
            .sort((a, b) => b.rerankScore - a.rerankScore);
    }
    diversityFilter(results, topK) {
        if (results.length <= topK) {
            return results;
        }
        const selected = [];
        const remaining = [...results];
        selected.push(remaining.shift());
        while (selected.length < topK && remaining.length > 0) {
            let maxDiversity = -1;
            let maxIndex = 0;
            for (let i = 0; i < remaining.length; i++) {
                const candidate = remaining[i];
                let minSimilarity = 1.0;
                for (const selectedItem of selected) {
                    const similarity = this.textSimilarity(candidate.content, selectedItem.content);
                    minSimilarity = Math.min(minSimilarity, similarity);
                }
                const diversityScore = candidate.rerankScore * 0.7 + (1 - minSimilarity) * 0.3;
                if (diversityScore > maxDiversity) {
                    maxDiversity = diversityScore;
                    maxIndex = i;
                }
            }
            selected.push(remaining.splice(maxIndex, 1)[0]);
        }
        return selected;
    }
    textSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter((word) => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
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
${conversationHistory.map((h) => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}`;
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
        const items = results
            .map((r, idx) => {
            const metadata = r.metadata || {};
            return `${idx + 1}. ${metadata.name || 'Unknown'}
   Độ liên quan: ${(r.similarity * 100).toFixed(1)}%
   ${metadata.role ? `Vị trí: ${metadata.role}` : ''}
   ${metadata.department ? `Phòng ban: ${metadata.department}` : ''}`;
        })
            .join('\n\n');
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