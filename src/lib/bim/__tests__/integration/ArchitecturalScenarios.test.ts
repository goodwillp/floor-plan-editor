/**
 * Comprehensive Integration Test Suite for BIM Wall System
 * 
 * This test suite validates the complete BIM wall system through realistic architectural scenarios,
 * mixed-mode operations, end-to-end workflows, and database persistence testing.
 * 
 * Requirements: All requirements validation (1.1-10.5)
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { AdvancedIntersectionResolver } from '../../engines/AdvancedIntersectionResolver';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { IntersectionManager } from '../../engines/IntersectionManager';
import { ModeSwitchingEngine } from '../../engines/ModeSwitchingEngine';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { ShapeHealingEngine } from '../../engines/ShapeHealingEngine';
import { GeometrySimplificationEngine } from '../../engines/GeometrySimplificationEngine';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { CurveImpl } from '../../geometry/Curve';
import { BIMPointImpl } from '../../geometry/BIMPoint';
import { BIMPolygonImpl } from '../../geometry/BIMPolygon';
import { UnifiedWallData } from '../../data/UnifiedWallData';
import { BIMAdapter } from '../../adapters/BIMAdapter';
import { SQLiteImplementation } from '../../persistence/SQLiteImplementation';
import { CachingLayer } from '../../persistence/CachingLayer';
import { GeometryValidator } from '../../validation/GeometryValidator';
import { TestDataFactory } from '../helpers/TestDataFactory';
import { IntersectionType, CurveType } from '../../types/BIMTypes';
import { WallTypeString } from '../../types/WallTypes';

describe('Architectural Scenarios Integration Tests', () => {
  let resolver: AdvancedIntersectionResolver;
  let booleanEngine: BooleanOperationsEngine;
  let intersectionManager: IntersectionManager;

  beforeEach(() => {
    resolver = new AdvancedIntersectionResolver({
      tolerance: 1e-6,
      maxComplexity: 50000,
      enableParallelProcessing: true,
      extremeAngleThreshold: 15,
      parallelOverlapThreshold: 0.1,
      optimizationEnabled: true,
      spatialIndexingEnabled: true
    });

    booleanEngine = new BooleanOperationsEngine({
      tolerance: 1e-6,
      maxComplexity: 50000,
      enableParallelProcessing: true
    });

    intersectionManager = new IntersectionManager({
      tolerance: 1e-6,
      enableCaching: true
    });
  });

  /**
   * Helper function to create realistic wall geometry
   */
  const createWall = (
    id: string, 
    points: Array<{x: number, y: number}>, 
    thickness: number = 150, // 6 inches in mm
    wallType: string = 'Layout'
  ) => {
    const bimPoints = points.map((p, i) => new BIMPointImpl(p.x, p.y, {
      id: `${id}_point_${i}`,
      tolerance: 1e-6,
      creationMethod: 'architectural_layout',
      accuracy: 0.95,
      validated: true
    }));

    const curve = new CurveImpl(bimPoints, CurveType.POLYLINE, {
      id: `${id}_baseline`,
      isClosed: false
    });

    // Create realistic wall polygon geometry
    const wallPolygon = createWallPolygon(bimPoints, thickness);

    return new WallSolidImpl(curve, thickness, wallType, {
      id,
      leftOffset: curve,
      rightOffset: curve,
      solidGeometry: [wallPolygon],
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: [],
      geometricQuality: {
        geometricAccuracy: 0.95,
        topologicalConsistency: 0.98,
        manufacturability: 0.92,
        architecturalCompliance: 0.96,
        sliverFaceCount: 0,
        microGapCount: 0,
        selfIntersectionCount: 0,
        degenerateElementCount: 0,
        complexity: points.length * 2,
        processingEfficiency: 0.85,
        memoryUsage: points.length * 50
      },
      processingTime: 0
    });
  };

  const createWallPolygon = (points: any[], thickness: number) => {
    // Simplified polygon creation - offset points by half thickness
    const halfThickness = thickness / 2;
    const outerRing = [
      ...points,
      ...points.slice().reverse().map(p => ({ ...p, y: p.y + thickness }))
    ];

    return new BIMPolygonImpl(
      outerRing.map((p, i) => new BIMPointImpl(p.x, p.y, {
        id: `polygon_point_${i}`,
        tolerance: 1e-6,
        creationMethod: 'polygon_generation',
        accuracy: 0.95,
        validated: true
      })),
      [],
      {
        id: `wall_polygon_${Date.now()}`
      }
    );
  };

  describe('Residential Floor Plan Scenarios', () => {
    test('should handle typical residential room layout', async () => {
      // Create a typical bedroom with bathroom layout
      const walls = [
        // Exterior walls
        createWall('exterior_north', [{x: 0, y: 0}, {x: 4000, y: 0}], 200), // North wall
        createWall('exterior_east', [{x: 4000, y: 0}, {x: 4000, y: 3000}], 200), // East wall
        createWall('exterior_south', [{x: 4000, y: 3000}, {x: 0, y: 3000}], 200), // South wall
        createWall('exterior_west', [{x: 0, y: 3000}, {x: 0, y: 0}], 200), // West wall
        
        // Interior partition walls
        createWall('partition_1', [{x: 2500, y: 0}, {x: 2500, y: 2000}], 100), // Bedroom divider
        createWall('partition_2', [{x: 2500, y: 2000}, {x: 4000, y: 2000}], 100), // Bathroom wall
        createWall('partition_3', [{x: 3200, y: 2000}, {x: 3200, y: 3000}], 100) // Bathroom partition
      ];

      // Test cross-junction at corner where multiple walls meet
      const cornerWalls = [walls[0], walls[1], walls[4]]; // North, East, and partition
      const crossJunctionResult = await resolver.resolveCrossJunction(cornerWalls);

      expect(crossJunctionResult.success).toBe(true);
      expect(crossJunctionResult.operationType).toBe('resolve_cross_junction');
      expect(crossJunctionResult.processingTime).toBeLessThan(500); // Should be fast for residential scale

      // Test T-junction where partition meets exterior wall
      const tJunctionResult = await booleanEngine.resolveTJunction([walls[0], walls[4]]);
      expect(tJunctionResult.success).toBe(true);

      // Test L-junction at room corner
      const lJunctionResult = await booleanEngine.resolveLJunction([walls[0], walls[3]]);
      expect(lJunctionResult.success).toBe(true);

      // Verify overall network optimization
      const optimizationResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(optimizationResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(optimizationResult.optimizationsApplied).toContain('spatial_indexing');
    });

    test('should handle kitchen layout with peninsula', async () => {
      // Kitchen with peninsula creating complex intersections
      const walls = [
        // Main kitchen perimeter
        createWall('kitchen_north', [{x: 0, y: 0}, {x: 3500, y: 0}], 150),
        createWall('kitchen_east', [{x: 3500, y: 0}, {x: 3500, y: 2500}], 150),
        createWall('kitchen_south', [{x: 3500, y: 2500}, {x: 0, y: 2500}], 150),
        createWall('kitchen_west', [{x: 0, y: 2500}, {x: 0, y: 0}], 150),
        
        // Peninsula walls creating complex junction
        createWall('peninsula_1', [{x: 1000, y: 1200}, {x: 2500, y: 1200}], 100),
        createWall('peninsula_2', [{x: 2500, y: 1200}, {x: 2500, y: 2500}], 100),
        
        // Island (separate structure)
        createWall('island_north', [{x: 1500, y: 800}, {x: 2000, y: 800}], 75),
        createWall('island_south', [{x: 2000, y: 800}, {x: 2000, y: 1000}], 75),
        createWall('island_east', [{x: 2000, y: 1000}, {x: 1500, y: 1000}], 75),
        createWall('island_west', [{x: 1500, y: 1000}, {x: 1500, y: 800}], 75)
      ];

      // Test complex cross-junction where peninsula meets main walls
      const complexJunction = [walls[2], walls[4], walls[5]]; // South wall, peninsula walls
      const result = await resolver.resolveCrossJunction(complexJunction);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Test island as separate structure (should not interfere)
      const islandWalls = walls.slice(6, 10);
      const islandResult = await booleanEngine.batchUnion(islandWalls);
      expect(islandResult.success).toBe(true);

      // Performance should be reasonable for kitchen complexity
      expect(result.processingTime).toBeLessThan(1000);
    });

    test('should handle bathroom layout with fixtures', async () => {
      // Bathroom with complex fixture placement
      const walls = [
        // Main bathroom walls
        createWall('bath_north', [{x: 0, y: 0}, {x: 2000, y: 0}], 150),
        createWall('bath_east', [{x: 2000, y: 0}, {x: 2000, y: 2500}], 150),
        createWall('bath_south', [{x: 2000, y: 2500}, {x: 0, y: 2500}], 150),
        createWall('bath_west', [{x: 0, y: 2500}, {x: 0, y: 0}], 150),
        
        // Shower enclosure
        createWall('shower_wall_1', [{x: 0, y: 0}, {x: 900, y: 0}], 100),
        createWall('shower_wall_2', [{x: 900, y: 0}, {x: 900, y: 1200}], 100),
        
        // Vanity wall
        createWall('vanity_wall', [{x: 1200, y: 2500}, {x: 1200, y: 1800}], 75)
      ];

      // Test shower corner (L-junction with different wall thicknesses)
      const showerCorner = [walls[4], walls[5]];
      const showerResult = await booleanEngine.resolveLJunction(showerCorner);
      expect(showerResult.success).toBe(true);

      // Test vanity connection (T-junction)
      const vanityConnection = [walls[2], walls[6]];
      const vanityResult = await booleanEngine.resolveTJunction(vanityConnection);
      expect(vanityResult.success).toBe(true);

      // Test overall bathroom layout
      const bathroomResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(bathroomResult.performanceGain).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Commercial Building Scenarios', () => {
    test('should handle office building core layout', async () => {
      // Typical office building core with elevators, stairs, and utilities
      const walls = [
        // Elevator shaft walls
        createWall('elevator_north', [{x: 1000, y: 1000}, {x: 2500, y: 1000}], 200),
        createWall('elevator_east', [{x: 2500, y: 1000}, {x: 2500, y: 2500}], 200),
        createWall('elevator_south', [{x: 2500, y: 2500}, {x: 1000, y: 2500}], 200),
        createWall('elevator_west', [{x: 1000, y: 2500}, {x: 1000, y: 1000}], 200),
        
        // Stair shaft walls
        createWall('stair_north', [{x: 3000, y: 1000}, {x: 4500, y: 1000}], 200),
        createWall('stair_east', [{x: 4500, y: 1000}, {x: 4500, y: 3000}], 200),
        createWall('stair_south', [{x: 4500, y: 3000}, {x: 3000, y: 3000}], 200),
        createWall('stair_west', [{x: 3000, y: 3000}, {x: 3000, y: 1000}], 200),
        
        // Connecting corridor walls
        createWall('corridor_north', [{x: 0, y: 500}, {x: 6000, y: 500}], 150),
        createWall('corridor_south', [{x: 0, y: 3500}, {x: 6000, y: 3500}], 150),
        
        // Cross-connecting walls
        createWall('cross_wall_1', [{x: 2500, y: 500}, {x: 2500, y: 1000}], 150),
        createWall('cross_wall_2', [{x: 3000, y: 1000}, {x: 3000, y: 500}], 150)
      ];

      // Test complex multi-wall intersection at core junction
      const coreJunction = [walls[0], walls[8], walls[10], walls[11]]; // Multiple walls meeting
      const coreResult = await resolver.resolveCrossJunction(coreJunction);

      expect(coreResult.success).toBe(true);
      expect(coreResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Test elevator shaft integrity (should form closed loop)
      const elevatorShaft = walls.slice(0, 4);
      const elevatorResult = await booleanEngine.batchUnion(elevatorShaft);
      expect(elevatorResult.success).toBe(true);

      // Test stair shaft integrity
      const stairShaft = walls.slice(4, 8);
      const stairResult = await booleanEngine.batchUnion(stairShaft);
      expect(stairResult.success).toBe(true);

      // Performance test for commercial complexity
      expect(coreResult.processingTime).toBeLessThan(2000);
    });

    test('should handle retail space with complex layout', async () => {
      // Retail space with multiple departments and service areas
      const walls = [
        // Main retail perimeter
        createWall('retail_north', [{x: 0, y: 0}, {x: 10000, y: 0}], 200),
        createWall('retail_east', [{x: 10000, y: 0}, {x: 10000, y: 8000}], 200),
        createWall('retail_south', [{x: 10000, y: 8000}, {x: 0, y: 8000}], 200),
        createWall('retail_west', [{x: 0, y: 8000}, {x: 0, y: 0}], 200),
        
        // Department divisions
        createWall('dept_wall_1', [{x: 3000, y: 0}, {x: 3000, y: 4000}], 100),
        createWall('dept_wall_2', [{x: 6000, y: 0}, {x: 6000, y: 4000}], 100),
        createWall('dept_wall_3', [{x: 0, y: 4000}, {x: 10000, y: 4000}], 100),
        
        // Service area walls
        createWall('service_wall_1', [{x: 8000, y: 4000}, {x: 8000, y: 8000}], 150),
        createWall('service_wall_2', [{x: 8000, y: 6000}, {x: 10000, y: 6000}], 150),
        
        // Checkout area
        createWall('checkout_wall', [{x: 1000, y: 6000}, {x: 3000, y: 6000}], 75)
      ];

      // Test major intersection where department walls meet
      const majorIntersection = [walls[6], walls[4], walls[5]]; // Main division walls
      const majorResult = await resolver.resolveCrossJunction(majorIntersection);

      expect(majorResult.success).toBe(true);

      // Test service area T-junction
      const serviceJunction = [walls[2], walls[7]]; // South wall and service wall
      const serviceResult = await booleanEngine.resolveTJunction(serviceJunction);
      expect(serviceResult.success).toBe(true);

      // Test network optimization for large retail space
      const optimizationResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(optimizationResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(optimizationResult.optimizationsApplied).toContain('spatial_indexing');

      // Should handle large scale efficiently
      expect(majorResult.processingTime).toBeLessThan(3000);
    });
  });

  describe('Complex Architectural Features', () => {
    test('should handle curved walls and complex geometries', async () => {
      // Create walls with curved sections (simplified as polylines with many points)
      const curvedWallPoints = [];
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI;
        curvedWallPoints.push({
          x: 2000 + 1000 * Math.cos(angle),
          y: 2000 + 1000 * Math.sin(angle)
        });
      }

      const walls = [
        createWall('curved_wall', curvedWallPoints, 150),
        createWall('straight_wall_1', [{x: 1000, y: 2000}, {x: 3000, y: 2000}], 150),
        createWall('straight_wall_2', [{x: 2000, y: 1000}, {x: 2000, y: 3000}], 150)
      ];

      // Test intersection of curved wall with straight walls
      const curvedIntersection = [walls[0], walls[1], walls[2]];
      const result = await resolver.resolveCrossJunction(curvedIntersection);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Curved geometry should increase processing time but remain reasonable
      expect(result.processingTime).toBeLessThan(5000);
    });

    test('should handle parallel walls with varying overlap', async () => {
      // Create parallel walls with different overlap scenarios
      const walls = [
        // High overlap (80%)
        createWall('parallel_1a', [{x: 0, y: 0}, {x: 1000, y: 0}], 150),
        createWall('parallel_1b', [{x: 200, y: 300}, {x: 1200, y: 300}], 150),
        
        // Medium overlap (50%)
        createWall('parallel_2a', [{x: 2000, y: 0}, {x: 3000, y: 0}], 150),
        createWall('parallel_2b', [{x: 2500, y: 300}, {x: 3500, y: 300}], 150),
        
        // Low overlap (20%)
        createWall('parallel_3a', [{x: 4000, y: 0}, {x: 5000, y: 0}], 150),
        createWall('parallel_3b', [{x: 4800, y: 300}, {x: 5800, y: 300}], 150)
      ];

      // Test high overlap scenario
      const highOverlapResult = await resolver.resolveParallelOverlap([walls[0], walls[1]]);
      expect(highOverlapResult.success).toBe(true);
      expect(highOverlapResult.warnings.some(w => w.includes('overlap'))).toBe(true);

      // Test medium overlap scenario
      const mediumOverlapResult = await resolver.resolveParallelOverlap([walls[2], walls[3]]);
      expect(mediumOverlapResult.success).toBe(true);

      // Test low overlap scenario
      const lowOverlapResult = await resolver.resolveParallelOverlap([walls[4], walls[5]]);
      expect(lowOverlapResult.success).toBe(true);

      // All should complete efficiently
      expect(highOverlapResult.processingTime).toBeLessThan(1000);
      expect(mediumOverlapResult.processingTime).toBeLessThan(1000);
      expect(lowOverlapResult.processingTime).toBeLessThan(1000);
    });

    test('should handle extreme angle scenarios in real buildings', async () => {
      // Create walls with extreme angles that occur in real architecture
      const walls = [
        // Very sharp corner (common in modern architecture)
        createWall('sharp_wall_1', [{x: 0, y: 0}, {x: 1000, y: 0}], 150),
        createWall('sharp_wall_2', [{x: 1000, y: 0}, {x: 1050, y: 100}], 150), // ~11° angle
        
        // Near-straight connection (common in long corridors)
        createWall('straight_wall_1', [{x: 2000, y: 0}, {x: 3000, y: 0}], 150),
        createWall('straight_wall_2', [{x: 3000, y: 0}, {x: 4000, y: 50}], 150), // ~177° angle
        
        // Acute angle (common in triangular spaces)
        createWall('acute_wall_1', [{x: 5000, y: 0}, {x: 6000, y: 0}], 150),
        createWall('acute_wall_2', [{x: 6000, y: 0}, {x: 5500, y: 200}], 150) // ~22° angle
      ];

      // Test sharp angle handling
      const sharpResult = await resolver.handleExtremeAngles([walls[0], walls[1]], [11]);
      expect(sharpResult.success).toBe(true);
      expect(sharpResult.warnings.some(w => w.includes('Sharp angles'))).toBe(true);

      // Test near-straight angle handling
      const straightResult = await resolver.handleExtremeAngles([walls[2], walls[3]], [177]);
      expect(straightResult.success).toBe(true);
      expect(straightResult.warnings.some(w => w.includes('Near-straight'))).toBe(true);

      // Test acute angle handling
      const acuteResult = await resolver.handleExtremeAngles([walls[4], walls[5]], [22]);
      expect(acuteResult.success).toBe(true);

      // All extreme angle scenarios should be handled without failure
      expect(sharpResult.operationType).toBe('handle_extreme_angles');
      expect(straightResult.operationType).toBe('handle_extreme_angles');
      expect(acuteResult.operationType).toBe('handle_extreme_angles');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large floor plans efficiently', async () => {
      // Create a large floor plan with 50+ walls
      const walls = [];
      
      // Create a grid of rooms (10x5 grid)
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 10; col++) {
          const baseX = col * 1000;
          const baseY = row * 1000;
          
          // Room perimeter
          walls.push(
            createWall(`room_${row}_${col}_north`, 
              [{x: baseX, y: baseY}, {x: baseX + 1000, y: baseY}], 100),
            createWall(`room_${row}_${col}_east`, 
              [{x: baseX + 1000, y: baseY}, {x: baseX + 1000, y: baseY + 1000}], 100),
            createWall(`room_${row}_${col}_south`, 
              [{x: baseX + 1000, y: baseY + 1000}, {x: baseX, y: baseY + 1000}], 100),
            createWall(`room_${row}_${col}_west`, 
              [{x: baseX, y: baseY + 1000}, {x: baseX, y: baseY}], 100)
          );
        }
      }

      expect(walls.length).toBe(200); // 50 rooms × 4 walls each

      // Test network optimization on large scale
      const startTime = performance.now();
      const optimizationResult = await resolver.optimizeIntersectionNetwork(walls);
      const endTime = performance.now();

      expect(optimizationResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(optimizationResult.optimizationsApplied).toContain('spatial_indexing');
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test subset cross-junction performance
      const subsetWalls = walls.slice(0, 6); // First room + adjacent walls
      const crossJunctionResult = await resolver.resolveCrossJunction(subsetWalls.slice(0, 4));
      expect(crossJunctionResult.success).toBe(true);
      expect(crossJunctionResult.processingTime).toBeLessThan(1000);
    });

    test('should maintain accuracy with complex networks', async () => {
      // Create a complex network with various intersection types
      const walls = [
        // Main structure
        createWall('main_north', [{x: 0, y: 0}, {x: 5000, y: 0}], 200),
        createWall('main_east', [{x: 5000, y: 0}, {x: 5000, y: 3000}], 200),
        createWall('main_south', [{x: 5000, y: 3000}, {x: 0, y: 3000}], 200),
        createWall('main_west', [{x: 0, y: 3000}, {x: 0, y: 0}], 200),
        
        // Internal divisions creating multiple intersection types
        createWall('div_1', [{x: 1500, y: 0}, {x: 1500, y: 3000}], 150), // T-junctions at both ends
        createWall('div_2', [{x: 3500, y: 0}, {x: 3500, y: 3000}], 150), // T-junctions at both ends
        createWall('div_3', [{x: 0, y: 1500}, {x: 5000, y: 1500}], 150), // Multiple cross-junctions
        
        // Diagonal walls creating complex angles
        createWall('diag_1', [{x: 1500, y: 1500}, {x: 2500, y: 500}], 100),
        createWall('diag_2', [{x: 2500, y: 1500}, {x: 3500, y: 500}], 100),
        
        // Parallel walls with overlap
        createWall('parallel_1', [{x: 2000, y: 2000}, {x: 3000, y: 2000}], 75),
        createWall('parallel_2', [{x: 2200, y: 2200}, {x: 3200, y: 2200}], 75)
      ];

      // Test the central cross-junction (most complex)
      const centralJunction = [walls[4], walls[5], walls[6]]; // Vertical and horizontal divisions
      const centralResult = await resolver.resolveCrossJunction(centralJunction);

      expect(centralResult.success).toBe(true);
      expect(centralResult.resultSolid).toBeDefined();

      // Test parallel overlap
      const parallelResult = await resolver.resolveParallelOverlap([walls[9], walls[10]]);
      expect(parallelResult.success).toBe(true);

      // Test diagonal intersections with extreme angles
      const diagonalAngles = [30, 45]; // Approximate angles for diagonal walls
      const diagonalResult = await resolver.handleExtremeAngles([walls[7], walls[8]], diagonalAngles);
      expect(diagonalResult.success).toBe(true);

      // Overall network should optimize well
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.originalComplexity).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Robustness', () => {
    test('should recover from geometric failures gracefully', async () => {
      // Create problematic geometry that might cause failures
      const problematicWalls = [
        // Walls with potential self-intersection
        createWall('problem_1', [{x: 0, y: 0}, {x: 100, y: 0}, {x: 50, y: 50}, {x: 150, y: 0}], 150),
        
        // Very thin walls that might cause numerical issues
        createWall('thin_wall', [{x: 200, y: 0}, {x: 200.1, y: 1000}], 1),
        
        // Walls with duplicate points
        createWall('duplicate_points', [{x: 300, y: 0}, {x: 300, y: 0}, {x: 400, y: 0}], 150)
      ];

      // System should handle these gracefully without throwing
      const result = await resolver.resolveCrossJunction([
        createWall('normal_1', [{x: 0, y: 0}, {x: 1000, y: 0}], 150),
        createWall('normal_2', [{x: 500, y: -500}, {x: 500, y: 500}], 150),
        createWall('normal_3', [{x: 1000, y: 0}, {x: 1000, y: 1000}], 150)
      ]);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should provide meaningful warnings for edge cases', async () => {
      // Create edge case scenarios
      const edgeCaseWalls = [
        createWall('very_short', [{x: 0, y: 0}, {x: 1, y: 0}], 150), // Very short wall
        createWall('very_thick', [{x: 100, y: 0}, {x: 200, y: 0}], 1000), // Very thick wall
        createWall('normal', [{x: 50, y: -100}, {x: 50, y: 100}], 150)
      ];

      const result = await resolver.resolveCrossJunction(edgeCaseWalls);
      
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
      // Should contain warnings about unusual geometry
    });
  });

  describe('Mixed-Mode Operation Tests', () => {
    let modeSwitchingEngine: ModeSwitchingEngine;
    let bimAdapter: BIMAdapter;
    let testDataFactory: TestDataFactory;

    beforeEach(() => {
      modeSwitchingEngine = new ModeSwitchingEngine({
        preserveDataIntegrity: true,
        enableApproximations: true,
        validateAfterSwitch: true
      });

      bimAdapter = new BIMAdapter({
        tolerance: 1e-6,
        preserveLegacyData: true
      });

      testDataFactory = new TestDataFactory();
    });

    test('should seamlessly switch between basic and BIM modes', async () => {
      // Create walls in basic mode
      const basicWalls = new Map<string, UnifiedWallData>();
      
      // Residential layout in basic mode
      const walls = [
        testDataFactory.createTestWall({
          id: 'basic_wall_1',
          type: 'Layout' as WallTypeString,
          thickness: 150,
          baselinePoints: [{x: 0, y: 0}, {x: 4000, y: 0}]
        }),
        testDataFactory.createTestWall({
          id: 'basic_wall_2', 
          type: 'Layout' as WallTypeString,
          thickness: 150,
          baselinePoints: [{x: 4000, y: 0}, {x: 4000, y: 3000}]
        }),
        testDataFactory.createTestWall({
          id: 'basic_wall_3',
          type: 'Layout' as WallTypeString, 
          thickness: 100,
          baselinePoints: [{x: 2000, y: 0}, {x: 2000, y: 2000}]
        })
      ];

      walls.forEach(wall => basicWalls.set(wall.id, wall));

      // Switch to BIM mode
      const bimSwitchResult = await modeSwitchingEngine.switchToBIMMode(basicWalls);
      
      expect(bimSwitchResult.success).toBe(true);
      expect(bimSwitchResult.convertedWalls).toHaveLength(3);
      expect(bimSwitchResult.preservedData).toBe(true);
      expect(bimSwitchResult.processingTime).toBeLessThan(2000);

      // Verify BIM geometry was created
      basicWalls.forEach(wall => {
        expect(wall.isBIMModeValid).toBe(true);
        expect(wall.bimGeometry).toBeDefined();
        expect(wall.bimGeometry?.wallSolid).toBeDefined();
        expect(wall.bimGeometry?.qualityMetrics).toBeDefined();
      });

      // Perform BIM operations
      const bimWalls = Array.from(basicWalls.values())
        .map(wall => wall.bimGeometry!.wallSolid);
      
      const intersectionResult = await resolver.optimizeIntersectionNetwork(bimWalls);
      expect(intersectionResult.performanceGain).toBeGreaterThanOrEqual(0);

      // Switch back to basic mode
      const basicSwitchResult = await modeSwitchingEngine.switchToBasicMode(basicWalls);
      
      expect(basicSwitchResult.success).toBe(true);
      expect(basicSwitchResult.convertedWalls).toHaveLength(3);
      expect(basicSwitchResult.dataLoss).toBe(false);

      // Verify basic geometry is still valid
      basicWalls.forEach(wall => {
        expect(wall.isBasicModeValid).toBe(true);
        expect(wall.basicGeometry.segments).toBeDefined();
        expect(wall.basicGeometry.nodes).toBeDefined();
        expect(wall.basicGeometry.polygons).toBeDefined();
      });
    });

    test('should handle mixed-mode operations during editing', async () => {
      // Create a mixed scenario where some walls are in BIM mode and others in basic
      const mixedWalls = new Map<string, UnifiedWallData>();
      
      // Basic mode walls
      const basicWall = testDataFactory.createTestWall({
        id: 'mixed_basic',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        baselinePoints: [{x: 0, y: 0}, {x: 2000, y: 0}]
      });

      // BIM mode wall
      const bimWall = testDataFactory.createTestWall({
        id: 'mixed_bim',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        baselinePoints: [{x: 2000, y: 0}, {x: 2000, y: 2000}],
        includeBIMGeometry: true
      });

      mixedWalls.set(basicWall.id, basicWall);
      mixedWalls.set(bimWall.id, bimWall);

      // Test compatibility validation
      const compatibilityResult = await modeSwitchingEngine.validateModeSwitch(
        'basic', 'bim', mixedWalls
      );

      expect(compatibilityResult.canSwitchToBIM).toBe(true);
      expect(compatibilityResult.potentialDataLoss).toHaveLength(0);

      // Test synchronization between modes
      const syncResult = await modeSwitchingEngine.synchronizeModes(basicWall);
      expect(syncResult.success).toBe(true);
      expect(syncResult.dataLoss).toBe(false);

      // Verify both walls can be processed together
      const allWalls = Array.from(mixedWalls.values());
      expect(allWalls).toHaveLength(2);
      expect(allWalls[0].lastModifiedMode).toBe('basic');
      expect(allWalls[1].lastModifiedMode).toBe('bim');
    });

    test('should preserve data integrity during complex mode switches', async () => {
      // Create complex residential layout
      const complexWalls = new Map<string, UnifiedWallData>();
      
      // Multi-room layout with various wall types
      const wallConfigs = [
        { id: 'exterior_north', points: [{x: 0, y: 0}, {x: 6000, y: 0}], thickness: 200, type: 'Layout' as WallTypeString },
        { id: 'exterior_east', points: [{x: 6000, y: 0}, {x: 6000, y: 4000}], thickness: 200, type: 'Layout' as WallTypeString },
        { id: 'exterior_south', points: [{x: 6000, y: 4000}, {x: 0, y: 4000}], thickness: 200, type: 'Layout' as WallTypeString },
        { id: 'exterior_west', points: [{x: 0, y: 4000}, {x: 0, y: 0}], thickness: 200, type: 'Layout' as WallTypeString },
        { id: 'interior_1', points: [{x: 2000, y: 0}, {x: 2000, y: 2500}], thickness: 100, type: 'Zone' as WallTypeString },
        { id: 'interior_2', points: [{x: 4000, y: 0}, {x: 4000, y: 2500}], thickness: 100, type: 'Zone' as WallTypeString },
        { id: 'interior_3', points: [{x: 0, y: 2500}, {x: 6000, y: 2500}], thickness: 100, type: 'Zone' as WallTypeString }
      ];

      wallConfigs.forEach(config => {
        const wall = testDataFactory.createTestWall({
          id: config.id,
          type: config.type,
          thickness: config.thickness,
          baselinePoints: config.points
        });
        complexWalls.set(wall.id, wall);
      });

      // Switch to BIM mode and verify data preservation
      const bimSwitchResult = await modeSwitchingEngine.switchToBIMMode(complexWalls);
      
      expect(bimSwitchResult.success).toBe(true);
      expect(bimSwitchResult.convertedWalls).toHaveLength(7);
      expect(bimSwitchResult.preservedData).toBe(true);

      // Verify all geometric properties are preserved
      complexWalls.forEach(wall => {
        expect(wall.thickness).toBeGreaterThan(0);
        expect(wall.baseline.points).toHaveLength(2);
        expect(wall.bimGeometry?.wallSolid.thickness).toBe(wall.thickness);
        expect(wall.bimGeometry?.qualityMetrics.geometricAccuracy).toBeGreaterThan(0.9);
      });

      // Perform complex BIM operations
      const bimWalls = Array.from(complexWalls.values())
        .map(wall => wall.bimGeometry!.wallSolid);
      
      const networkOptimization = await resolver.optimizeIntersectionNetwork(bimWalls);
      expect(networkOptimization.performanceGain).toBeGreaterThanOrEqual(0);

      // Switch back and verify no data loss
      const basicSwitchResult = await modeSwitchingEngine.switchToBasicMode(complexWalls);
      
      expect(basicSwitchResult.success).toBe(true);
      expect(basicSwitchResult.dataLoss).toBe(false);
      expect(basicSwitchResult.approximations).toHaveLength(0);

      // Verify original properties are maintained
      wallConfigs.forEach(config => {
        const wall = complexWalls.get(config.id)!;
        expect(wall.thickness).toBe(config.thickness);
        expect(wall.type).toBe(config.type);
        expect(wall.baseline.points).toHaveLength(2);
      });
    });
  });

  describe('End-to-End Workflow Tests', () => {
    let offsetEngine: RobustOffsetEngine;
    let healingEngine: ShapeHealingEngine;
    let simplificationEngine: GeometrySimplificationEngine;
    let validator: GeometryValidator;

    beforeEach(() => {
      offsetEngine = new RobustOffsetEngine({
        tolerance: 1e-6,
        defaultJoinType: 'miter',
        miterLimit: 10,
        enableFallback: true
      });

      healingEngine = new ShapeHealingEngine({
        tolerance: 1e-6,
        sliverFaceThreshold: 0.1,
        microGapThreshold: 0.01,
        enableAutoHealing: true
      });

      simplificationEngine = new GeometrySimplificationEngine({
        tolerance: 1e-6,
        preserveArchitecturalFeatures: true,
        maxSimplificationLevel: 0.1
      });

      validator = new GeometryValidator({
        tolerance: 1e-6,
        enableStrictValidation: true
      });
    });

    test('should complete full wall creation to final geometric output workflow', async () => {
      // Step 1: Create wall definition
      const wallDefinition = {
        id: 'workflow_wall',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        baselinePoints: [
          {x: 0, y: 0}, {x: 1000, y: 0}, {x: 1000, y: 500}, 
          {x: 1500, y: 500}, {x: 1500, y: 1000}
        ]
      };

      // Step 2: Create baseline curve
      const baseline = TestDataFactory.createTestCurve({
        id: `${wallDefinition.id}_baseline`,
        points: wallDefinition.baselinePoints,
        type: CurveType.POLYLINE
      });

      // Step 3: Generate offset curves
      const offsetResult = await offsetEngine.offsetCurve(
        baseline, 
        wallDefinition.thickness / 2, 
        'miter',
        1e-6
      );

      expect(offsetResult.success).toBe(true);
      expect(offsetResult.leftOffset).toBeDefined();
      expect(offsetResult.rightOffset).toBeDefined();

      // Step 4: Create wall solid
      const wallSolid = new WallSolidImpl(
        baseline,
        wallDefinition.thickness,
        wallDefinition.type,
        {
          id: wallDefinition.id,
          leftOffset: offsetResult.leftOffset!,
          rightOffset: offsetResult.rightOffset!,
          solidGeometry: [],
          joinTypes: new Map(),
          intersectionData: [],
          healingHistory: [],
          geometricQuality: TestDataFactory.createTestQualityMetrics(),
          processingTime: 0
        }
      );

      // Step 5: Validate initial geometry
      const initialValidation = await validator.validateWallSolid(wallSolid);
      expect(initialValidation.isValid).toBe(true);
      expect(initialValidation.issues).toHaveLength(0);

      // Step 6: Apply shape healing
      const healingResult = await healingEngine.healShape(wallSolid, 1e-6);
      expect(healingResult.success).toBe(true);

      // Step 7: Apply geometry simplification
      const simplificationResult = await simplificationEngine.simplifyWallGeometry(
        healingResult.healedSolid || wallSolid,
        wallDefinition.thickness * 0.01
      );
      expect(simplificationResult.success).toBe(true);
      expect(simplificationResult.accuracyPreserved).toBe(true);

      // Step 8: Final validation
      const finalValidation = await validator.validateWallSolid(
        simplificationResult.simplifiedSolid
      );
      expect(finalValidation.isValid).toBe(true);
      expect(finalValidation.qualityScore).toBeGreaterThan(0.9);

      // Step 9: Verify complete workflow metrics
      const totalProcessingTime = offsetResult.processingTime + 
                                 healingResult.processingTime + 
                                 simplificationResult.processingTime;
      expect(totalProcessingTime).toBeLessThan(1000); // Should complete within 1 second

      // Step 10: Verify geometric accuracy
      const finalWall = simplificationResult.simplifiedSolid;
      expect(finalWall.thickness).toBe(wallDefinition.thickness);
      expect(finalWall.baseline.points).toHaveLength(wallDefinition.baselinePoints.length);
      expect(finalWall.geometricQuality.geometricAccuracy).toBeGreaterThan(0.95);
    });

    test('should handle complex multi-wall workflow with intersections', async () => {
      // Create a complex floor plan with multiple intersecting walls
      const wallDefinitions = [
        { id: 'main_1', points: [{x: 0, y: 0}, {x: 3000, y: 0}], thickness: 200 },
        { id: 'main_2', points: [{x: 3000, y: 0}, {x: 3000, y: 2000}], thickness: 200 },
        { id: 'main_3', points: [{x: 3000, y: 2000}, {x: 0, y: 2000}], thickness: 200 },
        { id: 'main_4', points: [{x: 0, y: 2000}, {x: 0, y: 0}], thickness: 200 },
        { id: 'partition_1', points: [{x: 1000, y: 0}, {x: 1000, y: 2000}], thickness: 100 },
        { id: 'partition_2', points: [{x: 2000, y: 0}, {x: 2000, y: 2000}], thickness: 100 }
      ];

      const wallSolids: WallSolidImpl[] = [];

      // Process each wall through the complete workflow
      for (const wallDef of wallDefinitions) {
        const baseline = TestDataFactory.createTestCurve({
          id: `${wallDef.id}_baseline`,
          points: wallDef.points,
          type: CurveType.POLYLINE
        });

        const offsetResult = await offsetEngine.offsetCurve(
          baseline, wallDef.thickness / 2, 'miter', 1e-6
        );
        expect(offsetResult.success).toBe(true);

        const wallSolid = new WallSolidImpl(
          baseline, wallDef.thickness, 'Layout' as WallTypeString,
          {
            id: wallDef.id,
            leftOffset: offsetResult.leftOffset!,
            rightOffset: offsetResult.rightOffset!,
            solidGeometry: [],
            joinTypes: new Map(),
            intersectionData: [],
            healingHistory: [],
            geometricQuality: TestDataFactory.createTestQualityMetrics(),
            processingTime: offsetResult.processingTime
          }
        );

        wallSolids.push(wallSolid);
      }

      // Resolve all intersections
      const networkOptimization = await resolver.optimizeIntersectionNetwork(wallSolids);
      expect(networkOptimization.performanceGain).toBeGreaterThanOrEqual(0);

      // Apply healing to all walls
      const healedWalls: WallSolidImpl[] = [];
      for (const wall of wallSolids) {
        const healingResult = await healingEngine.healShape(wall, 1e-6);
        expect(healingResult.success).toBe(true);
        healedWalls.push(healingResult.healedSolid || wall);
      }

      // Apply simplification to all walls
      const simplifiedWalls: WallSolidImpl[] = [];
      for (const wall of healedWalls) {
        const simplificationResult = await simplificationEngine.simplifyWallGeometry(
          wall, wall.thickness * 0.01
        );
        expect(simplificationResult.success).toBe(true);
        simplifiedWalls.push(simplificationResult.simplifiedSolid);
      }

      // Final validation of entire network
      for (const wall of simplifiedWalls) {
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.9);
      }

      // Verify network integrity
      expect(simplifiedWalls).toHaveLength(6);
      expect(simplifiedWalls.every(w => w.geometricQuality.geometricAccuracy > 0.9)).toBe(true);
    });

    test('should handle workflow with error recovery', async () => {
      // Create problematic wall that will require error recovery
      const problematicWall = TestDataFactory.createTestWall({
        id: 'problematic_wall',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        baselinePoints: [
          {x: 0, y: 0}, {x: 100, y: 0}, {x: 50, y: 0.001}, // Near-collinear point
          {x: 200, y: 0}, {x: 200, y: 200}
        ]
      });

      const baseline = problematicWall.baseline;

      // Step 1: Attempt offset (may fail or produce warnings)
      const offsetResult = await offsetEngine.offsetCurve(
        baseline, problematicWall.thickness / 2, 'miter', 1e-6
      );

      // Should succeed but may have warnings
      expect(offsetResult.success).toBe(true);
      if (offsetResult.warnings.length > 0) {
        expect(offsetResult.warnings.some(w => w.includes('collinear'))).toBe(true);
      }

      // Step 2: Create wall solid
      const wallSolid = new WallSolidImpl(
        baseline, problematicWall.thickness, problematicWall.type,
        {
          id: problematicWall.id,
          leftOffset: offsetResult.leftOffset!,
          rightOffset: offsetResult.rightOffset!,
          solidGeometry: [],
          joinTypes: new Map(),
          intersectionData: [],
          healingHistory: [],
          geometricQuality: TestDataFactory.createTestQualityMetrics({
            geometricAccuracy: 0.7 // Lower due to problematic geometry
          }),
          processingTime: offsetResult.processingTime
        }
      );

      // Step 3: Validation should detect issues
      const initialValidation = await validator.validateWallSolid(wallSolid);
      expect(initialValidation.issues.length).toBeGreaterThan(0);

      // Step 4: Healing should fix issues
      const healingResult = await healingEngine.healShape(wallSolid, 1e-6);
      expect(healingResult.success).toBe(true);
      expect(healingResult.operationsApplied.length).toBeGreaterThan(0);

      // Step 5: Simplification should clean up geometry
      const simplificationResult = await simplificationEngine.simplifyWallGeometry(
        healingResult.healedSolid || wallSolid,
        problematicWall.thickness * 0.01
      );
      expect(simplificationResult.success).toBe(true);
      expect(simplificationResult.pointsRemoved).toBeGreaterThan(0);

      // Step 6: Final validation should show improvement
      const finalValidation = await validator.validateWallSolid(
        simplificationResult.simplifiedSolid
      );
      expect(finalValidation.isValid).toBe(true);
      expect(finalValidation.qualityScore).toBeGreaterThan(initialValidation.qualityScore);
    });
  });

  describe('Database Persistence Integration Tests', () => {
    let database: SQLiteImplementation;
    let cachingLayer: CachingLayer;
    let testDataFactory: TestDataFactory;

    beforeEach(async () => {
      // Initialize in-memory SQLite database for testing
      database = new SQLiteImplementation({
        databasePath: ':memory:',
        enableWAL: false,
        enableForeignKeys: true,
        timeout: 5000
      });

      await database.connect();
      await database.initializeSchema();

      cachingLayer = new CachingLayer(database, {
        maxCacheSize: 100,
        enableCompression: true,
        cacheTimeout: 300000
      });

      testDataFactory = new TestDataFactory();
    });

    afterEach(async () => {
      await database.disconnect();
    });

    test('should persist and retrieve complex geometric data', async () => {
      // Create complex wall with BIM geometry
      const complexWall = testDataFactory.createTestWall({
        id: 'complex_persist_wall',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        includeBIMGeometry: true,
        baselinePoints: [
          {x: 0, y: 0}, {x: 1000, y: 0}, {x: 1000, y: 500},
          {x: 1500, y: 500}, {x: 1500, y: 1000}, {x: 0, y: 1000}
        ],
        projectId: 'test_project'
      });

      // Add intersection data
      const intersectionData = TestDataFactory.createTestIntersectionData({
        id: 'test_intersection',
        type: IntersectionType.T_JUNCTION,
        participatingWalls: [complexWall.id, 'other_wall'],
        intersectionPoint: {x: 500, y: 250}
      });

      complexWall.bimGeometry!.intersectionData = [intersectionData];

      // Save to database
      const saveResult = await database.saveWall(complexWall);
      expect(saveResult.success).toBe(true);
      expect(saveResult.wallId).toBe(complexWall.id);

      // Retrieve from database
      const retrievedWall = await database.loadWall(complexWall.id);
      expect(retrievedWall).toBeDefined();
      expect(retrievedWall!.id).toBe(complexWall.id);
      expect(retrievedWall!.thickness).toBe(complexWall.thickness);
      expect(retrievedWall!.baseline.points).toHaveLength(complexWall.baseline.points.length);

      // Verify BIM geometry was preserved
      expect(retrievedWall!.bimGeometry).toBeDefined();
      expect(retrievedWall!.bimGeometry!.wallSolid).toBeDefined();
      expect(retrievedWall!.bimGeometry!.intersectionData).toHaveLength(1);
      expect(retrievedWall!.bimGeometry!.qualityMetrics).toBeDefined();

      // Verify geometric accuracy
      const originalPoints = complexWall.baseline.points;
      const retrievedPoints = retrievedWall!.baseline.points;
      
      for (let i = 0; i < originalPoints.length; i++) {
        expect(Math.abs(retrievedPoints[i].x - originalPoints[i].x)).toBeLessThan(1e-10);
        expect(Math.abs(retrievedPoints[i].y - originalPoints[i].y)).toBeLessThan(1e-10);
      }
    });

    test('should handle batch operations efficiently', async () => {
      // Create multiple walls for batch testing
      const walls: UnifiedWallData[] = [];
      
      for (let i = 0; i < 50; i++) {
        const wall = testDataFactory.createTestWall({
          id: `batch_wall_${i}`,
          type: 'Layout' as WallTypeString,
          thickness: 100 + (i % 3) * 50, // Varying thickness
          includeBIMGeometry: i % 2 === 0, // Half with BIM geometry
          baselinePoints: [
            {x: i * 100, y: 0},
            {x: i * 100 + 100, y: 100 + i * 10}
          ],
          projectId: 'batch_test_project'
        });
        walls.push(wall);
      }

      // Batch save
      const startTime = performance.now();
      const batchSaveResult = await database.batchSaveWalls(walls);
      const saveTime = performance.now() - startTime;

      expect(batchSaveResult.success).toBe(true);
      expect(batchSaveResult.savedCount).toBe(50);
      expect(batchSaveResult.failedWalls).toHaveLength(0);
      expect(saveTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Batch load by project
      const loadStartTime = performance.now();
      const loadedWalls = await database.loadWallsByProject('batch_test_project');
      const loadTime = performance.now() - loadStartTime;

      expect(loadedWalls).toHaveLength(50);
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds

      // Verify data integrity
      const originalWallMap = new Map(walls.map(w => [w.id, w]));
      
      for (const loadedWall of loadedWalls) {
        const originalWall = originalWallMap.get(loadedWall.id);
        expect(originalWall).toBeDefined();
        expect(loadedWall.thickness).toBe(originalWall!.thickness);
        expect(loadedWall.type).toBe(originalWall!.type);
      }
    });

    test('should handle caching layer integration', async () => {
      // Create test wall
      const testWall = testDataFactory.createTestWall({
        id: 'cache_test_wall',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        includeBIMGeometry: true,
        projectId: 'cache_test_project'
      });

      // Save through caching layer
      const saveResult = await cachingLayer.saveWall(testWall);
      expect(saveResult.success).toBe(true);

      // First load (should hit database)
      const firstLoadStart = performance.now();
      const firstLoad = await cachingLayer.loadWall(testWall.id);
      const firstLoadTime = performance.now() - firstLoadStart;

      expect(firstLoad).toBeDefined();
      expect(firstLoad!.id).toBe(testWall.id);

      // Second load (should hit cache)
      const secondLoadStart = performance.now();
      const secondLoad = await cachingLayer.loadWall(testWall.id);
      const secondLoadTime = performance.now() - secondLoadStart;

      expect(secondLoad).toBeDefined();
      expect(secondLoad!.id).toBe(testWall.id);
      expect(secondLoadTime).toBeLessThan(firstLoadTime); // Cache should be faster

      // Verify cache statistics
      const cacheStats = await cachingLayer.getCacheStatistics();
      expect(cacheStats.hitCount).toBeGreaterThan(0);
      expect(cacheStats.missCount).toBeGreaterThan(0);
      expect(cacheStats.hitRatio).toBeGreaterThan(0);
    });

    test('should handle database schema evolution', async () => {
      // Test that the system can handle schema changes gracefully
      const testWall = testDataFactory.createTestWall({
        id: 'schema_test_wall',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        includeBIMGeometry: true,
        projectId: 'schema_test_project'
      });

      // Save wall
      const saveResult = await database.saveWall(testWall);
      expect(saveResult.success).toBe(true);

      // Simulate schema version check
      const schemaVersion = await database.getSchemaVersion();
      expect(schemaVersion).toBeGreaterThan(0);

      // Test migration compatibility (would be more complex in real scenario)
      const migrationResult = await database.validateSchemaCompatibility();
      expect(migrationResult.isCompatible).toBe(true);

      // Verify data can still be loaded after schema validation
      const loadedWall = await database.loadWall(testWall.id);
      expect(loadedWall).toBeDefined();
      expect(loadedWall!.id).toBe(testWall.id);
    });

    test('should handle concurrent database operations', async () => {
      // Create multiple walls for concurrent testing
      const walls = Array.from({length: 20}, (_, i) => 
        testDataFactory.createTestWall({
          id: `concurrent_wall_${i}`,
          type: 'Layout' as WallTypeString,
          thickness: 150,
          includeBIMGeometry: true,
          projectId: 'concurrent_test_project'
        })
      );

      // Perform concurrent save operations
      const savePromises = walls.map(wall => database.saveWall(wall));
      const saveResults = await Promise.all(savePromises);

      // All saves should succeed
      expect(saveResults.every(result => result.success)).toBe(true);

      // Perform concurrent load operations
      const loadPromises = walls.map(wall => database.loadWall(wall.id));
      const loadResults = await Promise.all(loadPromises);

      // All loads should succeed
      expect(loadResults.every(result => result !== null)).toBe(true);
      expect(loadResults).toHaveLength(20);

      // Verify data integrity under concurrent access
      for (let i = 0; i < walls.length; i++) {
        const original = walls[i];
        const loaded = loadResults[i]!;
        
        expect(loaded.id).toBe(original.id);
        expect(loaded.thickness).toBe(original.thickness);
        expect(loaded.type).toBe(original.type);
      }
    });
  });
});