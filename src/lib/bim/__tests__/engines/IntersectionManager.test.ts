/**
 * Unit tests for IntersectionManager class
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { IntersectionManager } from '../../engines/IntersectionManager';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { CurveImpl } from '../../geometry/Curve';
import { IntersectionType, CurveType } from '../../types/BIMTypes';
import type { BIMPoint } from '../../geometry/BIMPoint';
import type { WallSolid } from '../../geometry/WallSolid';

describe('IntersectionManager', () => {
  let manager: IntersectionManager;
  let mockWalls: WallSolid[];
  let mockIntersectionPoint: BIMPoint;

  beforeEach(() => {
    manager = new IntersectionManager({
      enableCaching: true,
      cacheConfig: {
        maxEntries: 100,
        maxMemoryMB: 5,
        ttlMinutes: 10
      },
      tolerance: 1e-6,
      miterLimit: 10.0,
      enableValidation: true,
      enableQualityAssessment: true
    });

    // Create mock walls
    const mockBaseline = new CurveImpl(
      [
        { x: 0, y: 0, id: 'p1', tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
        { x: 100, y: 0, id: 'p2', tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
      ],
      CurveType.POLYLINE,
      {
        id: 'baseline_1',
        isClosed: false
      }
    );

    mockWalls = [
      new WallSolidImpl(mockBaseline, 10, 'Layout', {
        id: 'wall_1',
        leftOffset: mockBaseline,
        rightOffset: mockBaseline,
        joinTypes: new Map(),
        intersectionData: [],
        healingHistory: [],
        geometricQuality: {
          geometricAccuracy: 0.95,
          topologicalConsistency: 0.9,
          manufacturability: 0.85,
          architecturalCompliance: 0.9,
          sliverFaceCount: 0,
          microGapCount: 0,
          selfIntersectionCount: 0,
          degenerateElementCount: 0,
          complexity: 1,
          processingEfficiency: 0.8,
          memoryUsage: 1000
        },
        processingTime: 10
      }),
      new WallSolidImpl(mockBaseline, 10, 'Layout', {
        id: 'wall_2',
        leftOffset: mockBaseline,
        rightOffset: mockBaseline,
        joinTypes: new Map(),
        intersectionData: [],
        healingHistory: [],
        geometricQuality: {
          geometricAccuracy: 0.95,
          topologicalConsistency: 0.9,
          manufacturability: 0.85,
          architecturalCompliance: 0.9,
          sliverFaceCount: 0,
          microGapCount: 0,
          selfIntersectionCount: 0,
          degenerateElementCount: 0,
          complexity: 1,
          processingEfficiency: 0.8,
          memoryUsage: 1000
        },
        processingTime: 10
      })
    ];

    mockIntersectionPoint = {
      x: 50,
      y: 0,
      id: 'intersection_point_1',
      tolerance: 1e-6,
      creationMethod: 'intersection_calculation',
      accuracy: 0.95,
      validated: true
    };
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('intersection creation', () => {
    test('should create intersection data successfully', async () => {
      const intersection = await manager.createIntersection(
        'test_intersection_1',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint,
        {
          computeMiterApex: true,
          resolutionMethod: 'miter_apex_calculation'
        }
      );

      expect(intersection.id).toBe('test_intersection_1');
      expect(intersection.type).toBe(IntersectionType.T_JUNCTION);
      expect(intersection.participatingWalls).toEqual(['wall_1', 'wall_2']);
      expect(intersection.intersectionPoint).toBe(mockIntersectionPoint);
      expect(intersection.resolutionMethod).toBe('miter_apex_calculation');
      expect(intersection.validated).toBe(false); // Will be validated separately
      expect(intersection.processingTime).toBeGreaterThan(0);
    });

    test('should compute miter apex when requested', async () => {
      const intersection = await manager.createIntersection(
        'test_intersection_with_miter',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint,
        {
          computeMiterApex: true
        }
      );

      expect(intersection.miterApex).toBeDefined();
      expect(intersection.miterApex).not.toBeNull();
    });

    test('should skip miter apex computation when not requested', async () => {
      const intersection = await manager.createIntersection(
        'test_intersection_no_miter',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint,
        {
          computeMiterApex: false
        }
      );

      expect(intersection.miterApex).toBeNull();
    });

    test('should throw error for insufficient walls', async () => {
      await expect(
        manager.createIntersection(
          'invalid_intersection',
          IntersectionType.T_JUNCTION,
          [mockWalls[0]], // Only one wall
          mockIntersectionPoint
        )
      ).rejects.toThrow('Intersection requires at least 2 walls');
    });

    test('should skip validation when requested', async () => {
      const intersection = await manager.createIntersection(
        'unvalidated_intersection',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint,
        {
          skipValidation: true
        }
      );

      expect(intersection.validated).toBe(false);
    });

    test('should use caching when enabled', async () => {
      const intersection1 = await manager.createIntersection(
        'cached_intersection_1',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint
      );

      // Create another intersection with same parameters (should hit cache)
      const intersection2 = await manager.createIntersection(
        'cached_intersection_2',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint
      );

      const stats = manager.getCacheStatistics();
      expect(stats.hitCount).toBeGreaterThan(0);
    });
  });

  describe('intersection retrieval', () => {
    test('should retrieve intersection by ID', async () => {
      const created = await manager.createIntersection(
        'retrievable_intersection',
        IntersectionType.L_JUNCTION,
        mockWalls,
        mockIntersectionPoint
      );

      const retrieved = manager.getIntersection('retrievable_intersection');
      expect(retrieved).toBe(created);
    });

    test('should return null for non-existent intersection', () => {
      const retrieved = manager.getIntersection('non_existent_id');
      expect(retrieved).toBeNull();
    });

    test('should find intersections by participating walls', async () => {
      await manager.createIntersection(
        'wall_intersection_1',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint
      );

      await manager.createIntersection(
        'wall_intersection_2',
        IntersectionType.L_JUNCTION,
        mockWalls, // Use both walls
        mockIntersectionPoint
      );

      const foundByWall1 = manager.findIntersectionsByWalls(['wall_1']);
      expect(foundByWall1).toHaveLength(2); // Both intersections involve wall_1

      const foundByWall2 = manager.findIntersectionsByWalls(['wall_2']);
      expect(foundByWall2).toHaveLength(2); // Both intersections involve wall_2
    });

    test('should find intersections by type', async () => {
      await manager.createIntersection(
        'type_intersection_1',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint
      );

      await manager.createIntersection(
        'type_intersection_2',
        IntersectionType.L_JUNCTION,
        mockWalls,
        mockIntersectionPoint
      );

      const tJunctions = manager.findIntersectionsByType(IntersectionType.T_JUNCTION);
      expect(tJunctions).toHaveLength(1);
      expect(tJunctions[0].type).toBe(IntersectionType.T_JUNCTION);

      const lJunctions = manager.findIntersectionsByType(IntersectionType.L_JUNCTION);
      expect(lJunctions).toHaveLength(1);
      expect(lJunctions[0].type).toBe(IntersectionType.L_JUNCTION);
    });

    test('should get all intersections', async () => {
      await manager.createIntersection('all_1', IntersectionType.T_JUNCTION, mockWalls, mockIntersectionPoint);
      await manager.createIntersection('all_2', IntersectionType.L_JUNCTION, mockWalls, mockIntersectionPoint);
      await manager.createIntersection('all_3', IntersectionType.CROSS_JUNCTION, mockWalls, mockIntersectionPoint);

      const allIntersections = manager.getAllIntersections();
      expect(allIntersections).toHaveLength(3);
    });
  });

  describe('miter apex computation', () => {
    test('should compute miter apex with caching', async () => {
      const leftIntersection: BIMPoint = {
        x: 45,
        y: 0,
        id: 'left_intersection',
        tolerance: 1e-6,
        creationMethod: 'offset_calculation',
        accuracy: 0.9,
        validated: true
      };

      const rightIntersection: BIMPoint = {
        x: 55,
        y: 0,
        id: 'right_intersection',
        tolerance: 1e-6,
        creationMethod: 'offset_calculation',
        accuracy: 0.9,
        validated: true
      };

      const miter1 = await manager.computeMiterApex(
        leftIntersection,
        rightIntersection,
        mockIntersectionPoint,
        10
      );

      const miter2 = await manager.computeMiterApex(
        leftIntersection,
        rightIntersection,
        mockIntersectionPoint,
        10
      );

      expect(miter1.apex).toBeDefined();
      expect(miter2.apex).toBeDefined();
      
      // Second call should hit cache
      const stats = manager.getCacheStatistics();
      expect(stats.hitCount).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    test('should validate intersection data', async () => {
      const intersection = await manager.createIntersection(
        'validation_test',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint,
        {
          skipValidation: true // Skip initial validation
        }
      );

      const validationResult = manager.validateIntersection(intersection);
      
      expect(validationResult.isValid).toBeDefined();
      expect(validationResult.errors).toBeDefined();
      expect(validationResult.warnings).toBeDefined();
      expect(validationResult.qualityScore).toBeGreaterThanOrEqual(0);
      expect(validationResult.qualityScore).toBeLessThanOrEqual(1);
      expect(validationResult.recommendations).toBeDefined();
    });

    test('should skip validation when disabled', () => {
      const noValidationManager = new IntersectionManager({
        enableValidation: false
      });

      const mockIntersection = {
        id: 'test',
        validate: () => ({ isValid: false, errors: ['test error'], warnings: [], qualityScore: 0 })
      } as any;

      const result = noValidationManager.validateIntersection(mockIntersection);
      
      expect(result.isValid).toBe(true); // Should return true when validation is disabled
      expect(result.errors).toHaveLength(0);
      
      noValidationManager.dispose();
    });
  });

  describe('quality assessment', () => {
    test('should assess intersection quality', async () => {
      const intersection = await manager.createIntersection(
        'quality_test',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint,
        {
          computeMiterApex: true
        }
      );

      const qualityResult = manager.assessIntersectionQuality(intersection);
      
      expect(qualityResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(qualityResult.overallScore).toBeLessThanOrEqual(1);
      expect(qualityResult.geometricAccuracy).toBeGreaterThanOrEqual(0);
      expect(qualityResult.geometricAccuracy).toBeLessThanOrEqual(1);
      expect(qualityResult.topologicalConsistency).toBeGreaterThanOrEqual(0);
      expect(qualityResult.topologicalConsistency).toBeLessThanOrEqual(1);
      expect(qualityResult.manufacturability).toBeGreaterThanOrEqual(0);
      expect(qualityResult.manufacturability).toBeLessThanOrEqual(1);
      expect(qualityResult.issues).toBeDefined();
    });

    test('should skip quality assessment when disabled', () => {
      const noQualityManager = new IntersectionManager({
        enableQualityAssessment: false
      });

      const mockIntersection = {
        geometricAccuracy: 0.5,
        offsetIntersections: [],
        miterApex: null,
        type: IntersectionType.T_JUNCTION,
        intersectionPoint: mockIntersectionPoint
      } as any;

      const result = noQualityManager.assessIntersectionQuality(mockIntersection);
      
      expect(result.overallScore).toBe(1.0);
      expect(result.issues).toHaveLength(0);
      
      noQualityManager.dispose();
    });

    test('should identify quality issues', async () => {
      // Create intersection with low accuracy to trigger quality issues
      const lowAccuracyPoint: BIMPoint = {
        ...mockIntersectionPoint,
        accuracy: 0.5 // Low accuracy
      };

      const intersection = await manager.createIntersection(
        'low_quality_test',
        IntersectionType.T_JUNCTION,
        mockWalls,
        lowAccuracyPoint,
        {
          skipValidation: true
        }
      );

      // Manually set low geometric accuracy
      (intersection as any).geometricAccuracy = 0.6;

      const qualityResult = manager.assessIntersectionQuality(intersection);
      
      expect(qualityResult.issues.length).toBeGreaterThan(0);
      expect(qualityResult.issues.some(issue => issue.type === 'geometric_accuracy')).toBe(true);
    });
  });

  describe('intersection updates', () => {
    test('should update intersection data', async () => {
      const intersection = await manager.createIntersection(
        'updatable_intersection',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint
      );

      const updated = manager.updateIntersection('updatable_intersection', {
        type: IntersectionType.L_JUNCTION,
        geometricAccuracy: 0.99
      });

      expect(updated).toBeDefined();
      expect(updated?.type).toBe(IntersectionType.L_JUNCTION);
      expect(updated?.geometricAccuracy).toBe(0.99);
    });

    test('should return null for non-existent intersection update', () => {
      const updated = manager.updateIntersection('non_existent', {
        geometricAccuracy: 0.99
      });

      expect(updated).toBeNull();
    });
  });

  describe('intersection removal', () => {
    test('should remove intersection data', async () => {
      await manager.createIntersection(
        'removable_intersection',
        IntersectionType.T_JUNCTION,
        mockWalls,
        mockIntersectionPoint
      );

      const removed = manager.removeIntersection('removable_intersection');
      expect(removed).toBe(true);

      const retrieved = manager.getIntersection('removable_intersection');
      expect(retrieved).toBeNull();
    });

    test('should return false for non-existent intersection removal', () => {
      const removed = manager.removeIntersection('non_existent');
      expect(removed).toBe(false);
    });
  });

  describe('cache management', () => {
    test('should provide cache statistics', async () => {
      await manager.createIntersection('stats_test', IntersectionType.T_JUNCTION, mockWalls, mockIntersectionPoint);
      
      const stats = manager.getCacheStatistics();
      
      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(stats.hitCount).toBeGreaterThanOrEqual(0);
      expect(stats.missCount).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });

    test('should optimize cache', async () => {
      // Create multiple intersections to populate cache
      for (let i = 0; i < 5; i++) {
        await manager.createIntersection(
          `optimize_test_${i}`,
          IntersectionType.T_JUNCTION,
          mockWalls,
          mockIntersectionPoint
        );
      }

      const optimizedCount = manager.optimizeCache();
      expect(optimizedCount).toBeGreaterThanOrEqual(0);
    });

    test('should clear all data', async () => {
      await manager.createIntersection('clear_test', IntersectionType.T_JUNCTION, mockWalls, mockIntersectionPoint);
      
      manager.clear();
      
      const allIntersections = manager.getAllIntersections();
      expect(allIntersections).toHaveLength(0);
      
      const stats = manager.getCacheStatistics();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('error handling', () => {
    test('should handle invalid wall data gracefully', async () => {
      const invalidWalls = [null, undefined] as any;

      await expect(
        manager.createIntersection(
          'invalid_walls_test',
          IntersectionType.T_JUNCTION,
          invalidWalls,
          mockIntersectionPoint
        )
      ).rejects.toThrow();
    });

    test('should handle missing intersection point', async () => {
      await expect(
        manager.createIntersection(
          'missing_point_test',
          IntersectionType.T_JUNCTION,
          mockWalls,
          null as any
        )
      ).rejects.toThrow();
    });

    test('should handle caching disabled', () => {
      const noCacheManager = new IntersectionManager({
        enableCaching: false
      });

      expect(() => {
        noCacheManager.getCacheStatistics();
        noCacheManager.optimizeCache();
      }).not.toThrow();

      noCacheManager.dispose();
    });
  });

  describe('performance', () => {
    test('should handle multiple intersections efficiently', async () => {
      const startTime = performance.now();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          manager.createIntersection(
            `performance_test_${i}`,
            IntersectionType.T_JUNCTION,
            mockWalls,
            mockIntersectionPoint
          )
        );
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      const allIntersections = manager.getAllIntersections();
      expect(allIntersections).toHaveLength(10);
    });
  });
});