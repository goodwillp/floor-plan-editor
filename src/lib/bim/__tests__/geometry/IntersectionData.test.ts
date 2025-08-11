/**
 * Unit tests for IntersectionData class
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { IntersectionDataImpl } from '../../geometry/IntersectionData';
import { IntersectionType } from '../../types/BIMTypes';
import type { BIMPoint } from '../../geometry/BIMPoint';
import type { BIMPolygon } from '../../geometry/BIMPolygon';

describe('IntersectionData', () => {
  let mockIntersectionPoint: BIMPoint;
  let mockMiterApex: BIMPoint;
  let mockOffsetIntersections: BIMPoint[];
  let mockResolvedGeometry: BIMPolygon;

  beforeEach(() => {
    mockIntersectionPoint = {
      x: 100,
      y: 100,
      id: 'intersection_point_1',
      tolerance: 1e-6,
      creationMethod: 'test',
      accuracy: 0.95,
      validated: true
    };

    mockMiterApex = {
      x: 105,
      y: 105,
      id: 'miter_apex_1',
      tolerance: 1e-6,
      creationMethod: 'miter_calculation',
      accuracy: 0.9,
      validated: true
    };

    mockOffsetIntersections = [
      {
        x: 95,
        y: 100,
        id: 'offset_left_1',
        tolerance: 1e-6,
        creationMethod: 'offset_calculation',
        accuracy: 0.85,
        validated: true
      },
      {
        x: 105,
        y: 100,
        id: 'offset_right_1',
        tolerance: 1e-6,
        creationMethod: 'offset_calculation',
        accuracy: 0.85,
        validated: true
      }
    ];

    mockResolvedGeometry = {
      id: 'resolved_geometry_1',
      outerRing: [
        { x: 90, y: 90, id: 'p1', tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
        { x: 110, y: 90, id: 'p2', tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
        { x: 110, y: 110, id: 'p3', tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
        { x: 90, y: 110, id: 'p4', tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
      ],
      holes: [],
      area: 400,
      perimeter: 80,
      centroid: { x: 100, y: 100, id: 'centroid', tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
      boundingBox: { minX: 90, minY: 90, maxX: 110, maxY: 110 },
      isValid: true,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'test_geometry',
      healingApplied: false,
      simplificationApplied: false
    };
  });

  describe('constructor', () => {
    test('should create intersection data with all required properties', () => {
      const intersection = new IntersectionDataImpl({
        id: 'test_intersection_1',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: mockMiterApex,
        offsetIntersections: mockOffsetIntersections,
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'miter_apex_calculation',
        geometricAccuracy: 0.95,
        validated: true,
        processingTime: 15.5
      });

      expect(intersection.id).toBe('test_intersection_1');
      expect(intersection.type).toBe(IntersectionType.T_JUNCTION);
      expect(intersection.participatingWalls).toEqual(['wall_1', 'wall_2']);
      expect(intersection.intersectionPoint).toBe(mockIntersectionPoint);
      expect(intersection.miterApex).toBe(mockMiterApex);
      expect(intersection.offsetIntersections).toEqual(mockOffsetIntersections);
      expect(intersection.resolvedGeometry).toBe(mockResolvedGeometry);
      expect(intersection.resolutionMethod).toBe('miter_apex_calculation');
      expect(intersection.geometricAccuracy).toBe(0.95);
      expect(intersection.validated).toBe(true);
      expect(intersection.processingTime).toBe(15.5);
      expect(intersection.createdAt).toBeInstanceOf(Date);
      expect(intersection.lastModified).toBeInstanceOf(Date);
      expect(intersection.cached).toBe(false);
      expect(intersection.cacheKey).toContain('intersection_');
    });

    test('should generate unique cache key', () => {
      const intersection1 = new IntersectionDataImpl({
        id: 'test_1',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: [],
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 10
      });

      const intersection2 = new IntersectionDataImpl({
        id: 'test_2',
        type: IntersectionType.L_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: [],
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 10
      });

      expect(intersection1.cacheKey).not.toBe(intersection2.cacheKey);
    });
  });

  describe('cache management', () => {
    test('should mark as cached and update last modified', () => {
      const intersection = new IntersectionDataImpl({
        id: 'test_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: [],
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 10
      });

      const initialLastModified = intersection.lastModified;
      expect(intersection.cached).toBe(false);

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        intersection.markAsCached();
        
        expect(intersection.cached).toBe(true);
        expect(intersection.lastModified.getTime()).toBeGreaterThan(initialLastModified.getTime());
      }, 10);
    });

    test('should clear cache status', () => {
      const intersection = new IntersectionDataImpl({
        id: 'test_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: [],
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 10
      });

      intersection.markAsCached();
      expect(intersection.cached).toBe(true);

      intersection.clearCache();
      expect(intersection.cached).toBe(false);
    });
  });

  describe('validation', () => {
    test('should validate correct intersection data', () => {
      const intersection = new IntersectionDataImpl({
        id: 'valid_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: mockMiterApex,
        offsetIntersections: mockOffsetIntersections,
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'miter_apex_calculation',
        geometricAccuracy: 0.95,
        validated: true,
        processingTime: 15.5
      });

      const result = intersection.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.qualityScore).toBeGreaterThan(0.9);
    });

    test('should detect empty ID error', () => {
      const intersection = new IntersectionDataImpl({
        id: '',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: [],
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 10
      });

      const result = intersection.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Intersection ID cannot be empty');
    });

    test('should detect insufficient participating walls', () => {
      const intersection = new IntersectionDataImpl({
        id: 'test_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1'], // Only one wall
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: [],
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 10
      });

      const result = intersection.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Intersection must involve at least 2 walls');
    });

    test('should detect invalid geometric accuracy', () => {
      const intersection = new IntersectionDataImpl({
        id: 'test_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: [],
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 1.5, // Invalid value > 1
        validated: true,
        processingTime: 10
      });

      const result = intersection.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Geometric accuracy must be between 0 and 1');
    });

    test('should warn about missing offset intersections', () => {
      const intersection = new IntersectionDataImpl({
        id: 'test_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: [], // Empty array
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 10
      });

      const result = intersection.validate();
      
      expect(result.isValid).toBe(true); // Still valid, just a warning
      expect(result.warnings).toContain('No offset intersections defined');
    });

    test('should warn about missing miter apex for T-junction', () => {
      const intersection = new IntersectionDataImpl({
        id: 'test_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null, // Missing miter apex
        offsetIntersections: mockOffsetIntersections,
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'test',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 10
      });

      const result = intersection.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Miter apex should be defined for T-junction and L-junction intersections');
    });
  });

  describe('cloning', () => {
    test('should create clone with updated properties', () => {
      const original = new IntersectionDataImpl({
        id: 'original_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: null,
        offsetIntersections: mockOffsetIntersections,
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'original_method',
        geometricAccuracy: 0.8,
        validated: false,
        processingTime: 10
      });

      const clone = original.clone({
        type: IntersectionType.L_JUNCTION,
        geometricAccuracy: 0.95,
        validated: true
      });

      expect(clone.id).toBe(original.id); // Should keep original ID
      expect(clone.type).toBe(IntersectionType.L_JUNCTION); // Should use updated type
      expect(clone.geometricAccuracy).toBe(0.95); // Should use updated accuracy
      expect(clone.validated).toBe(true); // Should use updated validation status
      expect(clone.resolutionMethod).toBe('original_method'); // Should keep original method
      expect(clone.participatingWalls).toEqual(original.participatingWalls); // Should keep original walls
    });

    test('should create clone without updates', () => {
      const original = new IntersectionDataImpl({
        id: 'original_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: mockMiterApex,
        offsetIntersections: mockOffsetIntersections,
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'original_method',
        geometricAccuracy: 0.8,
        validated: false,
        processingTime: 10
      });

      const clone = original.clone({});

      expect(clone.id).toBe(original.id);
      expect(clone.type).toBe(original.type);
      expect(clone.geometricAccuracy).toBe(original.geometricAccuracy);
      expect(clone.validated).toBe(original.validated);
      expect(clone.resolutionMethod).toBe(original.resolutionMethod);
    });
  });

  describe('serialization', () => {
    test('should serialize to JSON correctly', () => {
      const intersection = new IntersectionDataImpl({
        id: 'test_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: ['wall_1', 'wall_2'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: mockMiterApex,
        offsetIntersections: mockOffsetIntersections,
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'miter_apex_calculation',
        geometricAccuracy: 0.95,
        validated: true,
        processingTime: 15.5
      });

      const json = intersection.toJSON();

      expect(json.id).toBe('test_intersection');
      expect(json.type).toBe(IntersectionType.T_JUNCTION);
      expect(json.participatingWalls).toEqual(['wall_1', 'wall_2']);
      expect(json.intersectionPoint).toBe(mockIntersectionPoint);
      expect(json.miterApex).toBe(mockMiterApex);
      expect(json.offsetIntersections).toEqual(mockOffsetIntersections);
      expect(json.resolutionMethod).toBe('miter_apex_calculation');
      expect(json.geometricAccuracy).toBe(0.95);
      expect(json.validated).toBe(true);
      expect(json.processingTime).toBe(15.5);
      expect(json.createdAt).toBeDefined();
      expect(json.lastModified).toBeDefined();
      expect(json.cached).toBe(false);
      expect(json.cacheKey).toBeDefined();
    });

    test('should deserialize from JSON correctly', () => {
      const jsonData = {
        id: 'test_intersection',
        type: IntersectionType.L_JUNCTION,
        participatingWalls: ['wall_3', 'wall_4'],
        intersectionPoint: mockIntersectionPoint,
        miterApex: mockMiterApex,
        offsetIntersections: mockOffsetIntersections,
        resolvedGeometry: mockResolvedGeometry,
        resolutionMethod: 'corner_geometry_calculation',
        geometricAccuracy: 0.9,
        validated: true,
        processingTime: 20.0,
        cached: true
      };

      const intersection = IntersectionDataImpl.fromJSON(jsonData);

      expect(intersection.id).toBe('test_intersection');
      expect(intersection.type).toBe(IntersectionType.L_JUNCTION);
      expect(intersection.participatingWalls).toEqual(['wall_3', 'wall_4']);
      expect(intersection.resolutionMethod).toBe('corner_geometry_calculation');
      expect(intersection.geometricAccuracy).toBe(0.9);
      expect(intersection.validated).toBe(true);
      expect(intersection.processingTime).toBe(20.0);
      expect(intersection.cached).toBe(true);
    });
  });
});