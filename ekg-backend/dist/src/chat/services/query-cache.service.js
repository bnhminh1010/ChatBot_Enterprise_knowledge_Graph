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
var QueryCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryCacheService = void 0;
const common_1 = require("@nestjs/common");
const redis_1 = require("redis");
const crypto = __importStar(require("crypto"));
let QueryCacheService = QueryCacheService_1 = class QueryCacheService {
    logger = new common_1.Logger(QueryCacheService_1.name);
    client;
    DEFAULT_TTL = 3600;
    CACHE_PREFIX = 'tool_cache:';
    isConnected = false;
    constructor() {
        this.initializeRedis();
    }
    async initializeRedis() {
        try {
            this.client = (0, redis_1.createClient)({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            this.logger.error('Max Redis reconnection attempts reached');
                            return new Error('Max retries reached');
                        }
                        return Math.min(retries * 100, 3000);
                    },
                },
            });
            this.client.on('error', (err) => {
                this.logger.error(`Redis error: ${err.message}`);
                this.isConnected = false;
            });
            this.client.on('connect', () => {
                this.logger.log('✅ Redis connected successfully');
                this.isConnected = true;
            });
            await this.client.connect();
        }
        catch (error) {
            this.logger.error(`Failed to initialize Redis: ${error.message}`);
            this.isConnected = false;
        }
    }
    generateCacheKey(toolName, args) {
        const argsString = JSON.stringify(args, Object.keys(args).sort());
        const hash = crypto
            .createHash('md5')
            .update(`${toolName}:${argsString}`)
            .digest('hex');
        return `${this.CACHE_PREFIX}${toolName}:${hash}`;
    }
    async get(toolName, args) {
        if (!this.isConnected) {
            this.logger.warn('Redis not connected, skipping cache get');
            return null;
        }
        try {
            const key = this.generateCacheKey(toolName, args);
            const cached = await this.client.get(key);
            if (cached) {
                this.logger.log(`🎯 Cache HIT for ${toolName}`);
                return JSON.parse(cached);
            }
            this.logger.log(`❌ Cache MISS for ${toolName}`);
            return null;
        }
        catch (error) {
            this.logger.error(`Cache get error: ${error.message}`);
            return null;
        }
    }
    async set(toolName, args, result, ttl = this.DEFAULT_TTL) {
        if (!this.isConnected) {
            this.logger.warn('Redis not connected, skipping cache set');
            return;
        }
        try {
            const key = this.generateCacheKey(toolName, args);
            await this.client.setEx(key, ttl, JSON.stringify(result));
            this.logger.log(`💾 Cached result for ${toolName} (TTL: ${ttl}s)`);
        }
        catch (error) {
            this.logger.error(`Cache set error: ${error.message}`);
        }
    }
    async invalidate(toolName, args) {
        if (!this.isConnected) {
            return;
        }
        try {
            if (args) {
                const key = this.generateCacheKey(toolName, args);
                await this.client.del(key);
                this.logger.log(`🗑️  Invalidated cache for ${toolName}`);
            }
            else {
                const pattern = `${this.CACHE_PREFIX}${toolName}:*`;
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    await this.client.del(keys);
                    this.logger.log(`🗑️  Invalidated ${keys.length} cache entries for ${toolName}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Cache invalidation error: ${error.message}`);
        }
    }
    async invalidateAll() {
        if (!this.isConnected) {
            return;
        }
        try {
            const keys = await this.client.keys(`${this.CACHE_PREFIX}*`);
            if (keys.length > 0) {
                await this.client.del(keys);
                this.logger.log(`🗑️  Invalidated ${keys.length} total cache entries`);
            }
        }
        catch (error) {
            this.logger.error(`Cache invalidateAll error: ${error.message}`);
        }
    }
    async getStats() {
        if (!this.isConnected) {
            return {
                totalKeys: 0,
                memoryUsage: '0 MB',
                isConnected: false,
            };
        }
        try {
            const keys = await this.client.keys(`${this.CACHE_PREFIX}*`);
            const info = await this.client.info('memory');
            const memoryMatch = info.match(/used_memory_human:(\S+)/);
            const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';
            return {
                totalKeys: keys.length,
                memoryUsage,
                isConnected: true,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get cache stats: ${error.message}`);
            return {
                totalKeys: 0,
                memoryUsage: '0 MB',
                isConnected: this.isConnected,
            };
        }
    }
    isAvailable() {
        return this.isConnected;
    }
    async onModuleDestroy() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.logger.log('Redis connection closed');
        }
    }
};
exports.QueryCacheService = QueryCacheService;
exports.QueryCacheService = QueryCacheService = QueryCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], QueryCacheService);
//# sourceMappingURL=query-cache.service.js.map