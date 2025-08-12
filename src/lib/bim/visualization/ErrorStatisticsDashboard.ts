/**
 * Error statistics dashboard with trend analysis
 */

import type { ErrorStatistics, ErrorTrend } from './ErrorVisualizationSystem';
import { ErrorSeverityLevel } from './ErrorVisualizationSystem';

export interface DashboardConfig {
  refreshInterval: number;
  maxTrendPoints: number;
  enableRealTimeUpdates: boolean;
  chartColors: ChartColorScheme;
}

export interface ChartColorScheme {
  critical: string;
  high: string;
  medium: string;
  low: string;
  warning: string;
  info: string;
  background: string;
  grid: string;
  text: string;
}

export interface DashboardData {
  overview: OverviewMetrics;
  trends: TrendData;
  distribution: DistributionData;
  topErrors: TopErrorData[];
  recommendations: DashboardRecommendation[];
}

export interface OverviewMetrics {
  totalErrors: number;
  activeErrors: number;
  resolvedErrors: number;
  resolutionRate: number;
  averageResolutionTime: number;
  criticalErrors: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
}

export interface TrendData {
  timeLabels: string[];
  datasets: TrendDataset[];
}

export interface TrendDataset {
  label: string;
  data: number[];
  color: string;
  severity: ErrorSeverityLevel;
}

export interface DistributionData {
  byType: Array<{ type: string; count: number; percentage: number; color: string }>;
  bySeverity: Array<{ severity: ErrorSeverityLevel; count: number; percentage: number; color: string }>;
  byTime: Array<{ hour: number; count: number }>;
}

export interface TopErrorData {
  type: string;
  count: number;
  percentage: number;
  severity: ErrorSeverityLevel;
  trend: 'increasing' | 'stable' | 'decreasing';
  lastOccurrence: number;
  averageResolutionTime: number;
}

export interface DashboardRecommendation {
  id: string;
  type: 'immediate' | 'preventive' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: string;
  relatedErrors: string[];
}

export class ErrorStatisticsDashboard {
  private config: DashboardConfig;
  private updateCallbacks: Array<(data: DashboardData) => void> = [];
  private updateInterval?: NodeJS.Timeout;
  private historicalData: ErrorStatistics[] = [];

  constructor(config?: Partial<DashboardConfig>) {
    this.config = {
      refreshInterval: 30000, // 30 seconds
      maxTrendPoints: 24, // 24 hours
      enableRealTimeUpdates: true,
      chartColors: {
        critical: '#FF0000',
        high: '#FF6600',
        medium: '#FFAA00',
        low: '#FFDD00',
        warning: '#FFF000',
        info: '#00AAFF',
        background: '#FFFFFF',
        grid: '#E0E0E0',
        text: '#333333'
      },
      ...config
    };
  }

  /**
   * Generate dashboard data from error statistics
   */
  generateDashboardData(statistics: ErrorStatistics): DashboardData {
    const overview = this.generateOverviewMetrics(statistics);
    const trends = this.generateTrendData(statistics);
    const distribution = this.generateDistributionData(statistics);
    const topErrors = this.generateTopErrorData(statistics);
    const recommendations = this.generateRecommendations(statistics);

    return {
      overview,
      trends,
      distribution,
      topErrors,
      recommendations
    };
  }

  /**
   * Subscribe to dashboard updates
   */
  subscribe(callback: (data: DashboardData) => void): () => void {
    this.updateCallbacks.push(callback);
    
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Start real-time updates
   */
  startRealTimeUpdates(getStatistics: () => ErrorStatistics): void {
    if (!this.config.enableRealTimeUpdates) return;

    this.updateInterval = setInterval(() => {
      const statistics = getStatistics();
      this.historicalData.push(statistics);
      
      // Keep only recent data
      if (this.historicalData.length > this.config.maxTrendPoints) {
        this.historicalData = this.historicalData.slice(-this.config.maxTrendPoints);
      }

      const dashboardData = this.generateDashboardData(statistics);
      this.notifySubscribers(dashboardData);
    }, this.config.refreshInterval);
  }

  /**
   * Stop real-time updates
   */
  stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * Export dashboard data
   */
  exportData(statistics: ErrorStatistics): string {
    const dashboardData = this.generateDashboardData(statistics);
    
    return JSON.stringify({
      dashboardData,
      historicalData: this.historicalData,
      config: this.config,
      exportTimestamp: Date.now()
    }, null, 2);
  }

  /**
   * Generate overview metrics
   */
  private generateOverviewMetrics(statistics: ErrorStatistics): OverviewMetrics {
    const criticalErrors = statistics.errorsBySeverity.get(ErrorSeverityLevel.CRITICAL) || 0;
    const activeErrors = statistics.totalErrors - (statistics.totalErrors * statistics.resolutionRate);
    const resolvedErrors = statistics.totalErrors * statistics.resolutionRate;
    
    const trendDirection = this.calculateTrendDirection(statistics);

    return {
      totalErrors: statistics.totalErrors,
      activeErrors: Math.round(activeErrors),
      resolvedErrors: Math.round(resolvedErrors),
      resolutionRate: statistics.resolutionRate,
      averageResolutionTime: statistics.averageResolutionTime,
      criticalErrors,
      trendDirection
    };
  }

  /**
   * Generate trend data for charts
   */
  private generateTrendData(statistics: ErrorStatistics): TrendData {
    const timeLabels: string[] = [];
    const datasets: Map<ErrorSeverityLevel, number[]> = new Map();

    // Initialize datasets
    Object.values(ErrorSeverityLevel).forEach(severity => {
      datasets.set(severity, []);
    });

    // Process trend data
    const trendsByHour = this.groupTrendsByHour(statistics.errorTrends);
    
    trendsByHour.forEach((trends, hour) => {
      timeLabels.push(this.formatHourLabel(hour));
      
      Object.values(ErrorSeverityLevel).forEach(severity => {
        const count = trends.filter(t => t.severity === severity)
          .reduce((sum, t) => sum + t.errorCount, 0);
        datasets.get(severity)!.push(count);
      });
    });

    const trendDatasets: TrendDataset[] = Array.from(datasets.entries()).map(([severity, data]) => ({
      label: this.formatSeverityLabel(severity),
      data,
      color: this.config.chartColors[severity],
      severity
    }));

    return {
      timeLabels,
      datasets: trendDatasets
    };
  }

  /**
   * Generate distribution data
   */
  private generateDistributionData(statistics: ErrorStatistics): DistributionData {
    const byType = Array.from(statistics.errorsByType.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: (count / statistics.totalErrors) * 100,
      color: this.getTypeColor(type)
    }));

    const bySeverity = Array.from(statistics.errorsBySeverity.entries()).map(([severity, count]) => ({
      severity,
      count,
      percentage: (count / statistics.totalErrors) * 100,
      color: this.config.chartColors[severity]
    }));

    const byTime = this.generateHourlyDistribution(statistics.errorTrends);

    return {
      byType,
      bySeverity,
      byTime
    };
  }

  /**
   * Generate top error data
   */
  private generateTopErrorData(statistics: ErrorStatistics): TopErrorData[] {
    return statistics.topErrorTypes.map(errorType => {
      const trend = this.calculateErrorTypeTrend(errorType.type, statistics.errorTrends);
      const lastOccurrence = this.getLastOccurrence(errorType.type, statistics.errorTrends);
      const severity = this.inferSeverityFromType(errorType.type);
      
      return {
        type: errorType.type,
        count: errorType.count,
        percentage: errorType.percentage,
        severity,
        trend,
        lastOccurrence,
        averageResolutionTime: statistics.averageResolutionTime // Simplified
      };
    });
  }

  /**
   * Generate recommendations based on error patterns
   */
  private generateRecommendations(statistics: ErrorStatistics): DashboardRecommendation[] {
    const recommendations: DashboardRecommendation[] = [];

    // High error rate recommendation
    if (statistics.resolutionRate < 0.8) {
      recommendations.push({
        id: 'low_resolution_rate',
        type: 'immediate',
        priority: 'high',
        title: 'Improve Error Resolution Rate',
        description: `Current resolution rate is ${(statistics.resolutionRate * 100).toFixed(1)}%. Focus on resolving active errors.`,
        impact: 'High - Reduces system instability',
        effort: 'Medium - Requires investigation and fixes',
        relatedErrors: Array.from(statistics.errorsByType.keys()).slice(0, 3)
      });
    }

    // Critical errors recommendation
    const criticalCount = statistics.errorsBySeverity.get(ErrorSeverityLevel.CRITICAL) || 0;
    if (criticalCount > 0) {
      recommendations.push({
        id: 'critical_errors',
        type: 'immediate',
        priority: 'high',
        title: 'Address Critical Errors',
        description: `${criticalCount} critical errors require immediate attention.`,
        impact: 'Critical - System stability at risk',
        effort: 'High - Requires immediate action',
        relatedErrors: ['critical_errors']
      });
    }

    // Top error type recommendation
    if (statistics.topErrorTypes.length > 0) {
      const topError = statistics.topErrorTypes[0];
      if (topError.percentage > 30) {
        recommendations.push({
          id: 'dominant_error_type',
          type: 'preventive',
          priority: 'medium',
          title: `Reduce ${topError.type} Errors`,
          description: `${topError.type} accounts for ${topError.percentage.toFixed(1)}% of all errors. Consider systematic fixes.`,
          impact: 'Medium - Reduces overall error rate',
          effort: 'Medium - Requires pattern analysis',
          relatedErrors: [topError.type]
        });
      }
    }

    // Long resolution time recommendation
    if (statistics.averageResolutionTime > 60000) { // 1 minute
      recommendations.push({
        id: 'slow_resolution',
        type: 'optimization',
        priority: 'low',
        title: 'Optimize Error Resolution Time',
        description: `Average resolution time is ${(statistics.averageResolutionTime / 1000).toFixed(1)} seconds. Consider automation.`,
        impact: 'Low - Improves efficiency',
        effort: 'Medium - Requires process optimization',
        relatedErrors: []
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(_statistics: ErrorStatistics): 'improving' | 'stable' | 'degrading' {
    if (this.historicalData.length < 2) return 'stable';

    const recent = this.historicalData.slice(-3);
    const older = this.historicalData.slice(-6, -3);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, s) => sum + s.totalErrors, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.totalErrors, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change < -0.1) return 'improving';
    if (change > 0.1) return 'degrading';
    return 'stable';
  }

  /**
   * Group trends by hour
   */
  private groupTrendsByHour(trends: ErrorTrend[]): Map<number, ErrorTrend[]> {
    const grouped = new Map<number, ErrorTrend[]>();

    trends.forEach(trend => {
      const hour = new Date(trend.timestamp).getHours();
      if (!grouped.has(hour)) {
        grouped.set(hour, []);
      }
      grouped.get(hour)!.push(trend);
    });

    return grouped;
  }

  /**
   * Format hour label for charts
   */
  private formatHourLabel(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  /**
   * Format severity label
   */
  private formatSeverityLabel(severity: ErrorSeverityLevel): string {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  }

  /**
   * Get color for error type
   */
  private getTypeColor(type: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * Generate hourly distribution
   */
  private generateHourlyDistribution(trends: ErrorTrend[]): Array<{ hour: number; count: number }> {
    const hourlyCount = new Array(24).fill(0);

    trends.forEach(trend => {
      const hour = new Date(trend.timestamp).getHours();
      hourlyCount[hour] += trend.errorCount;
    });

    return hourlyCount.map((count, hour) => ({ hour, count }));
  }

  /**
   * Calculate error type trend
   */
  private calculateErrorTypeTrend(
    errorType: string,
    trends: ErrorTrend[]
  ): 'increasing' | 'stable' | 'decreasing' {
    const typeTrends = trends.filter(t => t.type === errorType);
    if (typeTrends.length < 4) return 'stable';

    const recent = typeTrends.slice(-2);
    const older = typeTrends.slice(-4, -2);

    const recentSum = recent.reduce((sum, t) => sum + t.errorCount, 0);
    const olderSum = older.reduce((sum, t) => sum + t.errorCount, 0);

    if (recentSum > olderSum * 1.2) return 'increasing';
    if (recentSum < olderSum * 0.8) return 'decreasing';
    return 'stable';
  }

  /**
   * Get last occurrence of error type
   */
  private getLastOccurrence(errorType: string, trends: ErrorTrend[]): number {
    const typeTrends = trends.filter(t => t.type === errorType);
    if (typeTrends.length === 0) return 0;

    return Math.max(...typeTrends.map(t => t.timestamp));
  }

  /**
   * Infer severity from error type
   */
  private inferSeverityFromType(errorType: string): ErrorSeverityLevel {
    const severityMap: Record<string, ErrorSeverityLevel> = {
      'offset_failure': ErrorSeverityLevel.HIGH,
      'boolean_failure': ErrorSeverityLevel.HIGH,
      'self_intersection': ErrorSeverityLevel.MEDIUM,
      'degenerate_geometry': ErrorSeverityLevel.MEDIUM,
      'tolerance_exceeded': ErrorSeverityLevel.LOW,
      'numerical_instability': ErrorSeverityLevel.CRITICAL
    };

    return severityMap[errorType] || ErrorSeverityLevel.MEDIUM;
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(data: DashboardData): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in dashboard callback:', error);
      }
    });
  }
}