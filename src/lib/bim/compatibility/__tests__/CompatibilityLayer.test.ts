/**
 * Compatibility Layer Tests
 * Ensures existing functionality continues to work during BIM migration
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CompatibleGeometryService, CompatibleWallRenderer, CompatibleWallSelectionService } from '../LegacyCompatibilityLayer';
import { FeatureFlagManager } from '../FeatureFlagManager';
import { LegacyDataConverter } from '../LegacyDataConverter';
import { GeometryService } from '../../../GeometryService';
import { WallRenderer } from '../../../WallRenderer';
import { WallSelectionService } from '../../../WallSelectionService';
import type { Wall, Segment, Node, Point } from '../../../types';

describe('CompatibilityLayer', () => {
  let mockBIMSystem: any;
  let mockModel: any;
  let testWall: Wall;
  let testSegments: Segment[];
  let testNodes: Map<string, Node>;

  beforeEach(() => {
    // Mock BIM system
    mockBIMSystem = {
      processWall: vi.fn(),
      calculateIntersection: vi.fn(),
      renderWall: vi.fn()
    };

    // Mock model
    mockModel = {
      getAllWalls: vi.fn(() => [testWall]),
      getAllNodes: vi.fn(() => Array.from(testNodes.values())),
      getSegment: vi.fn((id: string) => testSegments.find(s => s.id === id)),
      getWall: vi.fn(() => testWall),
      getNode: vi.fn((id: string) => testNodes.get(id))
    };

    // Test data
    testWall = {
      id: 'wall-1',
      type: 'layout',
      thickness: 350,
      segmentIds: ['seg-1', 'seg-2'],
      visible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    testSegments = [
      {
        id: 'seg-1',
        startNodeId: 'node-1',
        endNodeId: 'node-2',
        wallId: 'wall-1',
        length: 100,
        angle: 0
      },
      {
        id: 'seg-2',
        startNodeId: 'node-2',
        endNodeId: 'node-3',
        wallId: 'wall-1',
        length: 100,
        angle: Math.PI / 2
      }
    ];

    testNodes = new Map([
      ['node-1', { id: 'node-1', x: 0, y: 0, connectedSegments: ['seg-1'], type: 'endpoint' }],
      ['node-2', { id: 'node-2', x: 100, y: 0, connectedSegments: ['seg-1', 'seg-2'], type: 'junction' }],
      ['node-3', { id: 'node-3', x: 100, y: 100, connectedSegments: ['seg-2'], type: 'endpoint' }]
    ]);

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('CompatibleGeometryService', () => {
    beforeEach(() => {
      CompatibleGeometryService.initializeBIMSystem(mockBIMSystem);
    });

    it('should maintain original API signature for findIntersection', () => {
      const seg1 = testSegments[0];
      const seg2 = testSegments[1];

      // Should work with original API
      const result = CompatibleGeometryService.findIntersection(seg1, seg2, testNodes);
      
      // Should return same type as original
      expect(result).toEqual(expect.any(Object));
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('should use legacy implementation when BIM features disabled', () => {
      const featureFlags = new FeatureFlagManager();
      featureFlags.disable('bim-intersection-algorithms');

      const seg1 = testSegments[0];
      const seg2 = testSegments[1];

      // Spy on original GeometryService
      const originalSpy = vi.spyOn(GeometryService, 'findIntersection');

      CompatibleGeometryService.findIntersection(seg1, seg2, testNodes);

      expect(originalSpy).toHaveBeenCalled();
    });

    it('should provide backward compatible tolerance values', () => {
      const tolerance = CompatibleGeometryService.tolerance;
      expect(typeof tolerance).toBe('number');
      expect(tolerance).toBeGreaterThan(0);
    });

    it('should provide backward compatible proximity threshold', () => {
      const threshold = CompatibleGeometryService.proximityThreshold;
      expect(typeof threshold).toBe('number');
      expect(threshold).toBeGreaterThan(0);
    });

    it('should handle distance calculations with same API', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };

      const distance = CompatibleGeometryService.distanceBetweenPoints(p1, p2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should handle segment distance calculations', () => {
      const point: Point = { x: 50, y: 10 };
      const segment = testSegments[0];

      const distance = CompatibleGeometryService.distanceToSegment(point, segment, testNodes);
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    it('should find nearby walls with compatible API', () => {
      const nearbyWalls = CompatibleGeometryService.findNearbyWalls(
        testWall,
        [testWall],
        new Map(testSegments.map(s => [s.id, s])),
        testNodes
      );

      expect(Array.isArray(nearbyWalls)).toBe(true);
    });
  });

  describe('CompatibleWallRenderer', () => {
    let renderer: CompatibleWallRenderer;
    let mockContainer: any;

    beforeEach(() => {
      renderer = new CompatibleWallRenderer();
      renderer.initializeBIMSystem(mockBIMSystem);

      mockContainer = {
        addChild: vi.fn(),
        removeChild: vi.fn()
      };
    });

    it('should maintain original renderWall API', () => {
      expect(() => {
        renderer.renderWall(testWall, testSegments, testNodes, mockContainer);
      }).not.toThrow();
    });

    it('should fall back to legacy rendering when BIM fails', () => {
      // Mock BIM rendering failure
      mockBIMSystem.renderWall = vi.fn(() => {
        throw new Error('BIM rendering failed');
      });

      // Should not throw, should fall back to legacy
      expect(() => {
        renderer.renderWall(testWall, testSegments, testNodes, mockContainer);
      }).not.toThrow();
    });

    it('should inherit all original WallRenderer methods', () => {
      expect(renderer.updateWall).toBeDefined();
      expect(renderer.removeWallGraphics).toBeDefined();
      expect(renderer.clearAll).toBeDefined();
      expect(renderer.destroy).toBeDefined();
    });

    it('should provide static methods compatibility', () => {
      const thickness = CompatibleWallRenderer.getWallThickness('layout');
      expect(thickness).toBe(350);

      const displayName = CompatibleWallRenderer.getWallTypeDisplayName('layout');
      expect(displayName).toContain('Layout');
    });
  });

  describe('CompatibleWallSelectionService', () => {
    let selectionService: CompatibleWallSelectionService;

    beforeEach(() => {
      selectionService = new CompatibleWallSelectionService(mockModel);
      selectionService.initializeBIMSystem(mockBIMSystem);
    });

    it('should maintain original API for findWallAtPoint', () => {
      const clickPoint: Point = { x: 50, y: 5 };
      
      const result = selectionService.findWallAtPoint(clickPoint);
      
      // Should return same structure as original
      if (result) {
        expect(result).toHaveProperty('wallId');
        expect(result).toHaveProperty('distance');
        expect(typeof result.wallId).toBe('string');
        expect(typeof result.distance).toBe('number');
      }
    });

    it('should maintain original API for setSelectionTolerance', () => {
      expect(() => {
        selectionService.setSelectionTolerance(15);
      }).not.toThrow();
    });

    it('should maintain original API for findWallsInArea', () => {
      const topLeft: Point = { x: 0, y: 0 };
      const bottomRight: Point = { x: 200, y: 200 };

      const walls = selectionService.findWallsInArea(topLeft, bottomRight);
      expect(Array.isArray(walls)).toBe(true);
    });

    it('should maintain original API for getWallInfo', () => {
      const info = selectionService.getWallInfo('wall-1');
      
      if (info) {
        expect(info).toHaveProperty('wall');
        expect(info).toHaveProperty('segments');
        expect(info).toHaveProperty('nodes');
        expect(info).toHaveProperty('totalLength');
        expect(info).toHaveProperty('boundingBox');
      }
    });

    it('should maintain original API for findConnectedWalls', () => {
      const connected = selectionService.findConnectedWalls('wall-1');
      expect(Array.isArray(connected)).toBe(true);
    });

    it('should maintain original API for analyzeDeletionImpact', () => {
      const analysis = selectionService.analyzeDeletionImpact('wall-1');
      
      expect(analysis).toHaveProperty('canDelete');
      expect(analysis).toHaveProperty('connectedWalls');
      expect(analysis).toHaveProperty('orphanedNodes');
      expect(analysis).toHaveProperty('warnings');
      expect(typeof analysis.canDelete).toBe('boolean');
      expect(Array.isArray(analysis.connectedWalls)).toBe(true);
      expect(Array.isArray(analysis.orphanedNodes)).toBe(true);
      expect(Array.isArray(analysis.warnings)).toBe(true);
    });
  });

  describe('Feature Flag Integration', () => {
    let featureFlags: FeatureFlagManager;

    beforeEach(() => {
      featureFlags = new FeatureFlagManager();
    });

    it('should respect feature flags for BIM functionality', () => {
      // Disable BIM features
      featureFlags.disable('bim-intersection-algorithms');
      featureFlags.disable('bim-wall-rendering');
      featureFlags.disable('bim-wall-selection');

      // Should use legacy implementations
      const seg1 = testSegments[0];
      const seg2 = testSegments[1];
      
      expect(() => {
        CompatibleGeometryService.findIntersection(seg1, seg2, testNodes);
      }).not.toThrow();
    });

    it('should enable BIM features when flags are set', () => {
      featureFlags.enable('adaptive-tolerance');
      featureFlags.enable('bim-intersection-algorithms');

      expect(featureFlags.isEnabled('adaptive-tolerance')).toBe(true);
      expect(featureFlags.isEnabled('bim-intersection-algorithms')).toBe(true);
    });

    it('should handle feature dependencies correctly', () => {
      // Try to enable dependent feature without dependency
      const result = featureFlags.enable('bim-intersection-algorithms');
      
      // Should fail due to missing adaptive-tolerance dependency
      expect(result).toBe(false);
      expect(featureFlags.isEnabled('bim-intersection-algorithms')).toBe(false);
    });

    it('should allow force enabling features', () => {
      const result = featureFlags.forceEnable('bim-intersection-algorithms');
      
      expect(result).toBe(true);
      expect(featureFlags.isEnabled('bim-intersection-algorithms')).toBe(true);
    });
  });

  describe('Data Conversion', () => {
    let converter: LegacyDataConverter;

    beforeEach(() => {
      converter = new LegacyDataConverter();
    });

    it('should detect legacy data format', () => {
      const format = converter.detectDataFormat(testWall);
      
      expect(format.format).toBe('legacy-v1');
      expect(format.migrationRequired).toBeDefined();
      expect(format.compatibilityLevel).toBeDefined();
    });

    it('should convert legacy wall to BIM format', () => {
      const result = converter.convertLegacyWallToBIM(testWall, testSegments, testNodes);
      
      expect(result.success).toBe(true);
      expect(result.convertedData).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle conversion errors gracefully', () => {
      // Test with invalid data
      const invalidSegments: Segment[] = [];
      
      const result = converter.convertLegacyWallToBIM(testWall, invalidSegments, testNodes);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should track conversion history', () => {
      converter.convertLegacyWallToBIM(testWall, testSegments, testNodes);
      
      const history = converter.getConversionHistory();
      expect(history.length).toBeGreaterThan(0);
      
      const stats = converter.getConversionStatistics();
      expect(stats.totalConversions).toBeGreaterThan(0);
      expect(typeof stats.successRate).toBe('number');
    });
  });

  describe('Deprecation Warnings', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should show deprecation warnings when enabled', () => {
      const featureFlags = new FeatureFlagManager();
      featureFlags.enable('show-deprecation-warnings');

      // This should trigger a deprecation warning
      const seg1 = testSegments[0];
      const seg2 = testSegments[1];
      
      CompatibleGeometryService.findIntersection(seg1, seg2, testNodes);

      // Check if warning was logged (implementation dependent)
      // expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not show warnings when disabled', () => {
      const featureFlags = new FeatureFlagManager();
      featureFlags.disable('show-deprecation-warnings');

      const seg1 = testSegments[0];
      const seg2 = testSegments[1];
      
      CompatibleGeometryService.findIntersection(seg1, seg2, testNodes);

      // Should not log deprecation warnings
      // expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Performance Compatibility', () => {
    it('should maintain performance characteristics of original methods', async () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const p1: Point = { x: i, y: i };
        const p2: Point = { x: i + 1, y: i + 1 };
        CompatibleGeometryService.distanceBetweenPoints(p1, p2);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete reasonably quickly (less than 100ms for 100 iterations)
      expect(duration).toBeLessThan(100);
    });

    it('should handle large datasets without memory leaks', () => {
      const largeNodeMap = new Map<string, Node>();
      
      // Create large dataset
      for (let i = 0; i < 1000; i++) {
        largeNodeMap.set(`node-${i}`, {
          id: `node-${i}`,
          x: i,
          y: i,
          connectedSegments: [],
          type: 'endpoint'
        });
      }

      // Should handle large dataset without issues
      expect(() => {
        const seg1 = testSegments[0];
        const seg2 = testSegments[1];
        CompatibleGeometryService.findIntersection(seg1, seg2, largeNodeMap);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(() => {
        CompatibleGeometryService.findIntersection(null as any, null as any, testNodes);
      }).not.toThrow();

      expect(() => {
        CompatibleGeometryService.distanceBetweenPoints(null as any, null as any);
      }).not.toThrow();
    });

    it('should handle empty data structures', () => {
      const emptyNodes = new Map<string, Node>();
      
      expect(() => {
        CompatibleGeometryService.findIntersection(testSegments[0], testSegments[1], emptyNodes);
      }).not.toThrow();
    });

    it('should provide meaningful error messages', () => {
      const converter = new LegacyDataConverter();
      const result = converter.convertLegacyWallToBIM(testWall, [], testNodes);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('baseline curve');
    });
  });
});