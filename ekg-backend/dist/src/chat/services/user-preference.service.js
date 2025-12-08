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
var UserPreferenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPreferenceService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let UserPreferenceService = UserPreferenceService_1 = class UserPreferenceService {
    logger = new common_1.Logger(UserPreferenceService_1.name);
    redis;
    TTL_DAYS = 30;
    constructor() {
        this.redis = new ioredis_1.Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
        });
    }
    async getPreferences(userId) {
        try {
            const data = await this.redis.get(`user_prefs:${userId}`);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            this.logger.error(`Failed to get preferences: ${error}`);
            return null;
        }
    }
    createDefaultPreferences(userId) {
        return {
            userId,
            frequentTopics: [],
            preferredResponseStyle: 'auto',
            frequentlyAskedEntities: [],
            averageQueryLength: 0,
            preferredTimeOfDay: 'unknown',
            totalQueries: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    }
    async recordQuery(userId, query, detectedEntities, detectedTopic) {
        try {
            let prefs = await this.getPreferences(userId);
            if (!prefs) {
                prefs = this.createDefaultPreferences(userId);
            }
            const now = Date.now();
            const existingTopic = prefs.frequentTopics.find((t) => t.topic === detectedTopic);
            if (existingTopic) {
                existingTopic.count++;
                existingTopic.lastAsked = now;
            }
            else {
                prefs.frequentTopics.push({
                    topic: detectedTopic,
                    count: 1,
                    lastAsked: now,
                });
            }
            prefs.frequentTopics = prefs.frequentTopics
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            for (const entity of detectedEntities) {
                const key = `${entity.type}:${entity.value}`;
                const existingEntity = prefs.frequentlyAskedEntities.find((e) => `${e.type}:${e.value}` === key);
                if (existingEntity) {
                    existingEntity.count++;
                    existingEntity.lastAsked = now;
                }
                else {
                    prefs.frequentlyAskedEntities.push({
                        type: entity.type,
                        value: entity.value,
                        count: 1,
                        lastAsked: now,
                    });
                }
            }
            prefs.frequentlyAskedEntities = prefs.frequentlyAskedEntities
                .sort((a, b) => b.count - a.count)
                .slice(0, 20);
            const newTotal = prefs.totalQueries + 1;
            prefs.averageQueryLength = Math.round((prefs.averageQueryLength * prefs.totalQueries + query.length) / newTotal);
            prefs.totalQueries = newTotal;
            const hour = new Date().getHours();
            if (hour >= 6 && hour < 12) {
                prefs.preferredTimeOfDay = 'morning';
            }
            else if (hour >= 12 && hour < 18) {
                prefs.preferredTimeOfDay = 'afternoon';
            }
            else {
                prefs.preferredTimeOfDay = 'evening';
            }
            prefs.updatedAt = now;
            await this.redis.setex(`user_prefs:${userId}`, this.TTL_DAYS * 24 * 60 * 60, JSON.stringify(prefs));
            this.logger.debug(`Updated preferences for user ${userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to record query: ${error}`);
        }
    }
    async getPersonalizationHints(userId) {
        const prefs = await this.getPreferences(userId);
        if (!prefs) {
            return {
                topTopics: [],
                frequentEntities: [],
                suggestedResponseStyle: 'auto',
            };
        }
        return {
            topTopics: prefs.frequentTopics.slice(0, 5).map((t) => t.topic),
            frequentEntities: prefs.frequentlyAskedEntities.slice(0, 10).map((e) => ({
                type: e.type,
                value: e.value,
            })),
            suggestedResponseStyle: prefs.preferredResponseStyle,
        };
    }
    async setResponseStyle(userId, style) {
        let prefs = await this.getPreferences(userId);
        if (!prefs) {
            prefs = this.createDefaultPreferences(userId);
        }
        prefs.preferredResponseStyle = style;
        prefs.updatedAt = Date.now();
        await this.redis.setex(`user_prefs:${userId}`, this.TTL_DAYS * 24 * 60 * 60, JSON.stringify(prefs));
    }
    async getUserStats(userId) {
        const prefs = await this.getPreferences(userId);
        if (!prefs) {
            return {
                totalQueries: 0,
                topTopic: null,
                favoriteEntity: null,
                memberSince: null,
            };
        }
        return {
            totalQueries: prefs.totalQueries,
            topTopic: prefs.frequentTopics[0]?.topic || null,
            favoriteEntity: prefs.frequentlyAskedEntities[0]
                ? `${prefs.frequentlyAskedEntities[0].type}: ${prefs.frequentlyAskedEntities[0].value}`
                : null,
            memberSince: prefs.createdAt,
        };
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.UserPreferenceService = UserPreferenceService;
exports.UserPreferenceService = UserPreferenceService = UserPreferenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UserPreferenceService);
//# sourceMappingURL=user-preference.service.js.map