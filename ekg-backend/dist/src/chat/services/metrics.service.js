"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
let MetricsService = class MetricsService {
    metricsHistory = [];
    MAX_METRICS = 1000;
    log(metrics) {
        this.metricsHistory.push(metrics);
        if (this.metricsHistory.length > this.MAX_METRICS) {
            this.metricsHistory.shift();
        }
    }
    getStats() {
        const total = this.metricsHistory.length;
        const success = this.metricsHistory.filter((m) => m.success).length;
        const failed = total - success;
        const cached = this.metricsHistory.filter((m) => m.fromCache).length;
        const cacheHitRate = total > 0 ? (cached / total) * 100 : 0;
        const avgProcessingTime = total > 0
            ? this.metricsHistory.reduce((sum, m) => sum + m.processingTime, 0) /
                total
            : 0;
        const byLevel = {};
        const byType = {};
        this.metricsHistory.forEach((m) => {
            byLevel[m.queryLevel] = (byLevel[m.queryLevel] || 0) + 1;
            byType[m.queryType] = (byType[m.queryType] || 0) + 1;
        });
        return {
            total,
            success,
            failed,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
            byLevel,
            byType,
            recentQueries: this.metricsHistory.slice(-10),
        };
    }
    getAll() {
        return this.metricsHistory;
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)()
], MetricsService);
//# sourceMappingURL=metrics.service.js.map