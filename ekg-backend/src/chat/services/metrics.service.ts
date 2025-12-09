/**
 * @fileoverview Metrics Service - Chat Performance Metrics
 * @module chat/services/metrics.service
 *
 * Service thu thập và thống kê performance metrics của chatbot.
 * Lưu trữ in-memory, giới hạn 1000 records.
 *
 * @author APTX3107 Team
 */
import { Injectable } from '@nestjs/common';
import { ChatMetrics } from '../interfaces/chat-metrics.interface';

/**
 * Service thu thập chat metrics.
 */
@Injectable()
export class MetricsService {
  /** Lịch sử metrics */
  private metricsHistory: ChatMetrics[] = [];

  /** Số metrics tối đa lưu trữ */
  private readonly MAX_METRICS = 1000;

  /**
   * Ghi log một metrics entry.
   */
  log(metrics: ChatMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_METRICS) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Lấy thống kê tổng hợp.
   *
   * @returns Object chứa total, success, failed, cache hit rate, avg time, breakdown by level/type
   */
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

  /**
   * Lấy toàn bộ metrics history.
   */
  getAll(): ChatMetrics[] {
    return this.metricsHistory;
  }
}
