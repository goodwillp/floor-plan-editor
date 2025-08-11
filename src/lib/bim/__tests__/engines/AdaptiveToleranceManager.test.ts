/**
 * Unit tests for AdaptiveToleranceManager
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AdaptiveToleranceManager } from '../../engines/AdaptiveToleranceManager';
import { ToleranceContext } from '../../types/BIMTypes';

describe('AdaptiveToleranceManager', () => {
  let toleranceManager: AdaptiveToleranceManager;

  beforeEach(() => {
    toleranceManager = new AdaptiveToleranceManager({
      baseTolerance: 1e-6,
      documentPrecision: 1e-3
    });
  });

  test('should create with default options', () => {
    const manager = new AdaptiveToleranceManager();
    expect(manager).toBeDefined();
  });

  test('should calculate tolerance for vertex merge', () => {
    const tolerance = toleranceManager.calculateTolerance(
      200, // 200mm wall thickness
      1e-3, // 1mm document precision
      Math.PI / 6, // 30 degree angle
      ToleranceContext.VERTEX_MERGE
    );

    expect(tolerance).toBeGreaterThan(0);
    expect(tolerance).toBeLessThan(1); // Should be reasonable
  });

  test('should calculate tolerance for offset operations', () => {
    const tolerance = toleranceManager.calculateTolerance(
      350, // 350mm wall thickness
      1e-3, // 1mm document precision
      Math.PI / 4, // 45 degree angle
      ToleranceContext.OFFSET_OPERATION
    );

    expect(tolerance).toBeGreaterThan(0);
  });

  test('should scale tolerance based on wall thickness', () => {
    const thinWallTolerance = toleranceManager.calculateTolerance(
      100, 1e-3, Math.PI / 4, ToleranceContext.OFFSET_OPERATION
    );
    
    const thickWallTolerance = toleranceManager.calculateTolerance(
      400, 1e-3, Math.PI / 4, ToleranceContext.OFFSET_OPERATION
    );

    expect(thickWallTolerance).toBeGreaterThan(thinWallTolerance);
  });

  test('should scale tolerance based on angle sharpness', () => {
    const sharpAngleTolerance = toleranceManager.calculateTolerance(
      200, 1e-3, Math.PI / 12, ToleranceContext.OFFSET_OPERATION // 15 degrees
    );
    
    const gentleAngleTolerance = toleranceManager.calculateTolerance(
      200, 1e-3, Math.PI / 2, ToleranceContext.OFFSET_OPERATION // 90 degrees
    );

    expect(sharpAngleTolerance).toBeGreaterThan(gentleAngleTolerance);
  });

  test('should provide specialized tolerance for vertex merging', () => {
    const tolerance = toleranceManager.getVertexMergeTolerance(250, Math.PI / 6);
    
    expect(tolerance).toBeGreaterThan(0);
    expect(typeof tolerance).toBe('number');
  });

  test('should provide specialized tolerance for offset operations', () => {
    const tolerance = toleranceManager.getOffsetTolerance(300, 0.01);
    
    expect(tolerance).toBeGreaterThan(0);
    expect(typeof tolerance).toBe('number');
  });

  test('should provide specialized tolerance for boolean operations', () => {
    const tolerance = toleranceManager.getBooleanTolerance(200, 5);
    
    expect(tolerance).toBeGreaterThan(0);
    expect(typeof tolerance).toBe('number');
  });

  test('should adjust tolerance for failure', () => {
    const currentTolerance = 1e-3;
    const failure = {
      type: 'numerical_instability',
      severity: 2,
      suggestedAdjustment: 0.5
    };

    const adjustedTolerance = toleranceManager.adjustToleranceForFailure(
      currentTolerance,
      failure
    );

    expect(adjustedTolerance).toBeGreaterThan(currentTolerance);
  });

  test('should validate tolerance values', () => {
    const validResult = toleranceManager.validateTolerance(
      1e-4,
      ToleranceContext.VERTEX_MERGE
    );

    expect(validResult.isValid).toBe(true);
    expect(validResult.issues).toHaveLength(0);

    const invalidResult = toleranceManager.validateTolerance(
      1e-8, // Too small
      ToleranceContext.VERTEX_MERGE
    );

    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.issues.length).toBeGreaterThan(0);
  });

  test('should provide tolerance bounds', () => {
    const bounds = toleranceManager.getToleranceBounds(1e-3);
    
    expect(bounds.minimum).toBeLessThan(bounds.recommended);
    expect(bounds.recommended).toBeLessThan(bounds.maximum);
    expect(bounds.minimum).toBeGreaterThan(0);
  });

  test('should cache tolerance calculations', () => {
    // First calculation
    const tolerance1 = toleranceManager.calculateTolerance(
      200, 1e-3, Math.PI / 4, ToleranceContext.OFFSET_OPERATION
    );

    // Second calculation with same parameters (should use cache)
    const tolerance2 = toleranceManager.calculateTolerance(
      200, 1e-3, Math.PI / 4, ToleranceContext.OFFSET_OPERATION
    );

    expect(tolerance1).toBe(tolerance2);
  });

  test('should clear cache', () => {
    toleranceManager.calculateTolerance(
      200, 1e-3, Math.PI / 4, ToleranceContext.OFFSET_OPERATION
    );

    toleranceManager.clearCache();
    
    // Should still work after clearing cache
    const tolerance = toleranceManager.calculateTolerance(
      200, 1e-3, Math.PI / 4, ToleranceContext.OFFSET_OPERATION
    );

    expect(tolerance).toBeGreaterThan(0);
  });

  test('should update document precision', () => {
    const oldTolerance = toleranceManager.calculateTolerance(
      200, 1e-3, Math.PI / 4, ToleranceContext.OFFSET_OPERATION
    );

    toleranceManager.updateDocumentPrecision(1e-2);

    const newTolerance = toleranceManager.calculateTolerance(
      200, 1e-2, Math.PI / 4, ToleranceContext.OFFSET_OPERATION
    );

    expect(newTolerance).not.toBe(oldTolerance);
  });

  test('should track adjustment history', () => {
    const failure = {
      type: 'test_failure',
      severity: 1,
      suggestedAdjustment: 0.2
    };

    toleranceManager.adjustToleranceForFailure(1e-3, failure);
    
    const history = toleranceManager.getAdjustmentHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].reason).toBe('test_failure');
  });

  test('should provide tolerance statistics', () => {
    // Generate some tolerance calculations
    toleranceManager.calculateTolerance(200, 1e-3, Math.PI / 4, ToleranceContext.OFFSET_OPERATION);
    toleranceManager.calculateTolerance(300, 1e-3, Math.PI / 6, ToleranceContext.VERTEX_MERGE);

    const stats = toleranceManager.getToleranceStatistics();
    
    expect(stats.cacheSize).toBeGreaterThan(0);
    expect(stats.averageTolerance).toBeGreaterThan(0);
    expect(stats.toleranceRange.min).toBeGreaterThan(0);
    expect(stats.toleranceRange.max).toBeGreaterThanOrEqual(stats.toleranceRange.min);
  });

  test('should handle different operation contexts', () => {
    const contexts = [
      ToleranceContext.VERTEX_MERGE,
      ToleranceContext.OFFSET_OPERATION,
      ToleranceContext.BOOLEAN_OPERATION,
      ToleranceContext.SHAPE_HEALING
    ];

    const tolerances = contexts.map(context =>
      toleranceManager.calculateTolerance(200, 1e-3, Math.PI / 4, context)
    );

    // All tolerances should be positive and different
    tolerances.forEach(tolerance => {
      expect(tolerance).toBeGreaterThan(0);
    });

    // Shape healing should have the largest tolerance
    const healingTolerance = tolerances[contexts.indexOf(ToleranceContext.SHAPE_HEALING)];
    const offsetTolerance = tolerances[contexts.indexOf(ToleranceContext.OFFSET_OPERATION)];
    
    expect(healingTolerance).toBeGreaterThan(offsetTolerance);
  });
});