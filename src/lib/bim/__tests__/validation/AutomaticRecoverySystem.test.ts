import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutomaticRecoverySystem, RecoveryConfiguration } from '../../validation/AutomaticRecoverySystem';
import { GeometricError, GeometricErrorType, ErrorSeverity } from '../../validation/GeometricError';
import { WallSolid } from '../../geometry/WallSolid';
import { TestDataFactory } from '../helpers/TestDataFactory';

describe('AutomaticRecoverySystem', () => {
  let recoverySystem: AutomaticRecoverySystem;
  let testDataFactory: TestDataFactory;

  beforeEach(() => {
    testDataFactory = new TestDataFactory();
    recoverySystem = new AutomaticRecoverySystem();
  });

  describe('Recovery Session Management', () => {
    it('should create and manage recovery sessions', async () => {
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      expect(session.sessionId).toBeDefined();
      expect(session.originalData).toBeDefined();
      expect(session.currentData).toBeDefined();
      expect(session.startTime).toBeInstanceOf(Number);
      expect(session.isComplete).toBe(true);
    });

    it('should preserve original data when configured', async () => {
      const config: Partial<RecoveryConfiguration> = {
        preserveOriginalData: true
      };
      recoverySystem = new AutomaticRecoverySystem(config);
      
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      expect(session.originalData).toEqual(invalidWall);
      expect(session.currentData).not.toBe(invalidWall); // Should be a different object
    });

    it('should not preserve original data when disabled', async () => {
      const config: Partial<RecoveryConfiguration> = {
        preserveOriginalData: false
      };
      recoverySystem = new AutomaticRecoverySystem(config);
      
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      expect(session.originalData).toBeNull();
    });

    it('should retrieve active recovery sessions', async () => {
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors, 'test-session');
      
      const retrievedSession = recoverySystem.getRecoverySession('test-session');
      expect(retrievedSession).toEqual(session);
    });

    it('should clean up completed sessions', async () => {
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors, 'test-session');
      
      recoverySystem.completeRecoverySession('test-session');
      
      const retrievedSession = recoverySystem.getRecoverySession('test-session');
      expect(retrievedSession).toBeNull();
    });
  });

  describe('Recovery Strategy Execution', () => {
    it('should recover degenerate geometry', async () => {
      const wallWithInvalidBaseline = testDataFactory.createWallSolidWithInvalidBaseline();
      const error = testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY);
      
      const result = await recoverySystem.applyStrategy(
        wallWithInvalidBaseline,
        error,
        'degenerate_geometry_recovery'
      );
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
      expect(result.strategyUsed).toBe('degenerate_geometry_recovery');
      expect(result.qualityImpact).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should resolve self-intersections', async () => {
      const wallWithSelfIntersections = testDataFactory.createWallSolidWithSelfIntersections();
      const error = testDataFactory.createGeometricError(GeometricErrorType.SELF_INTERSECTION);
      
      const result = await recoverySystem.applyStrategy(
        wallWithSelfIntersections,
        error,
        'self_intersection_resolution'
      );
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
      expect(result.strategyUsed).toBe('self_intersection_resolution');
      expect(result.warnings.some(w => w.includes('points to resolve self-intersections'))).toBe(true);
    });

    it('should recover numerical stability issues', async () => {
      const wallWithNumericalIssues = testDataFactory.createWallSolidWithNumericalIssues();
      const error = testDataFactory.createGeometricError(GeometricErrorType.NUMERICAL_INSTABILITY);
      
      const result = await recoverySystem.applyStrategy(
        wallWithNumericalIssues,
        error,
        'numerical_stability_recovery'
      );
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
      expect(result.strategyUsed).toBe('numerical_stability_recovery');
    });

    it('should repair topology issues', async () => {
      const wallWithTopologyIssues = testDataFactory.createWallSolidWithTopologyIssues();
      const error = testDataFactory.createGeometricError(GeometricErrorType.TOPOLOGY_ERROR);
      
      const result = await recoverySystem.applyStrategy(
        wallWithTopologyIssues,
        error,
        'topology_repair'
      );
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
      expect(result.strategyUsed).toBe('topology_repair');
    });

    it('should remove duplicate vertices', async () => {
      const wallWithDuplicates = testDataFactory.createWallSolidWithDuplicateVertices();
      const error = testDataFactory.createGeometricError(GeometricErrorType.DUPLICATE_VERTICES);
      
      const result = await recoverySystem.applyStrategy(
        wallWithDuplicates,
        error,
        'duplicate_vertex_removal'
      );
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
      expect(result.strategyUsed).toBe('duplicate_vertex_removal');
    });

    it('should simplify geometry when needed', async () => {
      const complexWall = testDataFactory.createComplexWallSolid();
      const error = testDataFactory.createGeometricError(GeometricErrorType.COMPLEXITY_EXCEEDED);
      
      const result = await recoverySystem.applyStrategy(
        complexWall,
        error,
        'geometric_simplification'
      );
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
      expect(result.strategyUsed).toBe('geometric_simplification');
      expect(result.requiresUserReview).toBe(true); // High quality impact
    });

    it('should use fallback reconstruction as last resort', async () => {
      const corruptedWall = testDataFactory.createCorruptedWallSolid();
      const error = testDataFactory.createGeometricError(GeometricErrorType.BOOLEAN_FAILURE);
      
      const result = await recoverySystem.applyStrategy(
        corruptedWall,
        error,
        'fallback_reconstruction'
      );
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBeDefined();
      expect(result.strategyUsed).toBe('fallback_reconstruction');
      expect(result.qualityImpact).toBe(0.6); // High quality impact
      expect(result.requiresUserReview).toBe(true);
    });

    it('should handle unsupported data types gracefully', async () => {
      const invalidData = { invalid: 'data' };
      const error = testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY);
      
      const result = await recoverySystem.applyStrategy(
        invalidData,
        error,
        'degenerate_geometry_recovery'
      );
      
      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Unsupported data type for degenerate geometry recovery');
    });

    it('should handle unknown strategies', async () => {
      const validWall = testDataFactory.createValidWallSolid();
      const error = testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY);
      
      const result = await recoverySystem.applyStrategy(
        validWall,
        error,
        'unknown_strategy'
      );
      
      expect(result.success).toBe(false);
      expect(result.warnings).toContain("Strategy 'unknown_strategy' not found");
    });
  });

  describe('Automatic Recovery Process', () => {
    it('should prioritize errors by severity', async () => {
      const invalidWall = testDataFactory.createWallSolidWithMultipleIssues();
      const errors = [
        testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY, ErrorSeverity.WARNING),
        testDataFactory.createGeometricError(GeometricErrorType.SELF_INTERSECTION, ErrorSeverity.CRITICAL),
        testDataFactory.createGeometricError(GeometricErrorType.NUMERICAL_INSTABILITY, ErrorSeverity.ERROR)
      ];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      // Critical errors should be handled first
      expect(session.recoveryHistory.length).toBeGreaterThan(0);
      // The first recovery attempt should be for the critical error
      expect(session.recoveryHistory[0].strategyUsed).toBe('self_intersection_resolution');
    });

    it('should respect maximum recovery attempts', async () => {
      const config: Partial<RecoveryConfiguration> = {
        maxRecoveryAttempts: 2
      };
      recoverySystem = new AutomaticRecoverySystem(config);
      
      const invalidWall = testDataFactory.createWallSolidWithMultipleIssues();
      const errors = Array(5).fill(null).map(() => 
        testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)
      );
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      expect(session.appliedStrategies.length).toBeLessThanOrEqual(2);
      expect(session.requiresUserIntervention).toBe(true);
    });

    it('should stop when quality threshold is exceeded', async () => {
      const config: Partial<RecoveryConfiguration> = {
        qualityThreshold: 0.8 // High threshold
      };
      recoverySystem = new AutomaticRecoverySystem(config);
      
      const invalidWall = testDataFactory.createWallSolidRequiringSignificantRecovery();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.COMPLEXITY_EXCEEDED)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      expect(session.totalQualityImpact).toBeGreaterThan(0.2);
      expect(session.requiresUserIntervention).toBe(true);
    });

    it('should handle critical errors that require user intervention', async () => {
      const invalidWall = testDataFactory.createWallSolidWithCriticalIssues();
      const errors = [testDataFactory.createGeometricError(
        GeometricErrorType.VALIDATION_FAILURE,
        ErrorSeverity.CRITICAL
      )];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      expect(session.requiresUserIntervention).toBe(true);
    });

    it('should skip recovery when disabled', async () => {
      const config: Partial<RecoveryConfiguration> = {
        enableAutoRecovery: false
      };
      recoverySystem = new AutomaticRecoverySystem(config);
      
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      expect(session.isComplete).toBe(true);
      expect(session.requiresUserIntervention).toBe(true);
      expect(session.appliedStrategies.length).toBe(0);
    });
  });

  describe('Recovery Recommendations', () => {
    it('should generate recovery recommendations', () => {
      const invalidWall = testDataFactory.createWallSolidWithMultipleIssues();
      const errors = [
        testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY),
        testDataFactory.createGeometricError(GeometricErrorType.SELF_INTERSECTION)
      ];
      
      const recommendations = recoverySystem.getRecoveryRecommendations(invalidWall, errors);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].errorType).toBeDefined();
      expect(recommendations[0].strategyName).toBeDefined();
      expect(recommendations[0].description).toBeDefined();
      expect(recommendations[0].confidence).toBeGreaterThan(0);
    });

    it('should sort recommendations by confidence', () => {
      const invalidWall = testDataFactory.createWallSolidWithMultipleIssues();
      const errors = [
        testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY),
        testDataFactory.createGeometricError(GeometricErrorType.COMPLEXITY_EXCEEDED)
      ];
      
      const recommendations = recoverySystem.getRecoveryRecommendations(invalidWall, errors);
      
      // Recommendations should be sorted by confidence (highest first)
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].confidence).toBeGreaterThanOrEqual(recommendations[i + 1].confidence);
      }
    });

    it('should include quality impact estimates', () => {
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const recommendations = recoverySystem.getRecoveryRecommendations(invalidWall, errors);
      
      expect(recommendations[0].estimatedQualityImpact).toBeGreaterThan(0);
      expect(recommendations[0].estimatedQualityImpact).toBeLessThanOrEqual(1);
    });

    it('should indicate which strategies require user input', () => {
      const complexWall = testDataFactory.createComplexWallSolid();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.COMPLEXITY_EXCEEDED)];
      
      const recommendations = recoverySystem.getRecoveryRecommendations(complexWall, errors);
      
      const simplificationRec = recommendations.find(r => r.strategyName === 'Geometric Simplification');
      expect(simplificationRec?.requiresUserInput).toBe(true);
    });
  });

  describe('Quality Impact Assessment', () => {
    it('should track quality impact across multiple recoveries', async () => {
      const invalidWall = testDataFactory.createWallSolidWithMultipleIssues();
      const errors = [
        testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY),
        testDataFactory.createGeometricError(GeometricErrorType.DUPLICATE_VERTICES)
      ];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      expect(session.totalQualityImpact).toBeGreaterThan(0);
      
      // Each recovery should contribute to total quality impact
      let calculatedImpact = 0;
      for (const recovery of session.recoveryHistory) {
        if (recovery.success) {
          calculatedImpact += recovery.qualityImpact;
        }
      }
      expect(session.totalQualityImpact).toBeCloseTo(calculatedImpact, 2);
    });

    it('should require user review for high quality impact', async () => {
      const wallRequiringSignificantRecovery = testDataFactory.createWallSolidRequiringSignificantRecovery();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.COMPLEXITY_EXCEEDED)];
      
      const session = await recoverySystem.attemptRecovery(wallRequiringSignificantRecovery, errors);
      
      const highImpactRecovery = session.recoveryHistory.find(r => r.qualityImpact > 0.3);
      expect(highImpactRecovery?.requiresUserReview).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty error list', async () => {
      const validWall = testDataFactory.createValidWallSolid();
      const errors: GeometricError[] = [];
      
      const session = await recoverySystem.attemptRecovery(validWall, errors);
      
      expect(session.isComplete).toBe(true);
      expect(session.appliedStrategies.length).toBe(0);
      expect(session.requiresUserIntervention).toBe(false);
    });

    it('should handle non-recoverable errors', async () => {
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const nonRecoverableError = testDataFactory.createGeometricError(
        GeometricErrorType.VALIDATION_FAILURE,
        ErrorSeverity.ERROR,
        false // not recoverable
      );
      
      const session = await recoverySystem.attemptRecovery(invalidWall, [nonRecoverableError]);
      
      expect(session.appliedStrategies.length).toBe(0);
      expect(session.requiresUserIntervention).toBe(true);
    });

    it('should handle strategy execution failures', async () => {
      // Mock a strategy that always fails
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const error = testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY);
      
      // This should be handled gracefully by the system
      const session = await recoverySystem.attemptRecovery(invalidWall, [error]);
      
      // Even if individual strategies fail, the session should complete
      expect(session.isComplete).toBe(true);
    });

    it('should handle null or undefined input data', async () => {
      const error = testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY);
      
      const nullSession = await recoverySystem.attemptRecovery(null, [error]);
      const undefinedSession = await recoverySystem.attemptRecovery(undefined, [error]);
      
      expect(nullSession.isComplete).toBe(true);
      expect(undefinedSession.isComplete).toBe(true);
      expect(nullSession.requiresUserIntervention).toBe(true);
      expect(undefinedSession.requiresUserIntervention).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of errors efficiently', async () => {
      const invalidWall = testDataFactory.createWallSolidWithMultipleIssues();
      const errors = Array(100).fill(null).map(() => 
        testDataFactory.createGeometricError(GeometricErrorType.DUPLICATE_VERTICES)
      );
      
      const startTime = performance.now();
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(session.isComplete).toBe(true);
    });

    it('should track processing time for recovery operations', async () => {
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      for (const recovery of session.recoveryHistory) {
        expect(recovery.processingTime).toBeGreaterThan(0);
      }
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect user confirmation requirements', async () => {
      const config: Partial<RecoveryConfiguration> = {
        requireUserConfirmation: true
      };
      recoverySystem = new AutomaticRecoverySystem(config);
      
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)];
      
      const session = await recoverySystem.attemptRecovery(invalidWall, errors);
      
      // When user confirmation is required, should require user intervention
      expect(session.requiresUserIntervention).toBe(true);
    });

    it('should enable fallback to simplification when configured', async () => {
      const config: Partial<RecoveryConfiguration> = {
        fallbackToSimplification: true
      };
      recoverySystem = new AutomaticRecoverySystem(config);
      
      const complexWall = testDataFactory.createComplexWallSolid();
      const errors = [testDataFactory.createGeometricError(GeometricErrorType.BOOLEAN_FAILURE)];
      
      const session = await recoverySystem.attemptRecovery(complexWall, errors);
      
      // Should attempt simplification as fallback
      expect(session.appliedStrategies.some(s => s.includes('simplification'))).toBe(true);
    });
  });
});