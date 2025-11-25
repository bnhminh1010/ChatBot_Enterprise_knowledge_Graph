"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ClassificationMetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationMetricsService = void 0;
const common_1 = require("@nestjs/common");
let ClassificationMetricsService = ClassificationMetricsService_1 = class ClassificationMetricsService {
    logger = new common_1.Logger(ClassificationMetricsService_1.name);
    metrics = [];
    MAX_METRICS_HISTORY = 1000;
    recordClassification(level, type, duration, success, method = 'gemini') {
        const metric = {
            timestamp: Date.now(),
            level,
            type,
            duration,
            success,
            method,
        };
        this.metrics.push(metric);
        if (this.metrics.length > this.MAX_METRICS_HISTORY) {
            this.metrics.shift();
        }
        this.logger.debug(`Recorded metric: ${level} (${type}) - ${duration}ms - ${method}`);
    }
    getMetricsSummary() {
        const total = this.metrics.length;
        if (total === 0)
            return { total: 0 };
        const byLevel = this.metrics.reduce((acc, curr) => {
            acc[curr.level] = (acc[curr.level] || 0) + 1;
            return acc;
        }, {});
        const avgDuration = this.metrics.reduce((acc, curr) => acc + curr.duration, 0) / total;
        const successRate = (this.metrics.filter((m) => m.success).length / total) * 100;
        const fallbackRate = (this.metrics.filter((m) => m.method === 'pattern-fallback').length /
            total) *
            100;
        return {
            total,
            byLevel,
            avgDuration: Math.round(avgDuration),
            successRate: successRate.toFixed(2) + '%',
            fallbackRate: fallbackRate.toFixed(2) + '%',
            recentMetrics: this.metrics.slice(-10),
        };
    }
};
exports.ClassificationMetricsService = ClassificationMetricsService;
exports.ClassificationMetricsService = ClassificationMetricsService = ClassificationMetricsService_1 = __decorate([
    (0, common_1.Injectable)()
], ClassificationMetricsService);
//# sourceMappingURL=classification-metrics.service.js.map