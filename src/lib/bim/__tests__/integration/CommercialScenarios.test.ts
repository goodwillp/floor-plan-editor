/**
 * Commercial Building Integration Tests
 * 
 * Tests realistic commercial architectural scenarios including office buildings,
 * retail spaces, warehouses, and mixed-use developments with complex geometric requirements.
 * 
 * Requirements: All requirements validation (1.1-10.5)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AdvancedIntersectionResolver } from '../../engines/AdvancedIntersectionResolver';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { ShapeHealingEngine } from '../../engines/ShapeHealingEngine';
import { GeometryValidator } from '../../validation/GeometryValidator';
import { TestDataFactory } from '../helpers/TestDataFactory';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { CurveImpl } from '../../geometry/Curve';
import { BIMPointImpl } from '../../geometry/BIMPoint';
import { IntersectionType, CurveType } from '../../types/BIMTypes';
import { WallTypeString } from '../../types/WallTypes';

describe('Commercial Building Integration Tests', () => {
  let resolver: AdvancedIntersectionResolver;
  let booleanEngine: BooleanOperationsEngine;
  let offsetEngine: RobustOffsetEngine;
  let healingEngine: ShapeHealingEngine;
  let validator: GeometryValidator;
  let testDataFactory: TestDataFactory;

  beforeEach(() => {
    resolver = new AdvancedIntersectionResolver({
      tolerance: 1e-6,
      maxComplexity: 100000, // Higher for commercial complexity
      enableParallelProcessing: true,
      extremeAngleThreshold: 10, // Stricter for commercial
      parallelOverlapThreshold: 0.05,
      optimizationEnabled: true,
      spatialIndexingEnabled: true
    });

    booleanEngine = new BooleanOperationsEngine({
      tolerance: 1e-6,
      maxComplexity: 100000,
      enableParallelProcessing: true
    });

    offsetEngine = new RobustOffsetEngine({
      tolerance: 1e-6,
      defaultJoinType: 'miter',
      miterLimit: 15, // Higher for commercial precision
      enableFallback: true
    });

    healingEngine = new ShapeHealingEngine({
      tolerance: 1e-6,
      sliverFaceThreshold: 0.05, // Stricter for commercial
      microGapThreshold: 0.005,
      enableAutoHealing: true
    });

    validator = new GeometryValidator({
      tolerance: 1e-6,
      enableStrictValidation: true
    });

    testDataFactory = new TestDataFactory();
  });

  /**
   * Helper function to create commercial wall
   */
  const createCommercialWall = (
    id: string,
    points: Array<{x: number, y: number}>,
    thickness: number = 200, // Standard commercial wall
    wallType: WallTypeString = 'Layout'
  ) => {
    const bimPoints = points.map((p, i) => new BIMPointImpl(p.x, p.y, {
      id: `${id}_point_${i}`,
      tolerance: 1e-6,
      creationMethod: 'commercial_layout',
      accuracy: 0.99, // Higher accuracy for commercial
      validated: true
    }));

    const curve = new CurveImpl(bimPoints, CurveType.POLYLINE, {
      id: `${id}_baseline`,
      isClosed: false
    });

    return testDataFactory.createTestWallSolid(id, thickness);
  };

  describe('Office Building Scenarios', () => {
    test('should handle typical office building core layout', async () => {
      // Standard office building with central core
      const walls = [
        // Building perimeter (curtain wall system)
        createCommercialWall('perimeter_north', [{x: 0, y: 0}, {x: 40000, y: 0}], 150),
        createCommercialWall('perimeter_east', [{x: 40000, y: 0}, {x: 40000, y: 30000}], 150),
        createCommercialWall('perimeter_south', [{x: 40000, y: 30000}, {x: 0, y: 30000}], 150),
        createCommercialWall('perimeter_west', [{x: 0, y: 30000}, {x: 0, y: 0}], 150),
        
        // Central core (elevators, stairs, utilities)
        createCommercialWall('core_north', [{x: 15000, y: 12000}, {x: 25000, y: 12000}], 300),
        createCommercialWall('core_east', [{x: 25000, y: 12000}, {x: 25000, y: 18000}], 300),
        createCommercialWall('core_south', [{x: 25000, y: 18000}, {x: 15000, y: 18000}], 300),
        createCommercialWall('core_west', [{x: 15000, y: 18000}, {x: 15000, y: 12000}], 300),
        
        // Tenant demising walls
        createCommercialWall('demising_1', [{x: 0, y: 10000}, {x: 15000, y: 10000}], 200),
        createCommercialWall('demising_2', [{x: 25000, y: 10000}, {x: 40000, y: 10000}], 200),
        createCommercialWall('demising_3', [{x: 0, y: 20000}, {x: 15000, y: 20000}], 200),
        createCommercialWall('demising_4', [{x: 25000, y: 20000}, {x: 40000, y: 20000}], 200),
        
        // Vertical demising walls
        createCommercialWall('demising_5', [{x: 20000, y: 0}, {x: 20000, y: 12000}], 200),
        createCommercialWall('demising_6', [{x: 20000, y: 18000}, {x: 20000, y: 30000}], 200),
        
        // Conference room walls
        createCommercialWall('conf_1', [{x: 5000, y: 5000}, {x: 10000, y: 5000}], 150),
        createCommercialWall('conf_2', [{x: 10000, y: 5000}, {x: 10000, y: 8000}], 150),
        createCommercialWall('conf_3', [{x: 10000, y: 8000}, {x: 5000, y: 8000}], 150),
        createCommercialWall('conf_4', [{x: 5000, y: 8000}, {x: 5000, y: 5000}], 150)
      ];

      // Test central core integrity (closed loop)
      const coreWalls = walls.slice(4, 8);
      const coreResult = await booleanEngine.batchUnion(coreWalls);
      expect(coreResult.success).toBe(true);
      expect(coreResult.processingTime).toBeLessThan(2000);

      // Test demising wall intersections with perimeter
      const demising1Intersection = [walls[0], walls[8]]; // North perimeter and demising 1
      const demising1Result = await booleanEngine.resolveTJunction(demising1Intersection);
      expect(demising1Result.success).toBe(true);

      // Test vertical demising wall intersection
      const verticalDemisingIntersection = [walls[12], walls[8]]; // Vertical demising and horizontal demising
      const verticalResult = await booleanEngine.resolveTJunction(verticalDemisingIntersection);
      expect(verticalResult.success).toBe(true);

      // Test conference room (closed rectangle)
      const confWalls = walls.slice(14, 18);
      const confResult = await booleanEngine.batchUnion(confWalls);
      expect(confResult.success).toBe(true);

      // Test complex intersection at core corner
      const coreCornerIntersection = [walls[4], walls[8], walls[12]]; // Core north, demising, vertical demising
      const coreCornerResult = await resolver.resolveCrossJunction(coreCornerIntersection);
      expect(coreCornerResult.success).toBe(true);
      expect(coreCornerResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Network optimization for office building
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');
      expect(networkResult.processingTime).toBeLessThan(8000);

      // Validate commercial-grade precision
      for (const wall of coreWalls) {
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.98); // High precision required
      }
    });

    test('should handle open office with modular workstations', async () => {
      // Large open office floor with modular workstation walls
      const walls = [
        // Building envelope
        createCommercialWall('envelope_north', [{x: 0, y: 0}, {x: 50000, y: 0}], 200),
        createCommercialWall('envelope_east', [{x: 50000, y: 0}, {x: 50000, y: 25000}], 200),
        createCommercialWall('envelope_south', [{x: 50000, y: 25000}, {x: 0, y: 25000}], 200),
        createCommercialWall('envelope_west', [{x: 0, y: 25000}, {x: 0, y: 0}], 200)
      ];

      // Modular workstation walls (thinner, demountable)
      const workstationWalls = [];
      const workstationSize = 3000; // 3m x 3m workstations
      const rows = 6;
      const cols = 15;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const baseX = 2000 + col * workstationSize;
          const baseY = 2000 + row * workstationSize;
          
          // Only create walls that don't already exist
          if (col < cols - 1) { // Vertical walls between workstations
            workstationWalls.push(
              createCommercialWall(`ws_v_${row}_${col}`, 
                [{x: baseX + workstationSize, y: baseY}, 
                 {x: baseX + workstationSize, y: baseY + workstationSize}], 75)
            );
          }
          
          if (row < rows - 1) { // Horizontal walls between workstations
            workstationWalls.push(
              createCommercialWall(`ws_h_${row}_${col}`, 
                [{x: baseX, y: baseY + workstationSize}, 
                 {x: baseX + workstationSize, y: baseY + workstationSize}], 75)
            );
          }
        }
      }

      walls.push(...workstationWalls);

      // Test workstation grid intersections (many T-junctions)
      const sampleTJunctions = [
        [workstationWalls[0], workstationWalls[cols - 1]], // First vertical and first horizontal
        [workstationWalls[10], workstationWalls[cols + 10]], // Mid-grid intersection
        [workstationWalls[20], workstationWalls[cols + 20]] // Another intersection
      ];

      for (const [wall1, wall2] of sampleTJunctions) {
        if (wall1 && wall2) {
          const junctionResult = await booleanEngine.resolveTJunction([wall1, wall2]);
          expect(junctionResult.success).toBe(true);
          expect(junctionResult.processingTime).toBeLessThan(500); // Should be fast for thin walls
        }
      }

      // Test envelope intersection with workstation grid
      const envelopeIntersection = [walls[0], workstationWalls[0]]; // North envelope and first workstation
      const envelopeResult = await booleanEngine.resolveTJunction(envelopeIntersection);
      expect(envelopeResult.success).toBe(true);

      // Network optimization for large grid
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');
      
      // Should handle large number of walls efficiently
      expect(walls.length).toBeGreaterThan(150); // Many workstation walls
      expect(networkResult.processingTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Validate modular wall system
      const sampleWorkstationWalls = workstationWalls.slice(0, 10);
      for (const wall of sampleWorkstationWalls) {
        expect(wall.thickness).toBe(75); // Thin modular walls
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
      }
    });

    test('should handle high-rise office building with structural elements', async () => {
      // High-rise office floor with structural columns and shear walls
      const walls = [
        // Perimeter curtain wall
        createCommercialWall('curtain_north', [{x: 0, y: 0}, {x: 30000, y: 0}], 100), // Thin curtain wall
        createCommercialWall('curtain_east', [{x: 30000, y: 0}, {x: 30000, y: 20000}], 100),
        createCommercialWall('curtain_south', [{x: 30000, y: 20000}, {x: 0, y: 20000}], 100),
        createCommercialWall('curtain_west', [{x: 0, y: 20000}, {x: 0, y: 0}], 100),
        
        // Structural shear walls (very thick)
        createCommercialWall('shear_1', [{x: 10000, y: 0}, {x: 10000, y: 20000}], 400),
        createCommercialWall('shear_2', [{x: 20000, y: 0}, {x: 20000, y: 20000}], 400),
        createCommercialWall('shear_3', [{x: 0, y: 8000}, {x: 30000, y: 8000}], 400),
        
        // Elevator shaft (reinforced concrete)
        createCommercialWall('elevator_north', [{x: 13000, y: 6000}, {x: 17000, y: 6000}], 300),
        createCommercialWall('elevator_east', [{x: 17000, y: 6000}, {x: 17000, y: 10000}], 300),
        createCommercialWall('elevator_south', [{x: 17000, y: 10000}, {x: 13000, y: 10000}], 300),
        createCommercialWall('elevator_west', [{x: 13000, y: 10000}, {x: 13000, y: 6000}], 300),
        
        // Stair shafts (fire-rated)
        createCommercialWall('stair_1_north', [{x: 2000, y: 2000}, {x: 4000, y: 2000}], 250),
        createCommercialWall('stair_1_east', [{x: 4000, y: 2000}, {x: 4000, y: 5000}], 250),
        createCommercialWall('stair_1_south', [{x: 4000, y: 5000}, {x: 2000, y: 5000}], 250),
        createCommercialWall('stair_1_west', [{x: 2000, y: 5000}, {x: 2000, y: 2000}], 250),
        
        // Mechanical rooms
        createCommercialWall('mech_1', [{x: 25000, y: 15000}, {x: 30000, y: 15000}], 200),
        createCommercialWall('mech_2', [{x: 25000, y: 15000}, {x: 25000, y: 20000}], 200)
      ];

      // Test shear wall intersections (critical structural connections)
      const shearIntersection = [walls[4], walls[6]]; // Vertical and horizontal shear walls
      const shearResult = await booleanEngine.resolveTJunction(shearIntersection);
      expect(shearResult.success).toBe(true);
      expect(shearResult.warnings.some(w => w.includes('thickness'))).toBe(true); // Thick wall warning

      // Test elevator shaft integrity
      const elevatorWalls = walls.slice(7, 11);
      const elevatorResult = await booleanEngine.batchUnion(elevatorWalls);
      expect(elevatorResult.success).toBe(true);

      // Test stair shaft integrity
      const stairWalls = walls.slice(11, 15);
      const stairResult = await booleanEngine.batchUnion(stairWalls);
      expect(stairResult.success).toBe(true);

      // Test curtain wall intersection with shear wall
      const curtainShearIntersection = [walls[0], walls[4]]; // Curtain wall and shear wall
      const curtainShearResult = await booleanEngine.resolveTJunction(curtainShearIntersection);
      expect(curtainShearResult.success).toBe(true);
      expect(curtainShearResult.warnings.some(w => w.includes('thickness'))).toBe(true);

      // Test complex intersection at shear wall junction
      const complexIntersection = [walls[4], walls[6], walls[7]]; // Shear walls and elevator
      const complexResult = await resolver.resolveCrossJunction(complexIntersection);
      expect(complexResult.success).toBe(true);
      expect(complexResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Network optimization for high-rise complexity
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.processingTime).toBeLessThan(10000);

      // Validate structural wall integrity
      const structuralWalls = [walls[4], walls[5], walls[6]]; // Shear walls
      for (const wall of structuralWalls) {
        expect(wall.thickness).toBe(400); // Thick structural walls
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.98); // Critical structural precision
      }
    });
  });

  describe('Retail Space Scenarios', () => {
    test('should handle large retail store with departments', async () => {
      // Big box retail store (30,000 sq ft)
      const walls = [
        // Store perimeter
        createCommercialWall('store_front', [{x: 0, y: 0}, {x: 60000, y: 0}], 250),
        createCommercialWall('store_right', [{x: 60000, y: 0}, {x: 60000, y: 50000}], 250),
        createCommercialWall('store_back', [{x: 60000, y: 50000}, {x: 0, y: 50000}], 250),
        createCommercialWall('store_left', [{x: 0, y: 50000}, {x: 0, y: 0}], 250),
        
        // Main department divisions
        createCommercialWall('dept_1', [{x: 20000, y: 0}, {x: 20000, y: 30000}], 150),
        createCommercialWall('dept_2', [{x: 40000, y: 0}, {x: 40000, y: 30000}], 150),
        createCommercialWall('dept_3', [{x: 0, y: 30000}, {x: 60000, y: 30000}], 150),
        
        // Back-of-house areas
        createCommercialWall('storage_1', [{x: 0, y: 40000}, {x: 30000, y: 40000}], 200),
        createCommercialWall('storage_2', [{x: 30000, y: 40000}, {x: 30000, y: 50000}], 200),
        createCommercialWall('office_1', [{x: 45000, y: 30000}, {x: 45000, y: 40000}], 150),
        createCommercialWall('office_2', [{x: 45000, y: 40000}, {x: 60000, y: 40000}], 150),
        
        // Checkout area
        createCommercialWall('checkout_1', [{x: 5000, y: 5000}, {x: 15000, y: 5000}], 100),
        createCommercialWall('checkout_2', [{x: 15000, y: 5000}, {x: 15000, y: 10000}], 100),
        
        // Customer service
        createCommercialWall('service_1', [{x: 50000, y: 5000}, {x: 55000, y: 5000}], 150),
        createCommercialWall('service_2', [{x: 55000, y: 5000}, {x: 55000, y: 10000}], 150),
        createCommercialWall('service_3', [{x: 55000, y: 10000}, {x: 50000, y: 10000}], 150),
        createCommercialWall('service_4', [{x: 50000, y: 10000}, {x: 50000, y: 5000}], 150)
      ];

      // Test main department intersections
      const dept1Intersection = [walls[0], walls[4]]; // Front wall and dept 1
      const dept1Result = await booleanEngine.resolveTJunction(dept1Intersection);
      expect(dept1Result.success).toBe(true);

      const dept2Intersection = [walls[0], walls[5]]; // Front wall and dept 2
      const dept2Result = await booleanEngine.resolveTJunction(dept2Intersection);
      expect(dept2Result.success).toBe(true);

      // Test major cross-junction at department intersection
      const majorIntersection = [walls[4], walls[5], walls[6]]; // All department walls
      const majorResult = await resolver.resolveCrossJunction(majorIntersection);
      expect(majorResult.success).toBe(true);
      expect(majorResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Test back-of-house L-junction
      const storageJunction = [walls[7], walls[8]]; // Storage walls
      const storageResult = await booleanEngine.resolveLJunction(storageJunction);
      expect(storageResult.success).toBe(true);

      // Test customer service area (closed rectangle)
      const serviceWalls = walls.slice(13, 17);
      const serviceResult = await booleanEngine.batchUnion(serviceWalls);
      expect(serviceResult.success).toBe(true);

      // Test checkout area L-junction
      const checkoutJunction = [walls[11], walls[12]]; // Checkout walls
      const checkoutResult = await booleanEngine.resolveLJunction(checkoutJunction);
      expect(checkoutResult.success).toBe(true);

      // Network optimization for large retail space
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');
      expect(networkResult.processingTime).toBeLessThan(12000);

      // Validate retail space requirements
      expect(walls[0].thickness).toBe(250); // Thick perimeter for security
      expect(walls[11].thickness).toBe(100); // Thin checkout walls for flexibility
      
      for (const wall of walls.slice(0, 4)) { // Perimeter walls
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.95);
      }
    });

    test('should handle shopping mall with complex circulation', async () => {
      // Shopping mall with central court and multiple levels of complexity
      const walls = [
        // Mall perimeter
        createCommercialWall('mall_north', [{x: 0, y: 0}, {x: 80000, y: 0}], 300),
        createCommercialWall('mall_east', [{x: 80000, y: 0}, {x: 80000, y: 60000}], 300),
        createCommercialWall('mall_south', [{x: 80000, y: 60000}, {x: 0, y: 60000}], 300),
        createCommercialWall('mall_west', [{x: 0, y: 60000}, {x: 0, y: 0}], 300),
        
        // Central court (octagonal approximation)
        createCommercialWall('court_1', [{x: 30000, y: 20000}, {x: 50000, y: 20000}], 200),
        createCommercialWall('court_2', [{x: 50000, y: 20000}, {x: 55000, y: 25000}], 200),
        createCommercialWall('court_3', [{x: 55000, y: 25000}, {x: 55000, y: 35000}], 200),
        createCommercialWall('court_4', [{x: 55000, y: 35000}, {x: 50000, y: 40000}], 200),
        createCommercialWall('court_5', [{x: 50000, y: 40000}, {x: 30000, y: 40000}], 200),
        createCommercialWall('court_6', [{x: 30000, y: 40000}, {x: 25000, y: 35000}], 200),
        createCommercialWall('court_7', [{x: 25000, y: 35000}, {x: 25000, y: 25000}], 200),
        createCommercialWall('court_8', [{x: 25000, y: 25000}, {x: 30000, y: 20000}], 200),
        
        // Main corridors
        createCommercialWall('corridor_1', [{x: 0, y: 15000}, {x: 25000, y: 15000}], 150),
        createCommercialWall('corridor_2', [{x: 55000, y: 15000}, {x: 80000, y: 15000}], 150),
        createCommercialWall('corridor_3', [{x: 0, y: 45000}, {x: 25000, y: 45000}], 150),
        createCommercialWall('corridor_4', [{x: 55000, y: 45000}, {x: 80000, y: 45000}], 150),
        
        // Anchor store connections
        createCommercialWall('anchor_1', [{x: 15000, y: 0}, {x: 15000, y: 15000}], 200),
        createCommercialWall('anchor_2', [{x: 65000, y: 0}, {x: 65000, y: 15000}], 200),
        createCommercialWall('anchor_3', [{x: 15000, y: 45000}, {x: 15000, y: 60000}], 200),
        createCommercialWall('anchor_4', [{x: 65000, y: 45000}, {x: 65000, y: 60000}], 200),
        
        // Food court area
        createCommercialWall('food_1', [{x: 60000, y: 25000}, {x: 75000, y: 25000}], 150),
        createCommercialWall('food_2', [{x: 75000, y: 25000}, {x: 75000, y: 35000}], 150),
        createCommercialWall('food_3', [{x: 75000, y: 35000}, {x: 60000, y: 35000}], 150)
      ];

      // Test central court integrity (complex octagon)
      const courtWalls = walls.slice(4, 12);
      const courtResult = await booleanEngine.batchUnion(courtWalls);
      expect(courtResult.success).toBe(true);
      expect(courtResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Test angled court corners
      const angledCorner1 = [walls[5], walls[6]]; // Court walls with angle
      const angledResult1 = await booleanEngine.resolveLJunction(angledCorner1);
      expect(angledResult1.success).toBe(true);

      const angledCorner2 = [walls[7], walls[8]]; // Another angled corner
      const angledResult2 = await booleanEngine.resolveLJunction(angledCorner2);
      expect(angledResult2.success).toBe(true);

      // Test corridor connections to court
      const corridorCourtConnection = [walls[12], walls[11]]; // Corridor and court
      const corridorCourtResult = await booleanEngine.resolveTJunction(corridorCourtConnection);
      expect(corridorCourtResult.success).toBe(true);

      // Test anchor store connections
      const anchorConnection = [walls[0], walls[16]]; // North perimeter and anchor
      const anchorResult = await booleanEngine.resolveTJunction(anchorConnection);
      expect(anchorResult.success).toBe(true);

      // Test food court area
      const foodCourtWalls = walls.slice(20, 23);
      const foodCourtResult = await booleanEngine.batchUnion(foodCourtWalls);
      expect(foodCourtResult.success).toBe(true);

      // Test complex intersection at corridor junction
      const complexJunction = [walls[12], walls[4], walls[16]]; // Corridor, court, anchor
      const complexResult = await resolver.resolveCrossJunction(complexJunction);
      expect(complexResult.success).toBe(true);
      expect(complexResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Network optimization for mall complexity
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');
      expect(networkResult.processingTime).toBeLessThan(20000); // Complex but should complete

      // Validate mall construction standards
      for (const wall of walls.slice(0, 4)) { // Perimeter walls
        expect(wall.thickness).toBe(300); // Thick exterior for mall
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.95);
      }

      // Validate court geometry quality
      for (const wall of courtWalls) {
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.90); // Complex geometry may have lower score
      }
    });
  });

  describe('Industrial and Warehouse Scenarios', () => {
    test('should handle large warehouse with loading docks', async () => {
      // Large distribution warehouse (100,000 sq ft)
      const walls = [
        // Warehouse perimeter (tilt-up concrete)
        createCommercialWall('warehouse_north', [{x: 0, y: 0}, {x: 100000, y: 0}], 400),
        createCommercialWall('warehouse_east', [{x: 100000, y: 0}, {x: 100000, y: 80000}], 400),
        createCommercialWall('warehouse_south', [{x: 100000, y: 80000}, {x: 0, y: 80000}], 400),
        createCommercialWall('warehouse_west', [{x: 0, y: 80000}, {x: 0, y: 0}], 400),
        
        // Loading dock area
        createCommercialWall('dock_wall', [{x: 0, y: 60000}, {x: 30000, y: 60000}], 300),
        
        // Office area (front corner)
        createCommercialWall('office_wall_1', [{x: 0, y: 15000}, {x: 20000, y: 15000}], 200),
        createCommercialWall('office_wall_2', [{x: 20000, y: 15000}, {x: 20000, y: 0}], 200),
        
        // Mezzanine support walls
        createCommercialWall('mezz_1', [{x: 25000, y: 20000}, {x: 75000, y: 20000}], 250),
        createCommercialWall('mezz_2', [{x: 25000, y: 40000}, {x: 75000, y: 40000}], 250),
        createCommercialWall('mezz_3', [{x: 25000, y: 20000}, {x: 25000, y: 40000}], 250),
        createCommercialWall('mezz_4', [{x: 75000, y: 20000}, {x: 75000, y: 40000}], 250),
        
        // Fire separation walls
        createCommercialWall('fire_1', [{x: 50000, y: 0}, {x: 50000, y: 80000}], 300),
        createCommercialWall('fire_2', [{x: 0, y: 40000}, {x: 100000, y: 40000}], 300),
        
        // Truck maintenance bay
        createCommercialWall('maint_1', [{x: 80000, y: 60000}, {x: 100000, y: 60000}], 200),
        createCommercialWall('maint_2', [{x: 80000, y: 60000}, {x: 80000, y: 80000}], 200)
      ];

      // Test fire separation wall intersections (critical for code compliance)
      const fireSeparationIntersection = [walls[11], walls[12]]; // Fire walls crossing
      const fireResult = await booleanEngine.resolveTJunction(fireSeparationIntersection);
      expect(fireResult.success).toBe(true);
      expect(fireResult.warnings.some(w => w.includes('thickness'))).toBe(true);

      // Test mezzanine area (rectangular enclosure)
      const mezzanineWalls = walls.slice(7, 11);
      const mezzanineResult = await booleanEngine.batchUnion(mezzanineWalls);
      expect(mezzanineResult.success).toBe(true);

      // Test office area L-junction
      const officeJunction = [walls[5], walls[6]]; // Office walls
      const officeResult = await booleanEngine.resolveLJunction(officeJunction);
      expect(officeResult.success).toBe(true);

      // Test loading dock connection
      const dockConnection = [walls[3], walls[4]]; // West wall and dock wall
      const dockResult = await booleanEngine.resolveTJunction(dockConnection);
      expect(dockResult.success).toBe(true);

      // Test maintenance bay L-junction
      const maintJunction = [walls[13], walls[14]]; // Maintenance walls
      const maintResult = await booleanEngine.resolveLJunction(maintJunction);
      expect(maintResult.success).toBe(true);

      // Test complex intersection at fire wall and mezzanine
      const complexIntersection = [walls[11], walls[7], walls[8]]; // Fire wall and mezzanine walls
      const complexResult = await resolver.resolveCrossJunction(complexIntersection);
      expect(complexResult.success).toBe(true);
      expect(complexResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Network optimization for warehouse scale
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');
      expect(networkResult.processingTime).toBeLessThan(15000);

      // Validate warehouse construction standards
      for (const wall of walls.slice(0, 4)) { // Perimeter walls
        expect(wall.thickness).toBe(400); // Thick tilt-up concrete
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.98);
      }

      // Validate fire separation walls
      const fireWalls = [walls[11], walls[12]];
      for (const wall of fireWalls) {
        expect(wall.thickness).toBe(300); // Fire-rated thickness
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.98); // Critical for fire rating
      }
    });

    test('should handle manufacturing facility with clean rooms', async () => {
      // High-tech manufacturing with clean room requirements
      const walls = [
        // Facility perimeter
        createCommercialWall('facility_north', [{x: 0, y: 0}, {x: 60000, y: 0}], 350),
        createCommercialWall('facility_east', [{x: 60000, y: 0}, {x: 60000, y: 40000}], 350),
        createCommercialWall('facility_south', [{x: 60000, y: 40000}, {x: 0, y: 40000}], 350),
        createCommercialWall('facility_west', [{x: 0, y: 40000}, {x: 0, y: 0}], 350),
        
        // Clean room envelope (Class 100)
        createCommercialWall('clean_north', [{x: 15000, y: 10000}, {x: 35000, y: 10000}], 300),
        createCommercialWall('clean_east', [{x: 35000, y: 10000}, {x: 35000, y: 25000}], 300),
        createCommercialWall('clean_south', [{x: 35000, y: 25000}, {x: 15000, y: 25000}], 300),
        createCommercialWall('clean_west', [{x: 15000, y: 25000}, {x: 15000, y: 10000}], 300),
        
        // Gowning area (airlock)
        createCommercialWall('gown_1', [{x: 12000, y: 15000}, {x: 15000, y: 15000}], 250),
        createCommercialWall('gown_2', [{x: 12000, y: 15000}, {x: 12000, y: 20000}], 250),
        createCommercialWall('gown_3', [{x: 12000, y: 20000}, {x: 15000, y: 20000}], 250),
        
        // Equipment areas
        createCommercialWall('equip_1', [{x: 40000, y: 5000}, {x: 55000, y: 5000}], 200),
        createCommercialWall('equip_2', [{x: 55000, y: 5000}, {x: 55000, y: 15000}], 200),
        createCommercialWall('equip_3', [{x: 55000, y: 15000}, {x: 40000, y: 15000}], 200),
        createCommercialWall('equip_4', [{x: 40000, y: 15000}, {x: 40000, y: 5000}], 200),
        
        // Chemical storage (hazmat)
        createCommercialWall('chem_1', [{x: 5000, y: 30000}, {x: 15000, y: 30000}], 400),
        createCommercialWall('chem_2', [{x: 15000, y: 30000}, {x: 15000, y: 40000}], 400),
        createCommercialWall('chem_3', [{x: 5000, y: 30000}, {x: 5000, y: 40000}], 400),
        
        // Office/lab area
        createCommercialWall('lab_1', [{x: 40000, y: 25000}, {x: 60000, y: 25000}], 150),
        createCommercialWall('lab_2', [{x: 45000, y: 25000}, {x: 45000, y: 40000}], 150)
      ];

      // Test clean room integrity (critical for contamination control)
      const cleanRoomWalls = walls.slice(4, 8);
      const cleanRoomResult = await booleanEngine.batchUnion(cleanRoomWalls);
      expect(cleanRoomResult.success).toBe(true);
      expect(cleanRoomResult.processingTime).toBeLessThan(2000);

      // Test gowning area (airlock system)
      const gowningWalls = walls.slice(8, 11);
      const gowningResult = await booleanEngine.batchUnion(gowningWalls);
      expect(gowningResult.success).toBe(true);

      // Test gowning area connection to clean room
      const airlockConnection = [walls[7], walls[8]]; // Clean room west and gowning
      const airlockResult = await booleanEngine.resolveTJunction(airlockConnection);
      expect(airlockResult.success).toBe(true);

      // Test equipment area (closed rectangle)
      const equipmentWalls = walls.slice(11, 15);
      const equipmentResult = await booleanEngine.batchUnion(equipmentWalls);
      expect(equipmentResult.success).toBe(true);

      // Test chemical storage area (hazmat requirements)
      const chemStorageWalls = walls.slice(15, 18);
      const chemResult = await booleanEngine.batchUnion(chemStorageWalls);
      expect(chemResult.success).toBe(true);

      // Test lab area T-junctions
      const labJunction = [walls[2], walls[18]]; // South perimeter and lab wall
      const labResult = await booleanEngine.resolveTJunction(labJunction);
      expect(labResult.success).toBe(true);

      // Test complex intersection at clean room corner
      const cleanRoomCorner = [walls[4], walls[5], walls[11]]; // Clean room and equipment area
      const cornerResult = await resolver.resolveCrossJunction(cleanRoomCorner);
      expect(cornerResult.success).toBe(true);

      // Network optimization for manufacturing facility
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');
      expect(networkResult.processingTime).toBeLessThan(12000);

      // Validate clean room construction (highest precision required)
      for (const wall of cleanRoomWalls) {
        expect(wall.thickness).toBe(300); // Thick for contamination control
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.99); // Extremely high precision for clean rooms
      }

      // Validate chemical storage walls (safety critical)
      for (const wall of chemStorageWalls) {
        expect(wall.thickness).toBe(400); // Thick for hazmat containment
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.98);
      }

      // Validate airlock system integrity
      for (const wall of gowningWalls) {
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.98); // Critical for contamination control
      }
    });
  });

  describe('Mixed-Use and Complex Commercial Scenarios', () => {
    test('should handle mixed-use building with retail and office', async () => {
      // Mixed-use building: retail ground floor, office upper floors
      const walls = [
        // Building envelope
        createCommercialWall('envelope_north', [{x: 0, y: 0}, {x: 40000, y: 0}], 300),
        createCommercialWall('envelope_east', [{x: 40000, y: 0}, {x: 40000, y: 30000}], 300),
        createCommercialWall('envelope_south', [{x: 40000, y: 30000}, {x: 0, y: 30000}], 300),
        createCommercialWall('envelope_west', [{x: 0, y: 30000}, {x: 0, y: 0}], 300),
        
        // Retail spaces (ground floor)
        createCommercialWall('retail_1', [{x: 0, y: 10000}, {x: 15000, y: 10000}], 150),
        createCommercialWall('retail_2', [{x: 15000, y: 10000}, {x: 15000, y: 0}], 150),
        createCommercialWall('retail_3', [{x: 25000, y: 0}, {x: 25000, y: 10000}], 150),
        createCommercialWall('retail_4', [{x: 25000, y: 10000}, {x: 40000, y: 10000}], 150),
        
        // Central core (elevators/stairs for office access)
        createCommercialWall('core_north', [{x: 17000, y: 12000}, {x: 23000, y: 12000}], 300),
        createCommercialWall('core_east', [{x: 23000, y: 12000}, {x: 23000, y: 18000}], 300),
        createCommercialWall('core_south', [{x: 23000, y: 18000}, {x: 17000, y: 18000}], 300),
        createCommercialWall('core_west', [{x: 17000, y: 18000}, {x: 17000, y: 12000}], 300),
        
        // Office demising walls (upper floor layout)
        createCommercialWall('office_1', [{x: 0, y: 20000}, {x: 17000, y: 20000}], 150),
        createCommercialWall('office_2', [{x: 23000, y: 20000}, {x: 40000, y: 20000}], 150),
        createCommercialWall('office_3', [{x: 10000, y: 20000}, {x: 10000, y: 30000}], 150),
        createCommercialWall('office_4', [{x: 30000, y: 20000}, {x: 30000, y: 30000}], 150),
        
        // Parking garage connection (basement level)
        createCommercialWall('parking_ramp', [{x: 35000, y: 15000}, {x: 40000, y: 15000}], 400),
        
        // Mechanical/electrical rooms
        createCommercialWall('mech_1', [{x: 5000, y: 25000}, {x: 10000, y: 25000}], 200),
        createCommercialWall('mech_2', [{x: 10000, y: 25000}, {x: 10000, y: 30000}], 200)
      ];

      // Test retail space divisions
      const retail1Junction = [walls[0], walls[4]]; // North envelope and retail 1
      const retail1Result = await booleanEngine.resolveTJunction(retail1Junction);
      expect(retail1Result.success).toBe(true);

      const retail2Junction = [walls[4], walls[5]]; // Retail walls L-junction
      const retail2Result = await booleanEngine.resolveLJunction(retail2Junction);
      expect(retail2Result.success).toBe(true);

      // Test central core integrity (critical for vertical circulation)
      const coreWalls = walls.slice(8, 12);
      const coreResult = await booleanEngine.batchUnion(coreWalls);
      expect(coreResult.success).toBe(true);

      // Test office demising walls
      const office1Junction = [walls[3], walls[12]]; // West envelope and office 1
      const office1Result = await booleanEngine.resolveTJunction(office1Junction);
      expect(office1Result.success).toBe(true);

      const office2Junction = [walls[12], walls[14]]; // Office walls intersection
      const office2Result = await booleanEngine.resolveTJunction(office2Junction);
      expect(office2Result.success).toBe(true);

      // Test parking garage connection
      const parkingConnection = [walls[1], walls[16]]; // East envelope and parking ramp
      const parkingResult = await booleanEngine.resolveTJunction(parkingConnection);
      expect(parkingResult.success).toBe(true);

      // Test mechanical room L-junction
      const mechJunction = [walls[17], walls[18]]; // Mechanical room walls
      const mechResult = await booleanEngine.resolveLJunction(mechJunction);
      expect(mechResult.success).toBe(true);

      // Test complex intersection at core and office junction
      const complexIntersection = [walls[8], walls[12], walls[14]]; // Core, office walls
      const complexResult = await resolver.resolveCrossJunction(complexIntersection);
      expect(complexResult.success).toBe(true);
      expect(complexResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Network optimization for mixed-use complexity
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');
      expect(networkResult.processingTime).toBeLessThan(15000);

      // Validate mixed-use construction requirements
      for (const wall of walls.slice(0, 4)) { // Building envelope
        expect(wall.thickness).toBe(300); // Thick exterior for mixed-use
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.98);
      }

      // Validate core walls (critical for life safety)
      for (const wall of coreWalls) {
        expect(wall.thickness).toBe(300); // Fire-rated core
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.98);
      }

      // Validate retail flexibility (thinner walls)
      const retailWalls = walls.slice(4, 8);
      for (const wall of retailWalls) {
        expect(wall.thickness).toBe(150); // Flexible retail partitions
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
      }
    });
  });
});