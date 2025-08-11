/**
 * Tests for ErrorStatisticsDashboard
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorStatisticsDashboard } from '../../visualization/ErrorStatisticsDashboard';
import { ErrorStatistics, ErrorSeverityLevel } from '../../visualization/ErrorVisualizationSystem';

describe('ErrorStatisticsDashboard', () => {
  let dashboard: ErrorStatisticsDashboard;
  let mockStatistics: ErrorStatistics;

  beforeEach(() => {
    dashboard = new ErrorStatisticsDashboard({
      refreshInterval: 1000, // 1 second for testing
      maxTrendPoints: 10,
      enableRealTimeUpdates: true
    });

    mockStatistics = {
      totalErrors: 100,
      errorsByType: new Map([
        ['offset_failure', 40],
        ['boolean_failure', 30],
        ['degenerate_geometry', 20],
        ['tolerance_exceeded', 10]
      ]),
      errorsBySeverity: new Map([
        [ErrorSeverityLevel.CRITICAL, 5],
        [ErrorSeverityLevel.HIGH, 25],
        [ErrorSeverityLevel.MEDIUM, 45],
        [ErrorSeverityLevel.LOW, 25]
      ]),
      errorTrends: [
        {
          timestamp: Date.now() - 3 * 60 * 60 * 1000,
          errorCount: 10,
          severity: ErrorSeverityLevel.HIGH,
          type: 'offset_failure'
        },
        {
          timestamp: Date.now() - 2 * 60 * 60 * 1000,
          errorCount: 15,
          severity: ErrorSeverityLevel.MEDIUM,
          type: 'boolean_failure'
        },
        {
          timestamp: Date.now() - 1 * 60 * 60 * 1000,
          errorCount: 8,
          severity: ErrorSeverityLevel.LOW,
          type: 'degenerate_geometry'
        }
      ],
      resolutionRate: 0.75,
      averageResolutionTime: 45000, // 45 seconds
      topErrorTypes: [
        { type: 'offset_failure', count: 40, percentage: 40 },
        { type: 'boolean_failure', count: 30, percentage: 30 },
        { type: 'degenerate_geometry', count: 20, percentage: 20 },
        { type: 'tolerance_exceeded', count: 10, percentage: 10 }
      ]
    };
  });

  afterEach(() => {
    dashboard.stopRealTimeUpdates();
  });

  describe('Dashboard Data Generation', () => {
    test('should generate comprehensive dashboard data', () => {
      const dashboardData = dashboard.generateDashboardData(mockStatistics);

      expect(dashboardData.overview).toBeDefined();
      expect(dashboardData.trends).toBeDefined();
      expect(dashboardData.distribution).toBeDefined();
      expect(dashboardData.topErrors).toBeDefined();
      expect(dashboardData.recommendations).toBeDefined();
    });

    test('should generate correct overview metrics', () => {
      const dashboardData = dashboard.generateDashboardData(mockStatistics);
      const overview = dashboardData.overview;

      expect(overview.totalErrors).toBe(100);
      expect(overview.activeErrors).toBe(25); // 25% unresolved
      expect(overview.resolvedErrors).toBe(75); // 75% resolved
      expect(overview.resolutionRate).toBe(0.75);
      expect(overview.averageResolutionTime).toBe(45000);
      expect(overview.criticalErrors).toBe(5);
      expect(overview.trendDirection).toBe('stable'); // No historical data
    });

    test('should generate trend data for charts', () => {
      const dashboardData = dashboard.generateDashboardData(mockStatistics);
      const trends = dashboardData.trends;

      expect(trends.timeLabels).toBeDefined();
      expect(trends.datasets).toBeDefined();
      expect(trends.datasets.length).toBeGreaterThan(0);

      const criticalDataset = trends.datasets.find(d => d.severity === ErrorSeverityLevel.CRITICAL);
      expect(criticalDataset).toBeDefined();
      expect(criticalDataset!.color).toBeDefined();
    });

    test('should generate distribution data', () => {
      const dashboardData = dashboard.generateDashboardData(mockStatistics);
      const distribution = dashboardData.distribution;

      expect(distribution.byType).toHaveLength(4);
      expect(distribution.byType[0].type).toBe('offset_failure');
      expect(distribution.byType[0].count).toBe(40);
      expect(distribution.byType[0].percentage).toBe(40);

      expect(distribution.bySeverity).toHaveLength(4);
      expect(distribution.byTime).toHaveLength(24); // 24 hours
    });

    test('should generate top error data with trends', () => {
      const dashboardData = dashboard.generateDashboardData(mockStatistics);
      const topErrors = dashboardData.topErrors;

      expect(topErrors).toHaveLength(4);
      expect(topErrors[0].type).toBe('offset_failure');
      expect(topErrors[0].count).toBe(40);
      expect(topErrors[0].percentage).toBe(40);
      expect(topErrors[0].severity).toBeDefined();
      expect(topErrors[0].trend).toBeDefined();
    });
  });

  describe('Recommendations Generation', () => {
    test('should generate low resolution rate recommendation', () => {
      const lowResolutionStats = {
        ...mockStatistics,
        resolutionRate: 0.6 // Below 80% threshold
      };

      const dashboardData = dashboard.generateDashboardData(lowResolutionStats);
      const recommendations = dashboardData.recommendations;

      const resolutionRec = recommendations.find(r => r.id === 'low_resolution_rate');
      expect(resolutionRec).toBeDefined();
      expect(resolutionRec!.type).toBe('immediate');
      expect(resolutionRec!.priority).toBe('high');
    });

    test('should generate critical errors recommendation', () => {
      const criticalErrorStats = {
        ...mockStatistics,
        errorsBySeverity: new Map([
          [ErrorSeverityLevel.CRITICAL, 15], // More critical errors
          [ErrorSeverityLevel.HIGH, 25],
          [ErrorSeverityLevel.MEDIUM, 35],
          [ErrorSeverityLevel.LOW, 25]
        ])
      };

      const dashboardData = dashboard.generateDashboardData(criticalErrorStats);
      const recommendations = dashboardData.recommendations;

      const criticalRec = recommendations.find(r => r.id === 'critical_errors');
      expect(criticalRec).toBeDefined();
      expect(criticalRec!.priority).toBe('high');
      expect(criticalRec!.impact).toContain('Critical');
    });

    test('should generate dominant error type recommendation', () => {
      const dominantErrorStats = {
        ...mockStatistics,
        topErrorTypes: [
          { type: 'offset_failure', count: 70, percentage: 70 }, // Dominant error type
          { type: 'boolean_failure', count: 20, percentage: 20 },
          { type: 'degenerate_geometry', count: 10, percentage: 10 }
        ]
      };

      const dashboardData = dashboard.generateDashboardData(dominantErrorStats);
      const recommendations = dashboardData.recommendations;

      const dominantRec = recommendations.find(r => r.id === 'dominant_error_type');
      expect(dominantRec).toBeDefined();
      expect(dominantRec!.type).toBe('preventive');
      expect(dominantRec!.title).toContain('offset_failure');
    });

    test('should generate slow resolution recommendation', () => {
      const slowResolutionStats = {
        ...mockStatistics,
        averageResolutionTime: 120000 // 2 minutes
      };

      const dashboardData = dashboard.generateDashboardData(slowResolutionStats);
      const recommendations = dashboardData.recommendations;

      const slowRec = recommendations.find(r => r.id === 'slow_resolution');
      expect(slowRec).toBeDefined();
      expect(slowRec!.type).toBe('optimization');
      expect(slowRec!.priority).toBe('low');
    });

    test('should prioritize recommendations correctly', () => {
      const multiIssueStats = {
        ...mockStatistics,
        resolutionRate: 0.5, // Low resolution rate
        errorsBySeverity: new Map([
          [ErrorSeverityLevel.CRITICAL, 10], // Critical errors
          [ErrorSeverityLevel.HIGH, 30],
          [ErrorSeverityLevel.MEDIUM, 40],
          [ErrorSeverityLevel.LOW, 20]
        ]),
        averageResolutionTime: 90000 // Slow resolution
      };

      const dashboardData = dashboard.generateDashboardData(multiIssueStats);
      const recommendations = dashboardData.recommendations;

      expect(recommendations.length).toBeGreaterThan(1);
      
      // High priority recommendations should come first
      const priorities = recommendations.map(r => r.priority);
      const highPriorityCount = priorities.filter(p => p === 'high').length;
      expect(highPriorityCount).toBeGreaterThan(0);
      
      // First recommendation should be high priority
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('Real-time Updates', () => {
    test('should handle subscription and unsubscription', () => {
      const callback = vi.fn();
      const unsubscribe = dashboard.subscribe(callback);

      expect(typeof unsubscribe).toBe('function');
      
      // Unsubscribe should work without errors
      unsubscribe();
    });

    test('should start and stop real-time updates', () => {
      const getStatistics = vi.fn().mockReturnValue(mockStatistics);
      
      dashboard.startRealTimeUpdates(getStatistics);
      expect(getStatistics).not.toHaveBeenCalled(); // Not called immediately

      dashboard.stopRealTimeUpdates();
    });

    test('should notify subscribers on updates', (done) => {
      const callback = vi.fn((data) => {
        expect(data.overview).toBeDefined();
        expect(data.trends).toBeDefined();
        done();
      });

      dashboard.subscribe(callback);

      const getStatistics = vi.fn().mockReturnValue(mockStatistics);
      dashboard.startRealTimeUpdates(getStatistics);

      // Wait for the first update
      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
        dashboard.stopRealTimeUpdates();
      }, 1100); // Slightly longer than refresh interval
    });

    test('should handle callback errors gracefully', () => {
      const faultyCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      dashboard.subscribe(faultyCallback);

      const getStatistics = vi.fn().mockReturnValue(mockStatistics);
      dashboard.startRealTimeUpdates(getStatistics);

      setTimeout(() => {
        dashboard.stopRealTimeUpdates();
        consoleSpy.mockRestore();
      }, 1100);
    });
  });

  describe('Trend Analysis', () => {
    test('should calculate trend direction with historical data', () => {
      // Simulate historical data showing improvement
      const improvingStats = [
        { ...mockStatistics, totalErrors: 150 }, // Older data
        { ...mockStatistics, totalErrors: 120 },
        { ...mockStatistics, totalErrors: 100 }, // Recent data
        { ...mockStatistics, totalErrors: 80 },
        { ...mockStatistics, totalErrors: 60 }
      ];

      // Manually add historical data
      improvingStats.forEach(stats => {
        dashboard.generateDashboardData(stats);
      });

      const dashboardData = dashboard.generateDashboardData(mockStatistics);
      // Trend direction calculation requires multiple data points
      expect(dashboardData.overview.trendDirection).toBeDefined();
    });

    test('should group trends by hour correctly', () => {
      const hourlyTrends = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z').getTime(),
          errorCount: 5,
          severity: ErrorSeverityLevel.HIGH,
          type: 'offset_failure'
        },
        {
          timestamp: new Date('2024-01-01T10:30:00Z').getTime(),
          errorCount: 3,
          severity: ErrorSeverityLevel.MEDIUM,
          type: 'boolean_failure'
        },
        {
          timestamp: new Date('2024-01-01T11:00:00Z').getTime(),
          errorCount: 7,
          severity: ErrorSeverityLevel.HIGH,
          type: 'offset_failure'
        }
      ];

      const statsWithHourlyTrends = {
        ...mockStatistics,
        errorTrends: hourlyTrends
      };

      const dashboardData = dashboard.generateDashboardData(statsWithHourlyTrends);
      expect(dashboardData.trends.timeLabels).toBeDefined();
      expect(dashboardData.trends.datasets).toBeDefined();
    });

    test('should calculate error type trends', () => {
      const trendingStats = {
        ...mockStatistics,
        errorTrends: [
          // Increasing trend for offset_failure
          {
            timestamp: Date.now() - 4 * 60 * 60 * 1000,
            errorCount: 5,
            severity: ErrorSeverityLevel.HIGH,
            type: 'offset_failure'
          },
          {
            timestamp: Date.now() - 3 * 60 * 60 * 1000,
            errorCount: 8,
            severity: ErrorSeverityLevel.HIGH,
            type: 'offset_failure'
          },
          {
            timestamp: Date.now() - 2 * 60 * 60 * 1000,
            errorCount: 12,
            severity: ErrorSeverityLevel.HIGH,
            type: 'offset_failure'
          },
          {
            timestamp: Date.now() - 1 * 60 * 60 * 1000,
            errorCount: 15,
            severity: ErrorSeverityLevel.HIGH,
            type: 'offset_failure'
          }
        ]
      };

      const dashboardData = dashboard.generateDashboardData(trendingStats);
      const offsetError = dashboardData.topErrors.find(e => e.type === 'offset_failure');
      
      expect(offsetError).toBeDefined();
      expect(offsetError!.trend).toBeDefined();
    });
  });

  describe('Data Export', () => {
    test('should export dashboard data correctly', () => {
      const exportData = dashboard.exportData(mockStatistics);
      const parsed = JSON.parse(exportData);

      expect(parsed.dashboardData).toBeDefined();
      expect(parsed.historicalData).toBeDefined();
      expect(parsed.config).toBeDefined();
      expect(parsed.exportTimestamp).toBeDefined();

      expect(parsed.dashboardData.overview).toBeDefined();
      expect(parsed.dashboardData.trends).toBeDefined();
      expect(parsed.dashboardData.distribution).toBeDefined();
      expect(parsed.dashboardData.topErrors).toBeDefined();
      expect(parsed.dashboardData.recommendations).toBeDefined();
    });

    test('should include configuration in export', () => {
      const customDashboard = new ErrorStatisticsDashboard({
        refreshInterval: 5000,
        maxTrendPoints: 50,
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
        }
      });

      const exportData = customDashboard.exportData(mockStatistics);
      const parsed = JSON.parse(exportData);

      expect(parsed.config.refreshInterval).toBe(5000);
      expect(parsed.config.maxTrendPoints).toBe(50);
      expect(parsed.config.chartColors.critical).toBe('#FF0000');
    });
  });

  describe('Configuration', () => {
    test('should use custom configuration', () => {
      const customConfig = {
        refreshInterval: 5000,
        maxTrendPoints: 50,
        enableRealTimeUpdates: false,
        chartColors: {
          critical: '#FF0000',
          high: '#FF6600',
          medium: '#FFAA00',
          low: '#FFDD00',
          warning: '#FFF000',
          info: '#00AAFF',
          background: '#000000', // Custom background
          grid: '#444444', // Custom grid
          text: '#FFFFFF' // Custom text
        }
      };

      const customDashboard = new ErrorStatisticsDashboard(customConfig);
      const dashboardData = customDashboard.generateDashboardData(mockStatistics);

      expect(dashboardData).toBeDefined();
      // Configuration should affect the generated data
    });

    test('should handle disabled real-time updates', () => {
      const disabledDashboard = new ErrorStatisticsDashboard({
        enableRealTimeUpdates: false
      });

      const getStatistics = vi.fn().mockReturnValue(mockStatistics);
      disabledDashboard.startRealTimeUpdates(getStatistics);

      // Should not start updates when disabled
      setTimeout(() => {
        expect(getStatistics).not.toHaveBeenCalled();
      }, 1100);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty statistics', () => {
      const emptyStats: ErrorStatistics = {
        totalErrors: 0,
        errorsByType: new Map(),
        errorsBySeverity: new Map(),
        errorTrends: [],
        resolutionRate: 1.0,
        averageResolutionTime: 0,
        topErrorTypes: []
      };

      const dashboardData = dashboard.generateDashboardData(emptyStats);

      expect(dashboardData.overview.totalErrors).toBe(0);
      expect(dashboardData.overview.resolutionRate).toBe(1.0);
      expect(dashboardData.topErrors).toHaveLength(0);
      expect(dashboardData.recommendations.length).toBe(0);
    });

    test('should handle statistics with only one error type', () => {
      const singleTypeStats: ErrorStatistics = {
        totalErrors: 50,
        errorsByType: new Map([['offset_failure', 50]]),
        errorsBySeverity: new Map([
          [ErrorSeverityLevel.HIGH, 50]
        ]),
        errorTrends: [],
        resolutionRate: 0.8,
        averageResolutionTime: 30000,
        topErrorTypes: [
          { type: 'offset_failure', count: 50, percentage: 100 }
        ]
      };

      const dashboardData = dashboard.generateDashboardData(singleTypeStats);

      expect(dashboardData.overview.totalErrors).toBe(50);
      expect(dashboardData.topErrors).toHaveLength(1);
      expect(dashboardData.topErrors[0].percentage).toBe(100);
    });

    test('should handle very large numbers', () => {
      const largeStats: ErrorStatistics = {
        totalErrors: 1000000,
        errorsByType: new Map([
          ['offset_failure', 500000],
          ['boolean_failure', 300000],
          ['degenerate_geometry', 200000]
        ]),
        errorsBySeverity: new Map([
          [ErrorSeverityLevel.CRITICAL, 100000],
          [ErrorSeverityLevel.HIGH, 400000],
          [ErrorSeverityLevel.MEDIUM, 300000],
          [ErrorSeverityLevel.LOW, 200000]
        ]),
        errorTrends: [],
        resolutionRate: 0.9,
        averageResolutionTime: 60000,
        topErrorTypes: [
          { type: 'offset_failure', count: 500000, percentage: 50 },
          { type: 'boolean_failure', count: 300000, percentage: 30 },
          { type: 'degenerate_geometry', count: 200000, percentage: 20 }
        ]
      };

      const dashboardData = dashboard.generateDashboardData(largeStats);

      expect(dashboardData.overview.totalErrors).toBe(1000000);
      expect(dashboardData.overview.activeErrors).toBe(100000); // 10% unresolved
      expect(dashboardData.overview.resolvedErrors).toBe(900000); // 90% resolved
    });
  });
});