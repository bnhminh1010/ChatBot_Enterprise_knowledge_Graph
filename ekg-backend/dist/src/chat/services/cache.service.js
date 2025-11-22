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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
let CacheService = CacheService_1 = class CacheService {
    cacheManager;
    logger = new common_1.Logger(CacheService_1.name);
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
    }
    async get(key) {
        try {
            const cached = await this.cacheManager.get(key);
            if (cached) {
                this.logger.debug(`Cache HIT: ${key}`);
                return cached;
            }
            this.logger.debug(`Cache MISS: ${key}`);
            return null;
        }
        catch (error) {
            this.logger.warn(`Cache get error: ${error}`);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            await this.cacheManager.set(key, value, ttlSeconds * 1000);
            this.logger.debug(`Cached: ${key} (TTL: ${ttlSeconds}s)`);
        }
        catch (error) {
            this.logger.warn(`Cache set error: ${error}`);
        }
    }
    getCacheKey(message) {
        return `chat:${message.toLowerCase().trim()}`;
    }
    getTTL(level) {
        switch (level) {
            case 'simple':
                return 3600;
            case 'medium':
                return 1800;
            case 'complex':
                return 600;
            default:
                return 600;
        }
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object])
], CacheService);
//# sourceMappingURL=cache.service.js.map