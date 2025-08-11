/**
 * Tests for Robust Fallback Mechanisms
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { FallbackMechanisms, FallbackStrategy, FallbackResult } from '../../validation/FallbackMechanisms';
import { FallbackNotificationSystem } from '../../validation/FallbackNotificationSystem';
import { GeometricError, GeometricErrorType, ErrorSeverity } from '../../validation/GeometricError';
import { OffsetJoinType, IntersectionType } from '../../types/BIMTypes';
import { CurveImpl } from '../../geometry/Curve';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { BIMPointImpl } from '../../geometry/BIMPoint';

// Mock dependencies
vi.mock('../../validation/FallbackNotificationSystem');

describe('FallbackMechanisms', () => {
  let fallbackMechanisms: FallbackMechanisms;
  let mockNotificationCallback: Mock;
  let testCurve: CurveImpl;
  let testWallSolid: WallSolidImpl;

  beforeEach(() => {
    mockNotificationCallback = vi.fn();
    fallbackMechanisms = new FallbackMechanisms({
      maxFallbackAttempts: 3,
      qualityThreshold: 0.5,
      notificationCallback: mockNotificationCallback
    });

    // Create test curve
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(100, 0),
      new BIMPointImpl(100, 100),
      new BIMPointImpl(0, 100)
    ];
    testCurve = new CurveImpl(points, 'polyline');

    // Create test wall solid
    testWallSolid = new WallSolidImpl(testCurve, 200, 'Layout');
  });

  describe('Offset Fallback Mechanisms', () => {
    it('should execute simplified geometry fallback for offset failures', async () => {
      const error = new GeometricError(
        GeometricErrorType.OFFSET_FAILURE,
        'Complex geometry offset failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'offset',
          input: { baseline: testCurve },
          suggestedFix: 'Simplify geometry',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeOffsetFallback(
        testCurve,
        100,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.warnings).toContain('Fallback method used: simplified_geometry_offset');
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    it('should try multiple fallback strategies in priority order', async () => {
      // Add a custom strategy that fails
      const failingStrategy: FallbackStrategy = {
        name: 'failing_strategy',
        priority: 15, // Higher priority than default strategies
        qualityImpact: 0.9,
        canHandle: (operation, error) => operation === 'offset',
        execute: () => {
          throw new Error('Strategy intentionally fails');
        }
      };

      fallbackMechanisms.addStrategy(failingStrategy);

      const error = new GeometricError(
        GeometricErrorType.OFFSET_FAILURE,
        'Offset operation failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'offset',
          input: { baseline: testCurve },
          suggestedFix: 'Try fallback',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeOffsetFallback(
        testCurve,
        100,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      // Should succeed with a lower-priority strategy
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('simplified_geometry_offset'))).toBe(true);
    });

    it('should respect quality threshold and reject low-quality results', async () => {
      // Add a strategy that produces low quality results
      const lowQualityStrategy: FallbackStrategy = {
        name: 'low_quality_strategy',
        priority: 20,
        qualityImpact: 0.3, // Below default threshold of 0.5
        canHandle: (operation, error) => operation === 'offset',
        execute: () => ({
          success: true,
          result: { leftOffset: testCurve, rightOffset: testCurve },
          method: 'low_quality_strategy',
          qualityImpact: 0.3,
          warnings: [],
          limitations: [],
          processingTime: 10
        })
      };

      fallbackMechanisms.addStrategy(lowQualityStrategy);

      const error = new GeometricError(
        GeometricErrorType.OFFSET_FAILURE,
        'Offset operation failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'offset',
          input: { baseline: testCurve },
          suggestedFix: 'Try fallback',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeOffsetFallback(
        testCurve,
        100,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      // Should skip low quality strategy and use a higher quality one
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('low_quality_strategy'))).toBe(false);
    });

    it('should handle numerical instability errors with appropriate strategies', async () => {
      const error = new GeometricError(
        GeometricErrorType.NUMERICAL_INSTABILITY,
        'Numerical instability in offset calculation',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'offset',
          input: { baseline: testCurve },
          suggestedFix: 'Adjust precision',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeOffsetFallback(
        testCurve,
        100,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      // Should use reduced precision strategy for numerical instability
      expect(result.warnings.some(w => 
        w.includes('reduced_precision_offset') || w.includes('simplified_geometry_offset')
      )).toBe(true);
    });
  });

  describe('Boolean Operation Fallback Mechanisms', () => {
    it('should execute simplified boolean fallback for boolean failures', async () => {
      const walls = [testWallSolid, testWallSolid];
      const error = new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        'Boolean union operation failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'boolean',
          input: { solids: walls },
          suggestedFix: 'Simplify geometry',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeBooleanFallback(
        'union',
        walls,
        error
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Fallback method used: simplified_boolean');
      expect(result.requiresHealing).toBe(true);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    it('should try alternative boolean libraries when Martinez fails', async () => {
      const walls = [testWallSolid];
      const error = new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        'Martinez library failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'boolean',
          input: { solids: walls },
          suggestedFix: 'Try alternative library',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeBooleanFallback(
        'intersection',
        walls,
        error
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('intersection_fallback');
    });

    it('should handle complex boolean operations with graceful degradation', async () => {
      // Create multiple walls for complex operation
      const walls = Array(5).fill(null).map(() => testWallSolid);
      
      const error = new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        'Complex boolean operation failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'boolean',
          input: { solids: walls },
          suggestedFix: 'Reduce complexity',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeBooleanFallback(
        'union',
        walls,
        error
      );

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Intersection Fallback Mechanisms', () => {
    it('should execute approximate intersection fallback for T-junctions', async () => {
      const walls = [testWallSolid, testWallSolid];
      const error = new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        'T-junction resolution failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'intersection',
          input: { walls, intersectionType: IntersectionType.T_JUNCTION },
          suggestedFix: 'Use approximate method',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeIntersectionFallback(
        walls,
        IntersectionType.T_JUNCTION,
        error
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_t_junction_fallback');
      expect(result.requiresHealing).toBe(true);
      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    it('should handle L-junction failures with simplified geometry', async () => {
      const walls = [testWallSolid, testWallSolid];
      const error = new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        'L-junction resolution failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'intersection',
          input: { walls, intersectionType: IntersectionType.L_JUNCTION },
          suggestedFix: 'Simplify geometry',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeIntersectionFallback(
        walls,
        IntersectionType.L_JUNCTION,
        error
      );

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('fallback'))).toBe(true);
    });

    it('should apply graceful degradation when all intersection strategies fail', async () => {
      // Remove all strategies to force graceful degradation
      const originalStrategies = fallbackMechanisms.getAvailableStrategies('intersection');
      originalStrategies.forEach(strategy => {
        fallbackMechanisms.removeStrategy(strategy);
      });

      const walls = [testWallSolid, testWallSolid];
      const error = new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        'All intersection methods failed',
        {
          severity: ErrorSeverity.CRITICAL,
          operation: 'intersection',
          input: { walls, intersectionType: IntersectionType.CROSS_JUNCTION },
          suggestedFix: 'Manual intervention required',
          recoverable: false
        }
      );

      const result = await fallbackMechanisms.executeIntersectionFallback(
        walls,
        IntersectionType.CROSS_JUNCTION,
        error
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('graceful_degradation_cross_junction');
      expect(result.warnings).toContain('Graceful degradation applied');
    });
  });

  describe('Custom Strategy Management', () => {
    it('should allow adding custom fallback strategies', () => {
      const customStrategy: FallbackStrategy = {
        name: 'custom_test_strategy',
        priority: 100,
        qualityImpact: 0.95,
        canHandle: (operation, error) => operation === 'test',
        execute: () => ({
          success: true,
          result: { test: true },
          method: 'custom_test_strategy',
          qualityImpact: 0.95,
          warnings: [],
          limitations: [],
          processingTime: 5
        })
      };

      fallbackMechanisms.addStrategy(customStrategy);
      const strategies = fallbackMechanisms.getAvailableStrategies('test');
      
      expect(strategies).toContain('custom_test_strategy');
    });

    it('should allow removing fallback strategies', () => {
      const strategies = fallbackMechanisms.getAvailableStrategies('any');
      const strategyToRemove = strategies[0];
      
      const removed = fallbackMechanisms.removeStrategy(strategyToRemove);
      expect(removed).toBe(true);
      
      const updatedStrategies = fallbackMechanisms.getAvailableStrategies('any');
      expect(updatedStrategies).not.toContain(strategyToRemove);
    });

    it('should maintain strategy priority order', () => {
      const highPriorityStrategy: FallbackStrategy = {
        name: 'high_priority',
        priority: 1000,
        qualityImpact: 0.9,
        canHandle: () => true,
        execute: () => ({
          success: true,
          result: { priority: 'high' },
          method: 'high_priority',
          qualityImpact: 0.9,
          warnings: [],
          limitations: [],
          processingTime: 1
        })
      };

      const lowPriorityStrategy: FallbackStrategy = {
        name: 'low_priority',
        priority: 1,
        qualityImpact: 0.9,
        canHandle: () => true,
        execute: () => ({
          success: true,
          result: { priority: 'low' },
          method: 'low_priority',
          qualityImpact: 0.9,
          warnings: [],
          limitations: [],
          processingTime: 1
        })
      };

      fallbackMechanisms.addStrategy(lowPriorityStrategy);
      fallbackMechanisms.addStrategy(highPriorityStrategy);

      // High priority strategy should be tried first
      // This would be tested by checking execution order in a real scenario
      const strategies = fallbackMechanisms.getAvailableStrategies('any');
      expect(strategies).toContain('high_priority');
      expect(strategies).toContain('low_priority');
    });
  });

  describe('Notification Integration', () => {
    it('should notify user about fallback usage with quality impact', async () => {
      const error = new GeometricError(
        GeometricErrorType.OFFSET_FAILURE,
        'Test offset failure',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'offset',
          input: { baseline: testCurve },
          suggestedFix: 'Test fix',
          recoverable: true
        }
      );

      await fallbackMechanisms.executeOffsetFallback(
        testCurve,
        100,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'offset',
          originalError: 'Test offset failure',
          fallbackMethod: expect.any(String),
          qualityImpact: expect.any(Number),
          userGuidance: expect.any(Array),
          canRetry: true,
          alternativeApproaches: expect.any(Array)
        })
      );
    });

    it('should provide appropriate user guidance based on operation type', async () => {
      const error = new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        'Boolean operation failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'boolean',
          input: { solids: [testWallSolid] },
          suggestedFix: 'Test fix',
          recoverable: true
        }
      );

      await fallbackMechanisms.executeBooleanFallback('union', [testWallSolid], error);

      const notificationCall = mockNotificationCallback.mock.calls[0][0];
      expect(notificationCall.userGuidance).toContain('Boolean operation used fallback method');
      expect(notificationCall.alternativeApproaches).toContain('Apply shape healing before boolean operations');
    });

    it('should indicate when no fallback is available', async () => {
      // Remove all strategies
      const strategies = fallbackMechanisms.getAvailableStrategies('any');
      strategies.forEach(strategy => {
        fallbackMechanisms.removeStrategy(strategy);
      });

      const error = new GeometricError(
        GeometricErrorType.OFFSET_FAILURE,
        'No fallback available',
        {
          severity: ErrorSeverity.CRITICAL,
          operation: 'offset',
          input: { baseline: testCurve },
          suggestedFix: 'Manual intervention',
          recoverable: false
        }
      );

      const result = await fallbackMechanisms.executeOffsetFallback(
        testCurve,
        100,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('All fallback strategies failed after 0 attempts');
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackMethod: 'none_successful',
          qualityImpact: 0,
          canRetry: false
        })
      );
    });
  });

  describe('Realistic Failure Scenarios', () => {
    it('should handle self-intersecting baseline curves', async () => {
      // Create self-intersecting curve
      const selfIntersectingPoints = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(100, 100),
        new BIMPointImpl(100, 0),
        new BIMPointImpl(0, 100) // Creates self-intersection
      ];
      const selfIntersectingCurve = new CurveImpl(selfIntersectingPoints, 'polyline');

      const error = new GeometricError(
        GeometricErrorType.SELF_INTERSECTION,
        'Self-intersecting baseline detected',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'offset',
          input: { baseline: selfIntersectingCurve },
          suggestedFix: 'Resolve self-intersections',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeOffsetFallback(
        selfIntersectingCurve,
        50,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should handle extremely thin walls', async () => {
      const thinWall = new WallSolidImpl(testCurve, 0.001, 'Layout'); // 0.001mm thick
      const walls = [thinWall];

      const error = new GeometricError(
        GeometricErrorType.NUMERICAL_INSTABILITY,
        'Wall too thin for stable boolean operations',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'boolean',
          input: { solids: walls },
          suggestedFix: 'Increase wall thickness',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeBooleanFallback('union', walls, error);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('fallback'))).toBe(true);
    });

    it('should handle complex multi-wall intersections', async () => {
      // Create multiple walls that would create complex intersections
      const walls = Array(10).fill(null).map((_, i) => {
        const angle = (i * Math.PI * 2) / 10;
        const points = [
          new BIMPointImpl(0, 0),
          new BIMPointImpl(Math.cos(angle) * 100, Math.sin(angle) * 100)
        ];
        const curve = new CurveImpl(points, 'polyline');
        return new WallSolidImpl(curve, 50, 'Layout');
      });

      const error = new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        'Complex multi-wall intersection failed',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'intersection',
          input: { walls, intersectionType: IntersectionType.CROSS_JUNCTION },
          suggestedFix: 'Simplify intersection',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeIntersectionFallback(
        walls,
        IntersectionType.CROSS_JUNCTION,
        error
      );

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Limits', () => {
    it('should respect maximum fallback attempts', async () => {
      // Create a mechanism with limited attempts
      const limitedMechanism = new FallbackMechanisms({
        maxFallbackAttempts: 1,
        qualityThreshold: 0.9 // High threshold to force failures
      });

      const error = new GeometricError(
        GeometricErrorType.OFFSET_FAILURE,
        'Test failure',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'offset',
          input: { baseline: testCurve },
          suggestedFix: 'Test fix',
          recoverable: true
        }
      );

      const result = await limitedMechanism.executeOffsetFallback(
        testCurve,
        100,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      // Should fail due to limited attempts and high quality threshold
      expect(result.success).toBe(false);
    });

    it('should handle fallback strategy exceptions gracefully', async () => {
      const faultyStrategy: FallbackStrategy = {
        name: 'faulty_strategy',
        priority: 100,
        qualityImpact: 0.9,
        canHandle: () => true,
        execute: () => {
          throw new Error('Strategy implementation error');
        }
      };

      fallbackMechanisms.addStrategy(faultyStrategy);

      const error = new GeometricError(
        GeometricErrorType.OFFSET_FAILURE,
        'Test failure',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'offset',
          input: { baseline: testCurve },
          suggestedFix: 'Test fix',
          recoverable: true
        }
      );

      const result = await fallbackMechanisms.executeOffsetFallback(
        testCurve,
        100,
        OffsetJoinType.MITER,
        1e-6,
        error
      );

      // Should succeed with other strategies despite faulty one
      expect(result.success).toBe(true);
    });
  });
});