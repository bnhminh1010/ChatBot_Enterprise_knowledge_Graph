import { Injectable } from '@nestjs/common';
import { ChatMetrics } from '../interfaces/chat-metrics.interface';

@Injectable()
export class MetricsService {
  private metricsHistory: ChatMetrics[] = [];
  private readonly MAX_METRICS = 1000;

  log(metrics: ChatMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_METRICS) {
      this.metricsHistory.shift();
    }
  }

  getStats(): {
    total: number;
    success: number;
    failed: number;
    cacheHitRate: number;
    avgProcessingTime: number;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
    recentQueries: ChatMetrics[];
  } {
    const total = this.metricsHistory.length;
    const success = this.metricsHistory.filter((m) => m.success).length;
    const failed = total - success;
    const cached = this.metricsHistory.filter((m) => m.fromCache).length;
    const cacheHitRate = total > 0 ? (cached / total) * 100 : 0;

    const avgProcessingTime =
      total > 0
        ? this.metricsHistory.reduce((sum, m) => sum + m.processingTime, 0) /
          total
        : 0;

    const byLevel: Record<string, number> = {};
    const byType: Record<string, number> = {};

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

  getAll(): ChatMetrics[] {
    return this.metricsHistory;
  }
}
