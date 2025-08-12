/**
 * Gradual Rollout System Tests
 * Ensures smooth transition between basic and BIM modes
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GradualRolloutSystem } from '../GradualRolloutSystem';
import { FeatureFlagManager } from '../../compatibility/FeatureFlagManager';
import type { RolloutConfig, ABTestConfig, MonitoringMetrics } from '../GradualRolloutSystem';

describe('GradualRolloutSystem', () => {
  let rolloutSystem: GradualRolloutSystem;
  let featureFlags: FeatureFlagManager;

  beforeEach(() => {
    featureFlags = new FeatureFlagManager();
    rolloutSystem = new GradualRolloutSystem(featureFlags);
    
    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    rolloutSystem.destroy();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Rollout Configuration', () => {
    it('should initialize with default rollout configurations', () => {
      const statuses = rolloutSystem.getRolloutStatuses();
      
      expect(statuses.size).toBeGreaterThan(0);
      
      // Check for key BIM features
      expect(statuses.has('adaptive-tolerance')).toBe(true);
      expect(statuses.has('bim-intersection-algorithms')).toBe(true);
      expect(statuses.has('bim-wall-rendering')).toBe(true);
      
      // All should start at 0% rollout
      statuses.forEach(status => {
        expect(status.currentPercentage).toBe(0);
        expect(status.status).toBe('not_started');
      });
    });

    it('should allow custom rollout configuration', () => {
      const customConfig: Partial<RolloutConfig> = {
        rolloutPercentage: 50,
        rolloutStrategy: 'exponential',
        rolloutDuration: 7
      };

      const success = rolloutSystem.startRollout('adaptive-tolerance', customConfig);
      expect(success).toBe(true);

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('adaptive-tolerance');
      
      expect(status?.status).toBe('in_progress');
      expect(status?.targetPercentage).toBe(50);
    });
  });

  describe('Linear Rollout Strategy', () => {
    it('should execute linear rollout correctly', () => {
      const success = rolloutSystem.startRollout('adaptive-tolerance', {
        rolloutPercentage: 100,
        rolloutStrategy: 'linear',
        rolloutDuration: 10 // 10 days
      });

      expect(success).toBe(true);

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('adaptive-tolerance');
      expect(status?.status).toBe('in_progress');

      // Advance time to trigger rollout steps
      const stepDuration = (10 * 24 * 60 * 60 * 1000) / 10; // 10 steps over 10 days
      
      // First step should increase percentage
      vi.advanceTimersByTime(stepDuration);
      
      const updatedStatuses = rolloutSystem.getRolloutStatuses();
      const updatedStatus = updatedStatuses.get('adaptive-tolerance');
      expect(updatedStatus?.currentPercentage).toBeGreaterThan(0);
    });

    it('should complete rollout when target percentage is reached', () => {
      rolloutSystem.startRollout('adaptive-tolerance', {
        rolloutPercentage: 10,
        rolloutStrategy: 'linear',
        rolloutDuration: 1 // 1 day for quick test
      });

      // Advance time to complete rollout
      const totalDuration = 1 * 24 * 60 * 60 * 1000; // 1 day
      vi.advanceTimersByTime(totalDuration + 1000); // Add buffer

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('adaptive-tolerance');
      expect(status?.status).toBe('completed');
      expect(status?.currentPercentage).toBe(10);
    });
  });

  describe('Exponential Rollout Strategy', () => {
    it('should execute exponential rollout with increasing percentages', () => {
      rolloutSystem.startRollout('bim-intersection-algorithms', {
        rolloutPercentage: 100,
        rolloutStrategy: 'exponential',
        rolloutDuration: 8 // 8 days
      });

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('bim-intersection-algorithms');
      expect(status?.status).toBe('in_progress');

      // Advance through exponential steps
      const stepDuration = (8 * 24 * 60 * 60 * 1000) / 8; // 8 steps
      
      vi.advanceTimersByTime(stepDuration);
      
      const updatedStatuses = rolloutSystem.getRolloutStatuses();
      const updatedStatus = updatedStatuses.get('bim-intersection-algorithms');
      expect(updatedStatus?.currentPercentage).toBe(1); // First exponential step
    });
  });

  describe('Manual Rollout Strategy', () => {
    it('should allow manual control of rollout percentage', () => {
      rolloutSystem.startRollout('bim-wall-rendering', {
        rolloutStrategy: 'manual',
        rolloutPercentage: 100
      });

      // Manually update percentage
      const success = rolloutSystem.updateRolloutPercentage('bim-wall-rendering', 25);
      expect(success).toBe(true);

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('bim-wall-rendering');
      expect(status?.currentPercentage).toBe(25);
    });

    it('should complete rollout when manually set to target percentage', () => {
      rolloutSystem.startRollout('bim-wall-rendering', {
        rolloutStrategy: 'manual',
        rolloutPercentage: 50
      });

      rolloutSystem.updateRolloutPercentage('bim-wall-rendering', 50);

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('bim-wall-rendering');
      expect(status?.status).toBe('completed');
    });
  });

  describe('Rollout Control', () => {
    it('should pause and resume rollout correctly', () => {
      rolloutSystem.startRollout('adaptive-tolerance', {
        rolloutStrategy: 'linear',
        rolloutDuration: 10
      });

      // Pause rollout
      const pauseSuccess = rolloutSystem.pauseRollout('adaptive-tolerance');
      expect(pauseSuccess).toBe(true);

      let statuses = rolloutSystem.getRolloutStatuses();
      let status = statuses.get('adaptive-tolerance');
      expect(status?.status).toBe('paused');

      // Resume rollout
      const resumeSuccess = rolloutSystem.resumeRollout('adaptive-tolerance');
      expect(resumeSuccess).toBe(true);

      statuses = rolloutSystem.getRolloutStatuses();
      status = statuses.get('adaptive-tolerance');
      expect(status?.status).toBe('in_progress');
    });

    it('should not pause rollout that is not in progress', () => {
      const success = rolloutSystem.pauseRollout('adaptive-tolerance');
      expect(success).toBe(false);
    });

    it('should not resume rollout that is not paused', () => {
      rolloutSystem.startRollout('adaptive-tolerance');
      const success = rolloutSystem.resumeRollout('adaptive-tolerance');
      expect(success).toBe(false);
    });
  });

  describe('A/B Testing', () => {
    it('should start A/B test successfully', () => {
      const testConfig: ABTestConfig = {
        testName: 'bim-rendering-test',
        featureName: 'bim-wall-rendering',
        controlGroup: 'legacy',
        treatmentGroup: 'bim',
        splitPercentage: 50,
        testDuration: 14,
        successMetrics: ['render_performance', 'user_satisfaction'],
        minimumSampleSize: 100
      };

      const success = rolloutSystem.startABTest(testConfig);
      expect(success).toBe(true);

      const results = rolloutSystem.getABTestResults();
      expect(results.has('bim-rendering-test')).toBe(true);

      const result = results.get('bim-rendering-test');
      expect(result?.status).toBe('running');
      expect(result?.recommendation).toBe('continue_testing');
    });

    it('should not start duplicate A/B test', () => {
      const testConfig: ABTestConfig = {
        testName: 'duplicate-test',
        featureName: 'bim-wall-rendering',
        controlGroup: 'legacy',
        treatmentGroup: 'bim',
        splitPercentage: 50,
        testDuration: 14,
        successMetrics: ['performance'],
        minimumSampleSize: 100
      };

      const firstStart = rolloutSystem.startABTest(testConfig);
      expect(firstStart).toBe(true);

      const secondStart = rolloutSystem.startABTest(testConfig);
      expect(secondStart).toBe(false);
    });

    it('should update A/B test metrics and calculate recommendations', () => {
      const testConfig: ABTestConfig = {
        testName: 'performance-test',
        featureName: 'bim-intersection-algorithms',
        controlGroup: 'legacy',
        treatmentGroup: 'bim',
        splitPercentage: 50,
        testDuration: 7,
        successMetrics: ['performance', 'accuracy'],
        minimumSampleSize: 50
      };

      rolloutSystem.startABTest(testConfig);

      // Update with positive metrics
      rolloutSystem.updateABTestMetrics('performance-test', {
        performance: { control: 100, treatment: 120 }, // 20% improvement
        accuracy: { control: 95, treatment: 98 } // 3% improvement
      });

      const results = rolloutSystem.getABTestResults();
      const result = results.get('performance-test');

      expect(result?.metrics.performance.improvement).toBeCloseTo(20, 1);
      expect(result?.metrics.accuracy.improvement).toBeCloseTo(3.16, 1);
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should record monitoring metrics', () => {
      const metrics: Partial<MonitoringMetrics> = {
        errorRate: 1.5,
        performanceImpact: 5.0,
        userSatisfaction: 85,
        adoptionRate: 25
      };

      rolloutSystem.recordMetrics('bim-wall-rendering', metrics);

      const recordedMetrics = rolloutSystem.getMonitoringMetrics('bim-wall-rendering', 1);
      expect(recordedMetrics.length).toBe(1);
      expect(recordedMetrics[0].errorRate).toBe(1.5);
      expect(recordedMetrics[0].performanceImpact).toBe(5.0);
    });

    it('should filter metrics by time range', () => {
      // Record metrics at different times
      rolloutSystem.recordMetrics('test-feature', { errorRate: 1.0 });
      
      // Advance time by 2 hours
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);
      rolloutSystem.recordMetrics('test-feature', { errorRate: 2.0 });

      // Get metrics for last 1 hour (should only get the recent one)
      const recentMetrics = rolloutSystem.getMonitoringMetrics('test-feature', 1);
      expect(recentMetrics.length).toBe(1);
      expect(recentMetrics[0].errorRate).toBe(2.0);

      // Get metrics for last 3 hours (should get both)
      const allMetrics = rolloutSystem.getMonitoringMetrics('test-feature', 3);
      expect(allMetrics.length).toBe(2);
    });
  });

  describe('Rollback System', () => {
    it('should trigger rollback when error rate exceeds threshold', async () => {
      // Start rollout
      rolloutSystem.startRollout('bim-wall-rendering', {
        rollbackThreshold: 2.0 // 2% error rate threshold
      });

      // Record high error rate
      rolloutSystem.recordMetrics('bim-wall-rendering', {
        errorRate: 3.0 // Exceeds threshold
      });

      // Allow async rollback to complete
      await vi.runAllTimersAsync();

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('bim-wall-rendering');
      expect(status?.status).toBe('rolled_back');
    });

    it('should not trigger rollback when metrics are within threshold', () => {
      rolloutSystem.startRollout('bim-wall-rendering', {
        rollbackThreshold: 5.0 // 5% error rate threshold
      });

      // Record acceptable error rate
      rolloutSystem.recordMetrics('bim-wall-rendering', {
        errorRate: 2.0 // Within threshold
      });

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('bim-wall-rendering');
      expect(status?.status).not.toBe('rolled_back');
    });

    it('should execute rollback steps in correct order', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Trigger rollback
      await rolloutSystem.triggerRollback('bim-wall-rendering', 'Test rollback');

      // Check that rollback steps were logged in order
      const logCalls = consoleSpy.mock.calls.map(call => call[0]);
      const rollbackStepLogs = logCalls.filter(log => 
        typeof log === 'string' && log.includes('Executing rollback step')
      );

      expect(rollbackStepLogs.length).toBeGreaterThan(0);
      
      // Steps should be executed in order (1, 2, 3, ...)
      rollbackStepLogs.forEach((log, index) => {
        expect(log).toContain(`step ${index + 1}`);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive rollout report', () => {
      // Start some rollouts
      rolloutSystem.startRollout('adaptive-tolerance');
      rolloutSystem.updateRolloutPercentage('adaptive-tolerance', 25);

      // Start A/B test
      const testConfig: ABTestConfig = {
        testName: 'test-report',
        featureName: 'bim-wall-rendering',
        controlGroup: 'legacy',
        treatmentGroup: 'bim',
        splitPercentage: 50,
        testDuration: 7,
        successMetrics: ['performance'],
        minimumSampleSize: 50
      };
      rolloutSystem.startABTest(testConfig);

      const report = rolloutSystem.generateRolloutReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('# BIM Feature Rollout Report');
      expect(report).toContain('## Rollout Status Summary');
      expect(report).toContain('## A/B Test Results');
      expect(report).toContain('adaptive-tolerance');
      expect(report).toContain('test-report');
    });

    it('should include timestamps in report', () => {
      const report = rolloutSystem.generateRolloutReport();
      
      // Should contain ISO timestamp
      expect(report).toMatch(/Generated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid feature names gracefully', () => {
      const success = rolloutSystem.startRollout('non-existent-feature');
      expect(success).toBe(false);

      const updateSuccess = rolloutSystem.updateRolloutPercentage('non-existent-feature', 50);
      expect(updateSuccess).toBe(false);
    });

    it('should handle rollback for feature without rollback plan', async () => {
      const success = await rolloutSystem.triggerRollback('non-existent-feature', 'Test');
      expect(success).toBe(false);
    });

    it('should continue rollout even if monitoring fails', () => {
      rolloutSystem.startRollout('adaptive-tolerance');

      // Simulate monitoring error by recording invalid metrics
      expect(() => {
        rolloutSystem.recordMetrics('adaptive-tolerance', {
          errorRate: NaN,
          performanceImpact: Infinity
        });
      }).not.toThrow();

      const statuses = rolloutSystem.getRolloutStatuses();
      const status = statuses.get('adaptive-tolerance');
      expect(status?.status).toBe('in_progress');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent rollouts', () => {
      const features = ['adaptive-tolerance', 'bim-intersection-algorithms', 'bim-wall-rendering'];
      
      features.forEach(feature => {
        const success = rolloutSystem.startRollout(feature);
        expect(success).toBe(true);
      });

      const statuses = rolloutSystem.getRolloutStatuses();
      features.forEach(feature => {
        expect(statuses.get(feature)?.status).toBe('in_progress');
      });
    });

    it('should limit monitoring data to prevent memory leaks', () => {
      // Record many metrics
      for (let i = 0; i < 1500; i++) {
        rolloutSystem.recordMetrics('test-feature', { errorRate: i % 10 });
      }

      const metrics = rolloutSystem.getMonitoringMetrics('test-feature', 24 * 365); // 1 year
      expect(metrics.length).toBeLessThanOrEqual(1000); // Should be capped at 1000
    });

    it('should clean up timers on destroy', () => {
      rolloutSystem.startRollout('adaptive-tolerance');
      rolloutSystem.startRollout('bim-intersection-algorithms');

      // Should have active timers
      expect(rolloutSystem['rolloutTimers'].size).toBeGreaterThan(0);

      rolloutSystem.destroy();

      // Timers should be cleared
      expect(rolloutSystem['rolloutTimers'].size).toBe(0);
    });
  });

  describe('Integration with Feature Flags', () => {
    it('should update feature flag rollout percentage', () => {
      rolloutSystem.updateRolloutPercentage('adaptive-tolerance', 30);

      const feature = featureFlags.getFeature('adaptive-tolerance');
      expect(feature?.rolloutPercentage).toBe(30);
    });

    it('should disable feature flag during rollback', async () => {
      featureFlags.enable('bim-wall-rendering');
      expect(featureFlags.isEnabled('bim-wall-rendering')).toBe(true);

      await rolloutSystem.triggerRollback('bim-wall-rendering', 'Test rollback');

      expect(featureFlags.isEnabled('bim-wall-rendering')).toBe(false);
    });
  });
});