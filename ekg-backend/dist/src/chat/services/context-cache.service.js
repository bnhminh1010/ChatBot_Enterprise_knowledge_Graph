"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ContextCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextCacheService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
let ContextCacheService = ContextCacheService_1 = class ContextCacheService {
    redis;
    logger = new common_1.Logger(ContextCacheService_1.name);
    DEFAULT_TTL = parseInt(process.env.RAG_CONTEXT_CACHE_TTL || '3600');
    constructor(redis) {
        this.redis = redis;
    }
    async cacheContext(query, collectionName, contexts, filters, ttl) {
        try {
            const key = this.generateContextKey(query, collectionName, filters);
            const value = JSON.stringify(contexts);
            await this.redis.setex(key, ttl || this.DEFAULT_TTL, value);
            this.logger.debug(`Cached ${contexts.length} contexts for query: "${query.substring(0, 40)}..."`);
        }
        catch (error) {
            this.logger.warn(`Failed to cache context: ${error.message}`);
        }
    }
    async getContext(query, collectionName, filters) {
        try {
            const key = this.generateContextKey(query, collectionName, filters);
            const cached = await this.redis.get(key);
            if (cached) {
                this.logger.debug(`Cache HIT for query: "${query.substring(0, 40)}..."`);
                return JSON.parse(cached);
            }
            this.logger.debug(`Cache MISS for query: "${query.substring(0, 40)}..."`);
            return null;
        }
        catch (error) {
            this.logger.warn(`Failed to get cached context: ${error.message}`);
            return null;
        }
    }
    async cacheEmbedding(text, embedding, ttl = 86400) {
        try {
            const key = this.generateEmbeddingKey(text);
            const value = JSON.stringify(embedding);
            await this.redis.setex(key, ttl, value);
            this.logger.debug(`Cached embedding for text: "${text.substring(0, 40)}..."`);
        }
        catch (error) {
            this.logger.warn(`Failed to cache embedding: ${error.message}`);
        }
    }
    async getEmbedding(text) {
        try {
            const key = this.generateEmbeddingKey(text);
            const cached = await this.redis.get(key);
            if (cached) {
                this.logger.debug(`Embedding cache HIT for: "${text.substring(0, 40)}..."`);
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            this.logger.warn(`Failed to get cached embedding: ${error.message}`);
            return null;
        }
    }
    async cacheRAGResponse(query, collectionName, response, ttl) {
        try {
            const key = this.generateRAGKey(query, collectionName);
            const responseTTL = ttl || this.inferTTLFromQuery(query);
            await this.redis.setex(key, responseTTL, response);
            this.logger.debug(`Cached RAG response (TTL: ${responseTTL}s) for: "${query.substring(0, 40)}..."`);
        }
        catch (error) {
            this.logger.warn(`Failed to cache RAG response: ${error.message}`);
        }
    }
    async getRAGResponse(query, collectionName) {
        try {
            const key = this.generateRAGKey(query, collectionName);
            const cached = await this.redis.get(key);
            if (cached) {
                this.logger.debug(`RAG cache HIT for: "${query.substring(0, 40)}..."`);
                return cached;
            }
            return null;
        }
        catch (error) {
            this.logger.warn(`Failed to get cached RAG response: ${error.message}`);
            return null;
        }
    }
    async invalidateCollection(collectionName) {
        try {
            const pattern = `context:${collectionName}:*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                this.logger.log(`Invalidated ${keys.length} cache entries for collection: ${collectionName}`);
            }
        }
        catch (error) {
            this.logger.warn(`Failed to invalidate collection cache: ${error.message}`);
        }
    }
    generateContextKey(query, collectionName, filters) {
        const normalized = query.toLowerCase().trim();
        const filterString = filters ? JSON.stringify(filters) : '';
        const hash = this.hashString(`${normalized}${filterString}`);
        return `context:${collectionName}:${hash}`;
    }
    generateEmbeddingKey(text) {
        const normalized = text.toLowerCase().trim();
        const hash = this.hashString(normalized);
        return `embedding:${hash}`;
    }
    generateRAGKey(query, collectionName) {
        const normalized = query.toLowerCase().trim();
        const hash = this.hashString(normalized);
        return `rag:${collectionName}:${hash}`;
    }
    hashString(input) {
        return crypto.createHash('md5').update(input).digest('hex');
    }
    inferTTLFromQuery(query) {
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('hiện tại') ||
            lowerQuery.includes('current') ||
            lowerQuery.includes('latest') ||
            lowerQuery.includes('bao nhiêu') ||
            lowerQuery.includes('count')) {
            return 600;
        }
        return 3600;
    }
    async getCacheStats() {
        try {
            const [contextKeys, embeddingKeys, ragKeys] = await Promise.all([
                this.redis.keys('context:*'),
                this.redis.keys('embedding:*'),
                this.redis.keys('rag:*'),
            ]);
            return {
                contextEntries: contextKeys.length,
                embeddingEntries: embeddingKeys.length,
                ragEntries: ragKeys.length,
            };
        }
        catch (error) {
            this.logger.warn(`Failed to get cache stats: ${error.message}`);
            return {
                contextEntries: 0,
                embeddingEntries: 0,
                ragEntries: 0,
            };
        }
    }
};
exports.ContextCacheService = ContextCacheService;
exports.ContextCacheService = ContextCacheService = ContextCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [Function])
], ContextCacheService);
//# sourceMappingURL=context-cache.service.js.map