"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DocumentChunkingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentChunkingService = void 0;
const common_1 = require("@nestjs/common");
let DocumentChunkingService = DocumentChunkingService_1 = class DocumentChunkingService {
    logger = new common_1.Logger(DocumentChunkingService_1.name);
    DEFAULT_CONFIG = {
        maxTokens: parseInt(process.env.RAG_CHUNK_SIZE || '512'),
        overlapTokens: parseInt(process.env.RAG_CHUNK_OVERLAP || '50'),
        preserveSentences: true,
    };
    async chunkDocument(documentId, content, config) {
        const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
        try {
            if (this.isMarkdown(content)) {
                return this.chunkBySection(documentId, content, finalConfig);
            }
            else {
                return this.chunkBySentence(documentId, content, finalConfig);
            }
        }
        catch (error) {
            this.logger.error(`Failed to chunk document ${documentId}: ${error}`);
            return [
                {
                    id: `${documentId}-chunk-1`,
                    parentId: documentId,
                    content,
                    position: 0,
                    metadata: {
                        startOffset: 0,
                        endOffset: content.length,
                        totalChunks: 1,
                    },
                },
            ];
        }
    }
    chunkBySentence(documentId, content, config) {
        const sentences = this.splitIntoSentences(content);
        const chunks = [];
        let currentChunk = [];
        let currentTokenCount = 0;
        let chunkIndex = 0;
        let startOffset = 0;
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const sentenceTokens = this.estimateTokenCount(sentence);
            if (currentTokenCount + sentenceTokens > config.maxTokens &&
                currentChunk.length > 0) {
                const chunkContent = currentChunk.join(' ');
                chunks.push({
                    id: `${documentId}-chunk-${chunkIndex + 1}`,
                    parentId: documentId,
                    content: chunkContent,
                    position: chunkIndex,
                    metadata: {
                        startOffset,
                        endOffset: startOffset + chunkContent.length,
                        totalChunks: 0,
                    },
                });
                const overlapSentenceCount = this.calculateOverlapSentences(currentChunk, config.overlapTokens);
                currentChunk = currentChunk.slice(-overlapSentenceCount);
                currentTokenCount = this.estimateTokenCount(currentChunk.join(' '));
                chunkIndex++;
                startOffset += chunkContent.length - currentTokenCount;
            }
            currentChunk.push(sentence);
            currentTokenCount += sentenceTokens;
        }
        if (currentChunk.length > 0) {
            const chunkContent = currentChunk.join(' ');
            chunks.push({
                id: `${documentId}-chunk-${chunkIndex + 1}`,
                parentId: documentId,
                content: chunkContent,
                position: chunkIndex,
                metadata: {
                    startOffset,
                    endOffset: startOffset + chunkContent.length,
                    totalChunks: 0,
                },
            });
        }
        const totalChunks = chunks.length;
        chunks.forEach((chunk) => {
            chunk.metadata.totalChunks = totalChunks;
        });
        this.logger.debug(`Chunked document ${documentId} into ${totalChunks} chunks`);
        return chunks;
    }
    chunkBySection(documentId, content, config) {
        const sections = this.splitIntoSections(content);
        const chunks = [];
        let chunkIndex = 0;
        for (const section of sections) {
            const sectionTokens = this.estimateTokenCount(section);
            if (sectionTokens <= config.maxTokens) {
                chunks.push({
                    id: `${documentId}-chunk-${chunkIndex + 1}`,
                    parentId: documentId,
                    content: section,
                    position: chunkIndex,
                    metadata: {
                        startOffset: 0,
                        endOffset: section.length,
                        totalChunks: 0,
                    },
                });
                chunkIndex++;
            }
            else {
                const sectionChunks = this.chunkBySentence(`${documentId}-section-${chunkIndex}`, section, config);
                chunks.push(...sectionChunks);
                chunkIndex += sectionChunks.length;
            }
        }
        const totalChunks = chunks.length;
        chunks.forEach((chunk) => {
            chunk.metadata.totalChunks = totalChunks;
        });
        return chunks;
    }
    splitIntoSentences(text) {
        return text
            .split(/[.!?]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }
    splitIntoSections(markdown) {
        const sections = [];
        const lines = markdown.split('\n');
        let currentSection = [];
        for (const line of lines) {
            if (line.match(/^#{1,6}\s/)) {
                if (currentSection.length > 0) {
                    sections.push(currentSection.join('\n'));
                    currentSection = [];
                }
            }
            currentSection.push(line);
        }
        if (currentSection.length > 0) {
            sections.push(currentSection.join('\n'));
        }
        return sections.filter((s) => s.trim().length > 0);
    }
    estimateTokenCount(text) {
        return Math.ceil(text.length / 4);
    }
    calculateOverlapSentences(sentences, targetOverlapTokens) {
        let tokenCount = 0;
        let sentenceCount = 0;
        for (let i = sentences.length - 1; i >= 0; i--) {
            const sentenceTokens = this.estimateTokenCount(sentences[i]);
            if (tokenCount + sentenceTokens > targetOverlapTokens) {
                break;
            }
            tokenCount += sentenceTokens;
            sentenceCount++;
        }
        return sentenceCount;
    }
    isMarkdown(content) {
        return /^#{1,6}\s/m.test(content);
    }
    async chunkDocuments(documents, config) {
        const results = new Map();
        for (const doc of documents) {
            const chunks = await this.chunkDocument(doc.id, doc.content, config);
            results.set(doc.id, chunks);
        }
        return results;
    }
};
exports.DocumentChunkingService = DocumentChunkingService;
exports.DocumentChunkingService = DocumentChunkingService = DocumentChunkingService_1 = __decorate([
    (0, common_1.Injectable)()
], DocumentChunkingService);
//# sourceMappingURL=document-chunking.service.js.map