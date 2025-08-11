import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationPipeline, ValidationPipelineConfig, ValidationStage } from '../../validation/ValidationPipeline';
import { WallSolid } from '../../geometry/WallSolid';
import { GeometricError, GeometricErrorType, ErrorSeverity } from '../../validation/GeometricError';
import { TestDataFactory } from '../helpers/TestDataFactory';

describe('ValidationPipeline', () => {
  let pipeline: ValidationPipeline;
  let testDataFactory: TestDataFactory;

  beforeEach(() => {
    testDataFactory = new TestDataFactory();
    pipeline = new ValidationPipeline();
  });

  describe('Pipeline Execution', () => {
    it('should execute all validation stages successfully for valid data', async () => {
      const validWall = testDataFactory.createValidWallSolid();
      
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      expect(result.success).toBe(true);
      expect(result.stageResults.size).toBeGreaterThan(0);
      expect(result.overallQuality.geometricAccuracy).toBeGreaterThan(0.8);
      expect(result.recommendedActions).toHaveLength(0);
    });

    it('should detect and report geometric consistency issues', async () => {
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      
      const result = await pipeline.executeValidation(invalidWall, 'wall_creation', 'post');
      
      expect(result.success).toBe(false);
      expect(result.stageResults.has('geometric_consistency')).toBe(true);
      
      const geometricResult = result.stageResults.get('geometric_consistency')!;
      expect(geometricResult.passed).toBe(false);
      expect(geometricResult.errors.length).toBeGreaterThan(0);
      expect(geometricResult.errors[0].type).toBe(GeometricErrorType.DEGENERATE_GEOMETRY);
    });

    it('should detect topological issues', async () => {
      const wallWithTopologyIssues = testDataFactory.createWallSolidWithTopologyIssues();
      
      const result = await pipeline.executeValidation(wallWithTopologyIssues, 'wall_creation', 'post');
      
      expect(result.success).toBe(false);
      expect(result.stageResults.has('topology')).toBe(true);
      
      const topologyResult = result.stageResults.get('topology')!;
      expect(topologyResult.passed).toBe(false);
      expect(topologyResult.errors.some(e => e.type === GeometricErrorType.TOPOLOGY_ERROR)).toBe(true);
    });

    it('should detect numerical stability issues', async () => {
      const wallWithNumericalIssues = testDataFactory.createWallSolidWithNumericalIssues();
      
      const result = await pipeline.executeValidation(wallWithNumericalIssues, 'wall_creation', 'post');
      
      const numericalResult = result.stageResults.get('numerical_stability')!;
      expect(numericalResult.errors.some(e => e.type === GeometricErrorType.NUMERICAL_INSTABILITY)).toBe(true);
    });

    it('should attempt automatic recovery when enabled', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        enableAutoRecovery: true,
        maxRecoveryAttempts: 3
      };
      pipeline = new ValidationPipeline(config);
      
      const recoverableWall = testDataFactory.createWallSolidWithRecoverableIssues();
      
      const result = await pipeline.executeValidation(recoverableWall, 'wall_creation', 'post');
      
      expect(result.recoveryResults.size).toBeGreaterThan(0);
      
      // Check if recovery was attempted
      const recoveryResult = Array.from(result.recoveryResults.values())[0];
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.recoveryMethod).toBeDefined();
    });

    it('should fail fast when configured', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        failFast: true
      };
      pipeline = new ValidationPipeline(config);
      
      const wallWithMultipleIssues = testDataFactory.createWallSolidWithMultipleIssues();
      
      const result = await pipeline.executeValidation(wallWithMultipleIssues, 'wall_creation', 'post');
      
      expect(result.success).toBe(false);
      // Should stop at first critical error
      expect(result.stageResults.size).toBeLessThan(5);
    });

    it('should skip validation when disabled', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        enablePreValidation: false,
        enablePostValidation: false
      };
      pipeline = new ValidationPipeline(config);
      
      const invalidWall = testDataFactory.createWallSolidWithInvalidBaseline();
      
      const preResult = await pipeline.executeValidation(invalidWall, 'wall_creation', 'pre');
      const postResult = await pipeline.executeValidation(invalidWall, 'wall_creation', 'post');
      
      expect(preResult.success).toBe(true);
      expect(postResult.success).toBe(true);
      expect(preResult.stageResults.size).toBe(0);
      expect(postResult.stageResults.size).toBe(0);
    });
  });

  describe('Custom Validation Stages', () => {
    it('should allow adding custom validation stages', async () => {
      const customStage: ValidationStage = {
        name: 'Custom Validation',
        validate: (data) => ({
          passed: true,
          errors: [],
          warnings: [],
          metrics: { geometricAccuracy: 1.0 },
          processingTime: 10
        }),
        canRecover: false
      };

      pipeline.addValidationStage('custom_stage', customStage);
      
      const validWall = testDataFactory.createValidWallSolid();
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      expect(result.stageResults.has('custom_stage')).toBe(true);
      expect(result.stageResults.get('custom_stage')!.passed).toBe(true);
    });

    it('should allow removing validation stages', async () => {
      pipeline.removeValidationStage('performance');
      
      const validWall = testDataFactory.createValidWallSolid();
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      expect(result.stageResults.has('performance')).toBe(false);
    });

    it('should provide list of stage names', () => {
      const stageNames = pipeline.getStageNames();
      
      expect(stageNames).toContain('geometric_consistency');
      expect(stageNames).toContain('topology');
      expect(stageNames).toContain('numerical_stability');
      expect(stageNames).toContain('quality_metrics');
      expect(stageNames).toContain('performance');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should recover from geometric consistency issues', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        enableAutoRecovery: true
      };
      pipeline = new ValidationPipeline(config);
      
      const wallWithInvalidThickness = testDataFactory.createWallSolidWithInvalidThickness();
      
      const result = await pipeline.executeValidation(wallWithInvalidThickness, 'wall_creation', 'post');
      
      const recoveryResult = result.recoveryResults.get('geometric_consistency');
      expect(recoveryResult?.success).toBe(true);
      expect(recoveryResult?.recoveryMethod).toBe('geometric_consistency_recovery');
    });

    it('should recover from topology issues', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        enableAutoRecovery: true
      };
      pipeline = new ValidationPipeline(config);
      
      const wallWithDuplicateVertices = testDataFactory.createWallSolidWithDuplicateVertices();
      
      const result = await pipeline.executeValidation(wallWithDuplicateVertices, 'wall_creation', 'post');
      
      const recoveryResult = result.recoveryResults.get('topology');
      expect(recoveryResult?.success).toBe(true);
      expect(recoveryResult?.warnings).toContain('Removed duplicate consecutive vertices');
    });

    it('should recover from numerical stability issues', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        enableAutoRecovery: true
      };
      pipeline = new ValidationPipeline(config);
      
      const wallWithMicroSegments = testDataFactory.createWallSolidWithMicroSegments();
      
      const result = await pipeline.executeValidation(wallWithMicroSegments, 'wall_creation', 'post');
      
      const recoveryResult = result.recoveryResults.get('numerical_stability');
      expect(recoveryResult?.success).toBe(true);
      expect(recoveryResult?.warnings.some(w => w.includes('micro-segments'))).toBe(true);
    });

    it('should limit recovery attempts', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        enableAutoRecovery: true,
        maxRecoveryAttempts: 1
      };
      pipeline = new ValidationPipeline(config);
      
      // Create a stage that always fails recovery
      const failingStage: ValidationStage = {
        name: 'Failing Stage',
        validate: () => ({
          passed: false,
          errors: [new GeometricError(
            GeometricErrorType.VALIDATION_FAILURE,
            ErrorSeverity.ERROR,
            'test',
            {},
            'Always fails',
            'Cannot fix',
            true
          )],
          warnings: [],
          metrics: {},
          processingTime: 0
        }),
        canRecover: true,
        recover: () => ({
          success: false,
          recoveredData: {},
          recoveryMethod: 'failing_recovery',
          qualityImpact: 0,
          warnings: ['Recovery failed']
        })
      };

      pipeline.addValidationStage('failing_stage', failingStage);
      
      const validWall = testDataFactory.createValidWallSolid();
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      const recoveryResult = result.recoveryResults.get('failing_stage');
      expect(recoveryResult?.success).toBe(false);
      expect(recoveryResult?.warnings).toContain('Recovery failed after 1 attempts');
    });
  });

  describe('Quality Metrics Calculation', () => {
    it('should calculate overall quality metrics', async () => {
      const validWall = testDataFactory.createValidWallSolid();
      
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      expect(result.overallQuality).toBeDefined();
      expect(result.overallQuality.geometricAccuracy).toBeGreaterThan(0);
      expect(result.overallQuality.topologicalConsistency).toBeGreaterThan(0);
      expect(result.overallQuality.manufacturability).toBeGreaterThan(0);
      expect(result.overallQuality.architecturalCompliance).toBeGreaterThan(0);
    });

    it('should aggregate quality metrics from multiple stages', async () => {
      const wallWithMixedQuality = testDataFactory.createWallSolidWithMixedQuality();
      
      const result = await pipeline.executeValidation(wallWithMixedQuality, 'wall_creation', 'post');
      
      // Quality should reflect the worst performing stage
      expect(result.overallQuality.geometricAccuracy).toBeLessThan(1.0);
      expect(result.overallQuality.topologicalConsistency).toBeLessThan(1.0);
    });

    it('should count errors by type', async () => {
      const wallWithSelfIntersections = testDataFactory.createWallSolidWithSelfIntersections();
      
      const result = await pipeline.executeValidation(wallWithSelfIntersections, 'wall_creation', 'post');
      
      expect(result.overallQuality.selfIntersectionCount).toBeGreaterThan(0);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate recommendations for failed validations', async () => {
      const invalidWall = testDataFactory.createWallSolidWithMultipleIssues();
      
      const result = await pipeline.executeValidation(invalidWall, 'wall_creation', 'post');
      
      expect(result.recommendedActions.length).toBeGreaterThan(0);
      expect(result.recommendedActions.some(action => 
        action.includes('geometric_consistency')
      )).toBe(true);
    });

    it('should include specific fix suggestions', async () => {
      const wallWithInvalidThickness = testDataFactory.createWallSolidWithInvalidThickness();
      
      const result = await pipeline.executeValidation(wallWithInvalidThickness, 'wall_creation', 'post');
      
      expect(result.recommendedActions.some(action => 
        action.includes('Set thickness to a positive value')
      )).toBe(true);
    });

    it('should warn about significant quality impact from recovery', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        enableAutoRecovery: true
      };
      pipeline = new ValidationPipeline(config);
      
      const wallRequiringSignificantRecovery = testDataFactory.createWallSolidRequiringSignificantRecovery();
      
      const result = await pipeline.executeValidation(wallRequiringSignificantRecovery, 'wall_creation', 'post');
      
      expect(result.recommendedActions.some(action => 
        action.includes('significant quality impact')
      )).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should track processing time', async () => {
      const validWall = testDataFactory.createValidWallSolid();
      
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      expect(result.totalProcessingTime).toBeGreaterThan(0);
      
      for (const [, stageResult] of result.stageResults) {
        expect(stageResult.processingTime).toBeGreaterThan(0);
      }
    });

    it('should handle performance validation warnings', async () => {
      const complexWall = testDataFactory.createComplexWallSolid();
      
      const result = await pipeline.executeValidation(complexWall, 'wall_creation', 'post');
      
      const performanceResult = result.stageResults.get('performance');
      expect(performanceResult?.warnings.some(w => 
        w.includes('High vertex count') || w.includes('Long processing time')
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation stage exceptions', async () => {
      const throwingStage: ValidationStage = {
        name: 'Throwing Stage',
        validate: () => {
          throw new Error('Validation stage error');
        },
        canRecover: false
      };

      pipeline.addValidationStage('throwing_stage', throwingStage);
      
      const validWall = testDataFactory.createValidWallSolid();
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      expect(result.success).toBe(false);
      expect(result.stageResults.has('throwing_stage')).toBe(true);
      
      const stageResult = result.stageResults.get('throwing_stage')!;
      expect(stageResult.passed).toBe(false);
      expect(stageResult.errors[0].type).toBe(GeometricErrorType.VALIDATION_FAILURE);
    });

    it('should handle recovery exceptions', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        enableAutoRecovery: true
      };
      pipeline = new ValidationPipeline(config);
      
      const throwingRecoveryStage: ValidationStage = {
        name: 'Throwing Recovery Stage',
        validate: () => ({
          passed: false,
          errors: [new GeometricError(
            GeometricErrorType.VALIDATION_FAILURE,
            ErrorSeverity.ERROR,
            'test',
            {},
            'Test error',
            'Test fix',
            true
          )],
          warnings: [],
          metrics: {},
          processingTime: 0
        }),
        canRecover: true,
        recover: () => {
          throw new Error('Recovery error');
        }
      };

      pipeline.addValidationStage('throwing_recovery_stage', throwingRecoveryStage);
      
      const validWall = testDataFactory.createValidWallSolid();
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      const recoveryResult = result.recoveryResults.get('throwing_recovery_stage');
      expect(recoveryResult?.success).toBe(false);
      expect(recoveryResult?.warnings[0]).toContain('Recovery failed');
    });
  });

  describe('Configuration Options', () => {
    it('should respect reporting level configuration', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        reportingLevel: 'minimal'
      };
      pipeline = new ValidationPipeline(config);
      
      const validWall = testDataFactory.createValidWallSolid();
      const result = await pipeline.executeValidation(validWall, 'wall_creation', 'post');
      
      // Minimal reporting should still provide basic results
      expect(result.success).toBeDefined();
      expect(result.stageResults).toBeDefined();
    });

    it('should handle comprehensive reporting', async () => {
      const config: Partial<ValidationPipelineConfig> = {
        reportingLevel: 'comprehensive'
      };
      pipeline = new ValidationPipeline(config);
      
      const wallWithIssues = testDataFactory.createWallSolidWithMultipleIssues();
      const result = await pipeline.executeValidation(wallWithIssues, 'wall_creation', 'post');
      
      // Comprehensive reporting should provide detailed information
      expect(result.recommendedActions.length).toBeGreaterThan(0);
      expect(result.overallQuality).toBeDefined();
    });
  });

  describe('Geometric Utility Methods', () => {
    it('should detect self-intersections correctly', async () => {
      const wallWithSelfIntersections = testDataFactory.createWallSolidWithSelfIntersections();
      
      const result = await pipeline.executeValidation(wallWithSelfIntersections, 'wall_creation', 'post');
      
      const geometricResult = result.stageResults.get('geometric_consistency')!;
      expect(geometricResult.errors.some(e => e.type === GeometricErrorType.SELF_INTERSECTION)).toBe(true);
    });

    it('should validate polygon orientation', async () => {
      const wallWithWrongOrientation = testDataFactory.createWallSolidWithWrongOrientation();
      
      const result = await pipeline.executeValidation(wallWithWrongOrientation, 'wall_creation', 'post');
      
      const topologyResult = result.stageResults.get('topology')!;
      expect(topologyResult.warnings.some(w => w.includes('clockwise order'))).toBe(true);
    });

    it('should detect duplicate consecutive vertices', async () => {
      const wallWithDuplicates = testDataFactory.createWallSolidWithDuplicateVertices();
      
      const result = await pipeline.executeValidation(wallWithDuplicates, 'wall_creation', 'post');
      
      const topologyResult = result.stageResults.get('topology')!;
      expect(topologyResult.errors.some(e => e.type === GeometricErrorType.DUPLICATE_VERTICES)).toBe(true);
    });
  });
});