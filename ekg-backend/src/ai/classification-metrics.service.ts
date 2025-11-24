import { Injectable, Logger } from '@nestjs/common';

export interface ClassificationMetric {
  timestamp: number;
  level: 'simple' | 'medium' | 'complex';
  type: string;
  duration: number;
  success: boolean;
  method: 'gemini' | 'pattern-fallback';
}

@Injectable()
export class ClassificationMetricsService {
  private readonly logger = new Logger(ClassificationMetricsService.name);
  private metrics: ClassificationMetric[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;

  recordClassification(
    level: 'simple' | 'medium' | 'complex',
    type: string,
    duration: number,
    success: boolean,
    method: 'gemini' | 'pattern-fallback' = 'gemini',
  ) {
    const metric: ClassificationMetric = {
      timestamp: Date.now(),
      level,
      type,
      duration,
      success,
      method,
    };

    this.metrics.push(metric);
    
    // Trim history if needed
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }

    this.logger.debug(
      `Recorded metric: ${level} (${type}) - ${duration}ms - ${method}`,
    );
  }

  getMetricsSummary() {
    const total = this.metrics.length;
    if (total === 0) return { total: 0 };

    const byLevel = this.metrics.reduce((acc, curr) => {
      acc[curr.level] = (acc[curr.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgDuration =
      this.metrics.reduce((acc, curr) => acc + curr.duration, 0) / total;

    const successRate =
      (this.metrics.filter((m) => m.success).length / total) * 100;

    const fallbackRate =
      (this.metrics.filter((m) => m.method === 'pattern-fallback').length /
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
}
