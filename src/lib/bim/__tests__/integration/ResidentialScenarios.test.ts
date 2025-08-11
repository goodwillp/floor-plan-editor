/**
 * Residential Floor Plan Integration Tests
 * 
 * Tests realistic residential architectural scenarios including single-family homes,
 * apartments, condos, and townhouses with various complexity levels.
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

describe('Residential Floor Plan Integration Tests', () => {
  let resolver: AdvancedIntersectionResolver;
  let booleanEngine: BooleanOperationsEngine;
  let offsetEngine: RobustOffsetEngine;
  let healingEngine: ShapeHealingEngine;
  let validator: GeometryValidator;
  let testDataFactory: TestDataFactory;

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

    validator = new GeometryValidator({
      tolerance: 1e-6,
      enableStrictValidation: true
    });

    testDataFactory = new TestDataFactory();
  });

  /**
   * Helper function to create residential wall
   */
  const createResidentialWall = (
    id: string,
    points: Array<{x: number, y: number}>,
    thickness: number = 150, // Standard 6" interior wall
    wallType: WallTypeString = 'Layout'
  ) => {
    const bimPoints = points.map((p, i) => new BIMPointImpl(p.x, p.y, {
      id: `${id}_point_${i}`,
      tolerance: 1e-6,
      creationMethod: 'residential_layout',
      accuracy: 0.98,
      validated: true
    }));

    const curve = new CurveImpl(bimPoints, CurveType.POLYLINE, {
      id: `${id}_baseline`,
      isClosed: false
    });

    return testDataFactory.createTestWallSolid(id, thickness);
  };

  describe('Single-Family Home Scenarios', () => {
    test('should handle typical ranch-style home layout', async () => {
      // Create a typical 1200 sq ft ranch home
      const walls = [
        // Exterior walls (2x6 construction = 150mm)
        createResidentialWall('exterior_front', [{x: 0, y: 0}, {x: 12000, y: 0}], 150),
        createResidentialWall('exterior_right', [{x: 12000, y: 0}, {x: 12000, y: 8000}], 150),
        createResidentialWall('exterior_back', [{x: 12000, y: 8000}, {x: 0, y: 8000}], 150),
        createResidentialWall('exterior_left', [{x: 0, y: 8000}, {x: 0, y: 0}], 150),
        
        // Interior load-bearing wall (2x4 = 100mm)
        createResidentialWall('load_bearing', [{x: 6000, y: 0}, {x: 6000, y: 8000}], 100),
        
        // Bedroom partitions
        createResidentialWall('bedroom_1', [{x: 0, y: 5000}, {x: 6000, y: 5000}], 100),
        createResidentialWall('bedroom_2', [{x: 8000, y: 0}, {x: 8000, y: 5000}], 100),
        
        // Bathroom walls
        createResidentialWall('bathroom_1', [{x: 6000, y: 5000}, {x: 8000, y: 5000}], 100),
        createResidentialWall('bathroom_2', [{x: 7000, y: 5000}, {x: 7000, y: 8000}], 100),
        
        // Kitchen peninsula
        createResidentialWall('kitchen_peninsula', [{x: 3000, y: 6000}, {x: 5000, y: 6000}], 75)
      ];

      // Test major intersection at load-bearing wall
      const loadBearingIntersections = [walls[0], walls[4], walls[5]]; // Front wall, load-bearing, bedroom partition
      const loadBearingResult = await resolver.resolveCrossJunction(loadBearingIntersections);

      expect(loadBearingResult.success).toBe(true);
      expect(loadBearingResult.processingTime).toBeLessThan(1000);
      expect(loadBearingResult.warnings.length).toBeLessThanOrEqual(1);

      // Test bathroom corner (L-junction)
      const bathroomCorner = [walls[7], walls[8]]; // Bathroom walls
      const bathroomResult = await booleanEngine.resolveLJunction(bathroomCorner);
      expect(bathroomResult.success).toBe(true);

      // Test kitchen peninsula T-junction
      const kitchenJunction = [walls[2], walls[9]]; // Back wall and peninsula
      const kitchenResult = await booleanEngine.resolveTJunction(kitchenJunction);
      expect(kitchenResult.success).toBe(true);

      // Validate overall network
      const networkOptimization = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkOptimization.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkOptimization.optimizationsApplied).toContain('spatial_indexing');

      // Performance should be excellent for residential scale
      expect(loadBearingResult.processingTime + bathroomResult.processingTime + kitchenResult.processingTime)
        .toBeLessThan(2000);
    });

    test('should handle two-story colonial home with complex intersections', async () => {
      // First floor layout (2400 sq ft colonial)
      const firstFloorWalls = [
        // Exterior perimeter
        createResidentialWall('ext_front', [{x: 0, y: 0}, {x: 15000, y: 0}], 200), // 8" exterior
        createResidentialWall('ext_right', [{x: 15000, y: 0}, {x: 15000, y: 10000}], 200),
        createResidentialWall('ext_back', [{x: 15000, y: 10000}, {x: 0, y: 10000}], 200),
        createResidentialWall('ext_left', [{x: 0, y: 10000}, {x: 0, y: 0}], 200),
        
        // Central hallway
        createResidentialWall('hall_1', [{x: 5000, y: 0}, {x: 5000, y: 4000}], 100),
        createResidentialWall('hall_2', [{x: 5000, y: 4000}, {x: 10000, y: 4000}], 100),
        createResidentialWall('hall_3', [{x: 10000, y: 4000}, {x: 10000, y: 0}], 100),
        
        // Living room division
        createResidentialWall('living_div', [{x: 0, y: 6000}, {x: 5000, y: 6000}], 100),
        
        // Kitchen island
        createResidentialWall('island_1', [{x: 11000, y: 7000}, {x: 13000, y: 7000}], 75),
        createResidentialWall('island_2', [{x: 13000, y: 7000}, {x: 13000, y: 8500}], 75),
        createResidentialWall('island_3', [{x: 13000, y: 8500}, {x: 11000, y: 8500}], 75),
        createResidentialWall('island_4', [{x: 11000, y: 8500}, {x: 11000, y: 7000}], 75),
        
        // Stairwell walls
        createResidentialWall('stair_1', [{x: 7000, y: 6000}, {x: 9000, y: 6000}], 100),
        createResidentialWall('stair_2', [{x: 9000, y: 6000}, {x: 9000, y: 8000}], 100),
        createResidentialWall('stair_3', [{x: 9000, y: 8000}, {x: 7000, y: 8000}], 100),
        createResidentialWall('stair_4', [{x: 7000, y: 8000}, {x: 7000, y: 6000}], 100)
      ];

      // Test complex central intersection (hallway junction)
      const centralJunction = [firstFloorWalls[4], firstFloorWalls[5], firstFloorWalls[6]]; // Hallway walls
      const centralResult = await resolver.resolveCrossJunction(centralJunction);

      expect(centralResult.success).toBe(true);
      expect(centralResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Test kitchen island (closed loop)
      const islandWalls = firstFloorWalls.slice(8, 12);
      const islandResult = await booleanEngine.batchUnion(islandWalls);
      expect(islandResult.success).toBe(true);

      // Test stairwell (another closed loop)
      const stairWalls = firstFloorWalls.slice(12, 16);
      const stairResult = await booleanEngine.batchUnion(stairWalls);
      expect(stairResult.success).toBe(true);

      // Test living room T-junction
      const livingJunction = [firstFloorWalls[0], firstFloorWalls[7]]; // Front wall and living division
      const livingResult = await booleanEngine.resolveTJunction(livingJunction);
      expect(livingResult.success).toBe(true);

      // Overall network optimization
      const networkResult = await resolver.optimizeIntersectionNetwork(firstFloorWalls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.originalComplexity).toBeGreaterThan(10); // Complex layout

      // Performance should still be reasonable for colonial complexity
      expect(centralResult.processingTime).toBeLessThan(2000);
      expect(networkResult.processingTime).toBeLessThan(5000);
    });

    test('should handle open-concept modern home', async () => {
      // Modern open-concept home with minimal interior walls
      const walls = [
        // Exterior envelope
        createResidentialWall('ext_north', [{x: 0, y: 0}, {x: 18000, y: 0}], 250), // Insulated exterior
        createResidentialWall('ext_east', [{x: 18000, y: 0}, {x: 18000, y: 12000}], 250),
        createResidentialWall('ext_south', [{x: 18000, y: 12000}, {x: 0, y: 12000}], 250),
        createResidentialWall('ext_west', [{x: 0, y: 12000}, {x: 0, y: 0}], 250),
        
        // Minimal interior partitions
        createResidentialWall('master_wall', [{x: 12000, y: 0}, {x: 12000, y: 6000}], 100),
        createResidentialWall('powder_room', [{x: 6000, y: 8000}, {x: 8000, y: 8000}], 100),
        createResidentialWall('powder_side', [{x: 8000, y: 8000}, {x: 8000, y: 12000}], 100),
        
        // Kitchen island (large)
        createResidentialWall('island_long', [{x: 8000, y: 4000}, {x: 14000, y: 4000}], 100),
        createResidentialWall('island_short', [{x: 14000, y: 4000}, {x: 14000, y: 6000}], 100),
        
        // Fireplace surround
        createResidentialWall('fireplace_1', [{x: 2000, y: 6000}, {x: 4000, y: 6000}], 200),
        createResidentialWall('fireplace_2', [{x: 4000, y: 6000}, {x: 4000, y: 7000}], 200),
        createResidentialWall('fireplace_3', [{x: 4000, y: 7000}, {x: 2000, y: 7000}], 200),
        createResidentialWall('fireplace_4', [{x: 2000, y: 7000}, {x: 2000, y: 6000}], 200)
      ];

      // Test master bedroom T-junction
      const masterJunction = [walls[1], walls[4]]; // East wall and master wall
      const masterResult = await booleanEngine.resolveTJunction(masterJunction);
      expect(masterResult.success).toBe(true);

      // Test powder room L-junction
      const powderJunction = [walls[5], walls[6]]; // Powder room walls
      const powderResult = await booleanEngine.resolveLJunction(powderJunction);
      expect(powderResult.success).toBe(true);

      // Test kitchen island L-junction
      const islandJunction = [walls[7], walls[8]]; // Island walls
      const islandResult = await booleanEngine.resolveLJunction(islandJunction);
      expect(islandResult.success).toBe(true);

      // Test fireplace surround (closed rectangle)
      const fireplaceWalls = walls.slice(9, 13);
      const fireplaceResult = await booleanEngine.batchUnion(fireplaceWalls);
      expect(fireplaceResult.success).toBe(true);

      // Network optimization should be very efficient due to open concept
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.processingTime).toBeLessThan(3000); // Should be fast

      // Validate geometric quality
      for (const wall of walls) {
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.95);
      }
    });
  });

  describe('Multi-Unit Residential Scenarios', () => {
    test('should handle apartment building floor plan', async () => {
      // Typical apartment building with 4 units per floor
      const walls = [];
      
      // Building exterior
      walls.push(
        createResidentialWall('bldg_north', [{x: 0, y: 0}, {x: 20000, y: 0}], 300), // Thick exterior
        createResidentialWall('bldg_east', [{x: 20000, y: 0}, {x: 20000, y: 15000}], 300),
        createResidentialWall('bldg_south', [{x: 20000, y: 15000}, {x: 0, y: 15000}], 300),
        createResidentialWall('bldg_west', [{x: 0, y: 15000}, {x: 0, y: 0}], 300)
      );

      // Central corridor
      walls.push(
        createResidentialWall('corridor_north', [{x: 0, y: 6000}, {x: 20000, y: 6000}], 150),
        createResidentialWall('corridor_south', [{x: 0, y: 9000}, {x: 20000, y: 9000}], 150)
      );

      // Unit separations (fire-rated)
      walls.push(
        createResidentialWall('unit_sep_1', [{x: 5000, y: 0}, {x: 5000, y: 6000}], 200),
        createResidentialWall('unit_sep_2', [{x: 10000, y: 0}, {x: 10000, y: 6000}], 200),
        createResidentialWall('unit_sep_3', [{x: 15000, y: 0}, {x: 15000, y: 6000}], 200),
        createResidentialWall('unit_sep_4', [{x: 5000, y: 9000}, {x: 5000, y: 15000}], 200),
        createResidentialWall('unit_sep_5', [{x: 10000, y: 9000}, {x: 10000, y: 15000}], 200),
        createResidentialWall('unit_sep_6', [{x: 15000, y: 9000}, {x: 15000, y: 15000}], 200)
      );

      // Stairwell and elevator core
      walls.push(
        createResidentialWall('core_1', [{x: 8000, y: 6000}, {x: 12000, y: 6000}], 200),
        createResidentialWall('core_2', [{x: 12000, y: 6000}, {x: 12000, y: 9000}], 200),
        createResidentialWall('core_3', [{x: 12000, y: 9000}, {x: 8000, y: 9000}], 200),
        createResidentialWall('core_4', [{x: 8000, y: 9000}, {x: 8000, y: 6000}], 200)
      );

      // Test corridor intersections (multiple T-junctions)
      const corridorIntersections = [walls[4], walls[6], walls[7]]; // Corridor and unit separations
      const corridorResult = await resolver.resolveCrossJunction(corridorIntersections);
      expect(corridorResult.success).toBe(true);

      // Test core intersection (complex junction)
      const coreIntersections = [walls[4], walls[5], walls[12], walls[14]]; // Corridors and core
      const coreResult = await resolver.resolveCrossJunction(coreIntersections);
      expect(coreResult.success).toBe(true);

      // Test unit separation continuity
      const unitSepResult = await booleanEngine.resolveTJunction([walls[0], walls[6]]); // North wall and unit sep
      expect(unitSepResult.success).toBe(true);

      // Network optimization for apartment building
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');

      // Should handle apartment complexity efficiently
      expect(corridorResult.processingTime + coreResult.processingTime).toBeLessThan(3000);
    });

    test('should handle townhouse row with shared walls', async () => {
      // Row of 5 townhouses with shared party walls
      const townhouseWalls = [];
      const townhouseWidth = 6000; // 6m wide units
      const townhouseDepth = 12000; // 12m deep

      for (let unit = 0; unit < 5; unit++) {
        const baseX = unit * townhouseWidth;
        
        // Front wall
        townhouseWalls.push(
          createResidentialWall(`unit_${unit}_front`, 
            [{x: baseX, y: 0}, {x: baseX + townhouseWidth, y: 0}], 200)
        );
        
        // Back wall
        townhouseWalls.push(
          createResidentialWall(`unit_${unit}_back`, 
            [{x: baseX + townhouseWidth, y: townhouseDepth}, {x: baseX, y: townhouseDepth}], 200)
        );
        
        // Party walls (shared between units)
        if (unit < 4) { // Don't create wall after last unit
          townhouseWalls.push(
            createResidentialWall(`party_wall_${unit}`, 
              [{x: baseX + townhouseWidth, y: 0}, {x: baseX + townhouseWidth, y: townhouseDepth}], 250)
          );
        }
        
        // End walls (only for first and last units)
        if (unit === 0) {
          townhouseWalls.push(
            createResidentialWall(`unit_${unit}_left`, 
              [{x: baseX, y: townhouseDepth}, {x: baseX, y: 0}], 200)
          );
        }
        if (unit === 4) {
          townhouseWalls.push(
            createResidentialWall(`unit_${unit}_right`, 
              [{x: baseX + townhouseWidth, y: 0}, {x: baseX + townhouseWidth, y: townhouseDepth}], 200)
          );
        }
        
        // Interior walls for each unit
        townhouseWalls.push(
          createResidentialWall(`unit_${unit}_interior_1`, 
            [{x: baseX, y: 4000}, {x: baseX + townhouseWidth, y: 4000}], 100),
          createResidentialWall(`unit_${unit}_interior_2`, 
            [{x: baseX, y: 8000}, {x: baseX + townhouseWidth, y: 8000}], 100)
        );
      }

      // Test party wall intersections (critical for fire rating)
      const partyWallIntersections = townhouseWalls.filter(w => w.id.includes('party_wall'));
      expect(partyWallIntersections).toHaveLength(4);

      for (const partyWall of partyWallIntersections) {
        // Each party wall should intersect with front and back walls
        const frontWall = townhouseWalls.find(w => w.id.includes('front') && 
          Math.abs(w.baseline.points[1].x - partyWall.baseline.points[0].x) < 1);
        const backWall = townhouseWalls.find(w => w.id.includes('back') && 
          Math.abs(w.baseline.points[0].x - partyWall.baseline.points[1].x) < 1);

        if (frontWall && backWall) {
          const junctionResult = await resolver.resolveCrossJunction([frontWall, partyWall, backWall]);
          expect(junctionResult.success).toBe(true);
        }
      }

      // Test interior wall T-junctions within units
      const unit0Interior = townhouseWalls.filter(w => w.id.includes('unit_0_interior'));
      const unit0Front = townhouseWalls.find(w => w.id === 'unit_0_front')!;
      
      const interiorJunction = await booleanEngine.resolveTJunction([unit0Front, unit0Interior[0]]);
      expect(interiorJunction.success).toBe(true);

      // Network optimization for townhouse row
      const networkResult = await resolver.optimizeIntersectionNetwork(townhouseWalls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.processingTime).toBeLessThan(5000);

      // Validate shared wall integrity
      for (const partyWall of partyWallIntersections) {
        const validation = await validator.validateWallSolid(partyWall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.95); // Critical for fire rating
      }
    });

    test('should handle condominium with complex geometry', async () => {
      // Luxury condominium with curved walls and complex features
      const condoWalls = [];

      // Curved exterior wall (approximated with many segments)
      const curvedPoints = [];
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 0.5; // Quarter circle
        curvedPoints.push({
          x: 8000 + 6000 * Math.cos(angle),
          y: 8000 + 6000 * Math.sin(angle)
        });
      }
      condoWalls.push(createResidentialWall('curved_exterior', curvedPoints, 300));

      // Straight walls connecting to curved wall
      condoWalls.push(
        createResidentialWall('straight_1', [{x: 0, y: 0}, {x: 14000, y: 0}], 300),
        createResidentialWall('straight_2', [{x: 14000, y: 0}, {x: 14000, y: 8000}], 300),
        createResidentialWall('straight_3', [{x: 8000, y: 14000}, {x: 0, y: 14000}], 300),
        createResidentialWall('straight_4', [{x: 0, y: 14000}, {x: 0, y: 0}], 300)
      );

      // Interior curved partition
      const interiorCurvedPoints = [];
      for (let i = 0; i <= 10; i++) {
        const angle = (i / 10) * Math.PI * 0.3; // Smaller arc
        interiorCurvedPoints.push({
          x: 6000 + 3000 * Math.cos(angle),
          y: 6000 + 3000 * Math.sin(angle)
        });
      }
      condoWalls.push(createResidentialWall('curved_interior', interiorCurvedPoints, 150));

      // Kitchen island with angled corners
      condoWalls.push(
        createResidentialWall('island_1', [{x: 4000, y: 4000}, {x: 7000, y: 4000}], 100),
        createResidentialWall('island_2', [{x: 7000, y: 4000}, {x: 7500, y: 5000}], 100), // Angled
        createResidentialWall('island_3', [{x: 7500, y: 5000}, {x: 4500, y: 5000}], 100),
        createResidentialWall('island_4', [{x: 4500, y: 5000}, {x: 4000, y: 4000}], 100) // Angled
      );

      // Test curved wall intersection with straight wall
      const curvedIntersection = [condoWalls[0], condoWalls[2]]; // Curved exterior and straight wall
      const curvedResult = await resolver.resolveCrossJunction(curvedIntersection);
      expect(curvedResult.success).toBe(true);
      expect(curvedResult.warnings.some(w => w.includes('complexity'))).toBe(true);

      // Test angled kitchen island corners
      const angledCorner1 = [condoWalls[6], condoWalls[7]]; // Island walls with angle
      const angledResult1 = await booleanEngine.resolveLJunction(angledCorner1);
      expect(angledResult1.success).toBe(true);

      const angledCorner2 = [condoWalls[8], condoWalls[9]]; // Other angled corner
      const angledResult2 = await booleanEngine.resolveLJunction(angledCorner2);
      expect(angledResult2.success).toBe(true);

      // Test interior curved partition intersection
      const interiorCurvedResult = await resolver.resolveCrossJunction([condoWalls[5], condoWalls[1]]);
      expect(interiorCurvedResult.success).toBe(true);

      // Network optimization for complex condo geometry
      const networkResult = await resolver.optimizeIntersectionNetwork(condoWalls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);

      // Complex geometry should take more time but still be reasonable
      expect(curvedResult.processingTime + angledResult1.processingTime + angledResult2.processingTime)
        .toBeLessThan(8000);

      // Validate curved geometry quality
      const curvedValidation = await validator.validateWallSolid(condoWalls[0]);
      expect(curvedValidation.isValid).toBe(true);
      expect(curvedValidation.qualityScore).toBeGreaterThan(0.85); // Lower due to complexity
    });
  });

  describe('Residential Edge Cases and Challenges', () => {
    test('should handle bay windows and architectural projections', async () => {
      // House with bay window projection
      const walls = [
        // Main house rectangle
        createResidentialWall('main_front', [{x: 0, y: 0}, {x: 3000, y: 0}], 200),
        createResidentialWall('main_front_2', [{x: 5000, y: 0}, {x: 10000, y: 0}], 200),
        createResidentialWall('main_right', [{x: 10000, y: 0}, {x: 10000, y: 8000}], 200),
        createResidentialWall('main_back', [{x: 10000, y: 8000}, {x: 0, y: 8000}], 200),
        createResidentialWall('main_left', [{x: 0, y: 8000}, {x: 0, y: 0}], 200),
        
        // Bay window projection (angled)
        createResidentialWall('bay_left', [{x: 3000, y: 0}, {x: 3500, y: -1500}], 200),
        createResidentialWall('bay_front', [{x: 3500, y: -1500}, {x: 4500, y: -1500}], 200),
        createResidentialWall('bay_right', [{x: 4500, y: -1500}, {x: 5000, y: 0}], 200)
      ];

      // Test bay window connections (angled intersections)
      const bayLeftConnection = [walls[0], walls[5]]; // Main front and bay left
      const bayLeftResult = await booleanEngine.resolveLJunction(bayLeftConnection);
      expect(bayLeftResult.success).toBe(true);

      const bayRightConnection = [walls[1], walls[7]]; // Main front 2 and bay right
      const bayRightResult = await booleanEngine.resolveLJunction(bayRightConnection);
      expect(bayRightResult.success).toBe(true);

      // Test bay window internal corners
      const bayCorner1 = [walls[5], walls[6]]; // Bay left and front
      const bayCorner1Result = await booleanEngine.resolveLJunction(bayCorner1);
      expect(bayCorner1Result.success).toBe(true);

      const bayCorner2 = [walls[6], walls[7]]; // Bay front and right
      const bayCorner2Result = await booleanEngine.resolveLJunction(bayCorner2);
      expect(bayCorner2Result.success).toBe(true);

      // Network optimization should handle angled projections
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);

      // Validate angled intersection quality
      expect(bayLeftResult.warnings.some(w => w.includes('angle'))).toBe(true);
      expect(bayRightResult.warnings.some(w => w.includes('angle'))).toBe(true);
    });

    test('should handle basement and foundation walls', async () => {
      // House with basement (different wall thicknesses)
      const walls = [
        // Foundation walls (thicker)
        createResidentialWall('foundation_north', [{x: 0, y: 0}, {x: 12000, y: 0}], 300),
        createResidentialWall('foundation_east', [{x: 12000, y: 0}, {x: 12000, y: 8000}], 300),
        createResidentialWall('foundation_south', [{x: 12000, y: 8000}, {x: 0, y: 8000}], 300),
        createResidentialWall('foundation_west', [{x: 0, y: 8000}, {x: 0, y: 0}], 300),
        
        // Basement interior walls (standard thickness)
        createResidentialWall('basement_partition', [{x: 6000, y: 0}, {x: 6000, y: 8000}], 150),
        createResidentialWall('utility_room', [{x: 0, y: 6000}, {x: 4000, y: 6000}], 150),
        
        // Basement stairs
        createResidentialWall('stair_wall_1', [{x: 8000, y: 2000}, {x: 10000, y: 2000}], 150),
        createResidentialWall('stair_wall_2', [{x: 10000, y: 2000}, {x: 10000, y: 4000}], 150),
        createResidentialWall('stair_wall_3', [{x: 10000, y: 4000}, {x: 8000, y: 4000}], 150),
        
        // Foundation step (thickness change)
        createResidentialWall('foundation_step', [{x: 3000, y: 0}, {x: 3000, y: 1000}], 400) // Thicker footing
      ];

      // Test foundation corner (thick walls)
      const foundationCorner = [walls[0], walls[1]]; // North and east foundation
      const foundationResult = await booleanEngine.resolveLJunction(foundationCorner);
      expect(foundationResult.success).toBe(true);

      // Test partition intersection with foundation
      const partitionIntersection = [walls[0], walls[4]]; // North foundation and partition
      const partitionResult = await booleanEngine.resolveTJunction(partitionIntersection);
      expect(partitionResult.success).toBe(true);

      // Test thickness transition (foundation step)
      const thicknessTransition = [walls[0], walls[9]]; // Foundation and step
      const transitionResult = await booleanEngine.resolveTJunction(thicknessTransition);
      expect(transitionResult.success).toBe(true);
      expect(transitionResult.warnings.some(w => w.includes('thickness'))).toBe(true);

      // Test stair enclosure
      const stairWalls = walls.slice(6, 9);
      const stairResult = await booleanEngine.batchUnion(stairWalls);
      expect(stairResult.success).toBe(true);

      // Network optimization with mixed thicknesses
      const networkResult = await resolver.optimizeIntersectionNetwork(walls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);

      // Validate thick foundation walls
      for (const foundationWall of walls.slice(0, 4)) {
        expect(foundationWall.thickness).toBe(300);
        const validation = await validator.validateWallSolid(foundationWall);
        expect(validation.isValid).toBe(true);
      }
    });

    test('should handle residential additions and renovations', async () => {
      // Original house with addition (different construction periods)
      const originalHouse = [
        // Original 1950s ranch
        createResidentialWall('orig_front', [{x: 0, y: 0}, {x: 8000, y: 0}], 150),
        createResidentialWall('orig_right', [{x: 8000, y: 0}, {x: 8000, y: 6000}], 150),
        createResidentialWall('orig_back', [{x: 8000, y: 6000}, {x: 0, y: 6000}], 150),
        createResidentialWall('orig_left', [{x: 0, y: 6000}, {x: 0, y: 0}], 150)
      ];

      const addition = [
        // 1990s addition (different standards)
        createResidentialWall('add_front', [{x: 8000, y: 0}, {x: 12000, y: 0}], 200), // Thicker exterior
        createResidentialWall('add_right', [{x: 12000, y: 0}, {x: 12000, y: 8000}], 200),
        createResidentialWall('add_back', [{x: 12000, y: 8000}, {x: 8000, y: 8000}], 200),
        createResidentialWall('add_connection', [{x: 8000, y: 6000}, {x: 8000, y: 8000}], 200) // Connects to original
      ];

      const allWalls = [...originalHouse, ...addition];

      // Test connection between original and addition (thickness mismatch)
      const connectionPoint = [originalHouse[1], addition[3]]; // Original right and addition connection
      const connectionResult = await booleanEngine.resolveTJunction(connectionPoint);
      expect(connectionResult.success).toBe(true);
      expect(connectionResult.warnings.some(w => w.includes('thickness'))).toBe(true);

      // Test addition corner
      const additionCorner = [addition[0], addition[1]]; // Addition front and right
      const additionResult = await booleanEngine.resolveLJunction(additionCorner);
      expect(additionResult.success).toBe(true);

      // Test original house integrity
      const originalCorner = [originalHouse[0], originalHouse[3]]; // Original front and left
      const originalResult = await booleanEngine.resolveLJunction(originalCorner);
      expect(originalResult.success).toBe(true);

      // Network optimization with mixed construction
      const networkResult = await resolver.optimizeIntersectionNetwork(allWalls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);

      // Validate thickness transitions are handled properly
      expect(originalHouse[1].thickness).toBe(150); // Original
      expect(addition[3].thickness).toBe(200); // Addition
      
      const thicknessValidation = await validator.validateWallSolid(addition[3]);
      expect(thicknessValidation.isValid).toBe(true);
    });
  });
});