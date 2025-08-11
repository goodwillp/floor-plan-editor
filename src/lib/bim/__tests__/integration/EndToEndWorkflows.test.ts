/**
 * End-to-End Workflow Integration Tests
 * 
 * Tests complete workflows from wall creation to final geometric output,
 * including error recovery, performance validation, and quality assurance.
 * 
 * Requirements: All requirements validation (1.1-10.5)
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { ShapeHealingEngine } from '../../engines/ShapeHealingEngine';
import { GeometrySimplificationEngine } from '../../engines/GeometrySimplificationEngine';
import { AdvancedIntersectionResolver } from '../../engines/AdvancedIntersectionResolver';
import { ModeSwitchingEngine } from '../../engines/ModeSwitchingEngine';
import { AdaptiveToleranceManager } from '../../engines/AdaptiveToleranceManager';
import { GeometryValidator } from '../../validation/GeometryValidator';
import { BIMErrorHandler } from '../../validation/BIMErrorHandler';
import { SQLiteImplementation } from '../../persistence/SQLiteImplementation';
import { CachingLayer } from '../../persistence/CachingLayer';
import { BIMAdapter } from '../../adapters/BIMAdapter';
import { UnifiedWallData } from '../../data/UnifiedWallData';
import { TestDataFactory } from '../helpers/TestDataFactory';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { CurveImpl } from '../../geometry/Curve';
import { BIMPointImpl } from '../../geometry/BIMPoint';
import { CurveType, OffsetJoinType } from '../../types/BIMTypes';
import { WallTypeString } from '../../types/WallTypes';

describe('End-to-End Workflow Integration Tests', () => {
  let offsetEngine: RobustOffsetEngine;
  let booleanEngine: BooleanOperationsEngine;
  let healingEngine: ShapeHealingEngine;
  let simplificationEngine: GeometrySimplificationEngine;
  let intersectionResolver: AdvancedIntersectionResolver;
  let modeSwitchingEngine: ModeSwitchingEngine;
  let toleranceManager: AdaptiveToleranceManager;
  let validator: GeometryValidator;
  let errorHandler: BIMErrorHandler;
  let database: SQLiteImplementation;
  let cachingLayer: CachingLayer;
  let bimAdapter: BIMAdapter;
  let testDataFactory: TestDataFactory;

  beforeEach(async () => {
    // Initialize all engines with production-like settings
    toleranceManager = new AdaptiveToleranceManager({
      baseTolerance: 1e-6,
      documentPrecision: 0.1,
      adaptiveToleranceEnabled: true,
      maxToleranceAdjustment: 10
    });

    offsetEngine = new RobustOffsetEngine({
      tolerance: 1e-6,
      defaultJoinType: 'miter',
      miterLimit: 10,
      enableFallback: true,
      toleranceManager
    });

    booleanEngine = new BooleanOperationsEngine({
      tolerance: 1e-6,
      maxComplexity: 50000,
      enableParallelProcessing: true,
      toleranceManager
    });

    healingEngine = new ShapeHealingEngine({
      tolerance: 1e-6,
      sliverFaceThreshold: 0.1,
      microGapThreshold: 0.01,
      enableAutoHealing: true,
      toleranceManager
    });

    simplificationEngine = new GeometrySimplificationEngine({
      tolerance: 1e-6,
      preserveArchitecturalFeatures: true,
      maxSimplificationLevel: 0.1,
      toleranceManager
    });

    intersectionResolver = new AdvancedIntersectionResolver({
      tolerance: 1e-6,
      maxComplexity: 50000,
      enableParallelProcessing: true,
      extremeAngleThreshold: 15,
      parallelOverlapThreshold: 0.1,
      optimizationEnabled: true,
      spatialIndexingEnabled: true
    });

    modeSwitchingEngine = new ModeSwitchingEngine({
      preserveDataIntegrity: true,
      enableApproximations: true,
      validateAfterSwitch: true
    });

    validator = new GeometryValidator({
      tolerance: 1e-6,
      enableStrictValidation: true
    });

    errorHandler = new BIMErrorHandler({
      enableAutoRecovery: true,
      maxRecoveryAttempts: 3,
      logErrors: true
    });

    // Initialize database for persistence testing
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

    bimAdapter = new BIMAdapter({
      tolerance: 1e-6,
      preserveLegacyData: true
    });

    testDataFactory = new TestDataFactory();
  });

  afterEach(async () => {
    await database.disconnect();
  });

  describe('Complete Wall Creation Workflows', () => {
    test('should complete simple wall creation workflow', async () => {
      const startTime = performance.now();
      
      // Step 1: Define wall parameters
      const wallDefinition = {
        id: 'simple_workflow_wall',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        baselinePoints: [
          { x: 0, y: 0 },
          { x: 3000, y: 0 },
          { x: 3000, y: 2000 }
        ]
      };

      // Step 2: Create baseline curve
      const baseline = TestDataFactory.createTestCurve({
        id: `${wallDefinition.id}_baseline`,
        points: wallDefinition.baselinePoints,
        type: CurveType.POLYLINE
      });

      // Step 3: Calculate adaptive tolerance
      const adaptiveTolerance = await toleranceManager.calculateTolerance(
        wallDefinition.thickness,
        0.1, // document precision
        90, // right angle
        'offset_operation'
      );

      expect(adaptiveTolerance).toBeGreaterThan(0);
      expect(adaptiveTolerance).toBeLessThan(1);

      // Step 4: Generate offset curves
      const offsetResult = await offsetEngine.offsetCurve(
        baseline,
        wallDefinition.thickness / 2,
        'miter',
        adaptiveTolerance
      );

      expect(offsetResult.success).toBe(true);
      expect(offsetResult.leftOffset).toBeDefined();
      expect(offsetResult.rightOffset).toBeDefined();
      expect(offsetResult.joinType).toBe('miter');

      // Step 5: Create wall solid
      const wallSolid = new WallSolidImpl(
        baseline,
        wallDefinition.thickness,
        wallDefinition.type,
        {
          id: wallDefinition.id,
          leftOffset: offsetResult.leftOffset!,
          rightOffset: offsetResult.rightOffset!,
          solidGeometry: [],
          joinTypes: new Map([
            ['start', OffsetJoinType.MITER],
            ['end', OffsetJoinType.MITER]
          ]),
          intersectionData: [],
          healingHistory: [],
          geometricQuality: TestDataFactory.createTestQualityMetrics({
            geometricAccuracy: 0.98
          }),
          processingTime: offsetResult.processingTime || 0
        }
      );

      // Step 6: Validate initial geometry
      const initialValidation = await validator.validateWallSolid(wallSolid);
      expect(initialValidation.isValid).toBe(true);
      expect(initialValidation.issues).toHaveLength(0);
      expect(initialValidation.qualityScore).toBeGreaterThan(0.95);

      // Step 7: Apply shape healing (should be minimal for simple geometry)
      const healingResult = await healingEngine.healShape(wallSolid, adaptiveTolerance);
      expect(healingResult.success).toBe(true);
      expect(healingResult.operationsApplied).toHaveLength(0); // No healing needed

      // Step 8: Apply geometry simplification
      const simplificationResult = await simplificationEngine.simplifyWallGeometry(
        healingResult.healedSolid || wallSolid,
        wallDefinition.thickness * 0.01
      );
      expect(simplificationResult.success).toBe(true);
      expect(simplificationResult.accuracyPreserved).toBe(true);

      // Step 9: Final validation
      const finalValidation = await validator.validateWallSolid(
        simplificationResult.simplifiedSolid
      );
      expect(finalValidation.isValid).toBe(true);
      expect(finalValidation.qualityScore).toBeGreaterThan(0.95);

      // Step 10: Create unified wall data
      const unifiedWall = testDataFactory.createTestWall({
        id: wallDefinition.id,
        type: wallDefinition.type,
        thickness: wallDefinition.thickness,
        baselinePoints: wallDefinition.baselinePoints,
        includeBIMGeometry: true
      });

      // Step 11: Persist to database
      const saveResult = await cachingLayer.saveWall(unifiedWall);
      expect(saveResult.success).toBe(true);

      // Step 12: Verify retrieval
      const retrievedWall = await cachingLayer.loadWall(wallDefinition.id);
      expect(retrievedWall).toBeDefined();
      expect(retrievedWall!.id).toBe(wallDefinition.id);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Workflow should complete quickly for simple geometry
      expect(totalTime).toBeLessThan(2000);

      // Verify final wall properties
      const finalWall = simplificationResult.simplifiedSolid;
      expect(finalWall.thickness).toBe(wallDefinition.thickness);
      expect(finalWall.baseline.points).toHaveLength(wallDefinition.baselinePoints.length);
      expect(finalWall.geometricQuality.geometricAccuracy).toBeGreaterThan(0.95);
    });

    test('should complete complex multi-wall workflow with intersections', async () => {
      const startTime = performance.now();

      // Step 1: Define complex floor plan
      const wallDefinitions = [
        {
          id: 'complex_wall_1',
          type: 'Layout' as WallTypeString,
          thickness: 200,
          points: [{ x: 0, y: 0 }, { x: 5000, y: 0 }]
        },
        {
          id: 'complex_wall_2',
          type: 'Layout' as WallTypeString,
          thickness: 200,
          points: [{ x: 5000, y: 0 }, { x: 5000, y: 3000 }]
        },
        {
          id: 'complex_wall_3',
          type: 'Layout' as WallTypeString,
          thickness: 200,
          points: [{ x: 5000, y: 3000 }, { x: 0, y: 3000 }]
        },
        {
          id: 'complex_wall_4',
          type: 'Layout' as WallTypeString,
          thickness: 200,
          points: [{ x: 0, y: 3000 }, { x: 0, y: 0 }]
        },
        {
          id: 'complex_wall_5',
          type: 'Zone' as WallTypeString,
          thickness: 150,
          points: [{ x: 2500, y: 0 }, { x: 2500, y: 3000 }]
        }
      ];

      const wallSolids: WallSolidImpl[] = [];
      const unifiedWalls: UnifiedWallData[] = [];

      // Step 2: Process each wall through complete pipeline
      for (const wallDef of wallDefinitions) {
        // Create baseline
        const baseline = TestDataFactory.createTestCurve({
          id: `${wallDef.id}_baseline`,
          points: wallDef.points,
          type: CurveType.POLYLINE
        });

        // Calculate adaptive tolerance
        const tolerance = await toleranceManager.calculateTolerance(
          wallDef.thickness,
          0.1,
          90,
          'offset_operation'
        );

        // Generate offsets
        const offsetResult = await offsetEngine.offsetCurve(
          baseline,
          wallDef.thickness / 2,
          'miter',
          tolerance
        );

        expect(offsetResult.success).toBe(true);

        // Create wall solid
        const wallSolid = new WallSolidImpl(
          baseline,
          wallDef.thickness,
          wallDef.type,
          {
            id: wallDef.id,
            leftOffset: offsetResult.leftOffset!,
            rightOffset: offsetResult.rightOffset!,
            solidGeometry: [],
            joinTypes: new Map(),
            intersectionData: [],
            healingHistory: [],
            geometricQuality: TestDataFactory.createTestQualityMetrics(),
            processingTime: offsetResult.processingTime || 0
          }
        );

        wallSolids.push(wallSolid);

        // Create unified wall data
        const unifiedWall = testDataFactory.createTestWall({
          id: wallDef.id,
          type: wallDef.type,
          thickness: wallDef.thickness,
          baselinePoints: wallDef.points,
          includeBIMGeometry: true
        });

        unifiedWalls.push(unifiedWall);
      }

      // Step 3: Resolve all intersections
      const networkOptimization = await intersectionResolver.optimizeIntersectionNetwork(wallSolids);
      expect(networkOptimization.performanceGain).toBeGreaterThanOrEqual(0);

      // Step 4: Apply healing to all walls
      const healedWalls: WallSolidImpl[] = [];
      for (const wall of wallSolids) {
        const healingResult = await healingEngine.healShape(wall, 1e-6);
        expect(healingResult.success).toBe(true);
        healedWalls.push(healingResult.healedSolid || wall);
      }

      // Step 5: Apply simplification to all walls
      const simplifiedWalls: WallSolidImpl[] = [];
      for (const wall of healedWalls) {
        const simplificationResult = await simplificationEngine.simplifyWallGeometry(
          wall,
          wall.thickness * 0.01
        );
        expect(simplificationResult.success).toBe(true);
        simplifiedWalls.push(simplificationResult.simplifiedSolid);
      }

      // Step 6: Validate entire network
      for (const wall of simplifiedWalls) {
        const validation = await validator.validateWallSolid(wall);
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(0.9);
      }

      // Step 7: Test mode switching
      const wallMap = new Map(unifiedWalls.map(w => [w.id, w]));
      const bimSwitchResult = await modeSwitchingEngine.switchToBIMMode(wallMap);
      expect(bimSwitchResult.success).toBe(true);
      expect(bimSwitchResult.convertedWalls).toHaveLength(5);

      // Step 8: Batch save to database
      const batchSaveResult = await database.batchSaveWalls(unifiedWalls);
      expect(batchSaveResult.success).toBe(true);
      expect(batchSaveResult.savedCount).toBe(5);

      // Step 9: Verify batch retrieval
      const loadedWalls = await database.loadWallsByProject('test_project');
      expect(loadedWalls).toHaveLength(5);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Complex workflow should complete within reasonable time
      expect(totalTime).toBeLessThan(10000);

      // Verify network integrity
      expect(simplifiedWalls).toHaveLength(5);
      expect(simplifiedWalls.every(w => w.geometricQuality.geometricAccuracy > 0.9)).toBe(true);
    });

    test('should handle workflow with error recovery', async () => {
      const startTime = performance.now();

      // Step 1: Create problematic wall that will trigger errors
      const problematicWallDef = {
        id: 'problematic_wall',
        type: 'Layout' as WallTypeString,
        thickness: 150,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 0.001 }, // Near-collinear point (problematic)
          { x: 200, y: 0 },
          { x: 200, y: 200 }
        ]
      };

      // Step 2: Create baseline with problematic geometry
      const baseline = TestDataFactory.createTestCurve({
        id: `${problematicWallDef.id}_baseline`,
        points: problematicWallDef.points,
        type: CurveType.POLYLINE
      });

      // Step 3: Attempt offset (should succeed but with warnings)
      const tolerance = await toleranceManager.calculateTolerance(
        problematicWallDef.thickness,
        0.1,
        90,
        'offset_operation'
      );

      const offsetResult = await offsetEngine.offsetCurve(
        baseline,
        problematicWallDef.thickness / 2,
        'miter',
        tolerance
      );

      expect(offsetResult.success).toBe(true);
      expect(offsetResult.warnings.length).toBeGreaterThan(0);
      expect(offsetResult.warnings.some(w => w.includes('collinear') || w.includes('micro'))).toBe(true);

      // Step 4: Create wall solid with lower initial quality
      const wallSolid = new WallSolidImpl(
        baseline,
        problematicWallDef.thickness,
        problematicWallDef.type,
        {
          id: problematicWallDef.id,
          leftOffset: offsetResult.leftOffset!,
          rightOffset: offsetResult.rightOffset!,
          solidGeometry: [],
          joinTypes: new Map(),
          intersectionData: [],
          healingHistory: [],
          geometricQuality: TestDataFactory.createTestQualityMetrics({
            geometricAccuracy: 0.7, // Lower due to problematic geometry
            sliverFaceCount: 1,
            microGapCount: 1
          }),
          processingTime: offsetResult.processingTime || 0
        }
      );

      // Step 5: Initial validation should detect issues
      const initialValidation = await validator.validateWallSolid(wallSolid);
      expect(initialValidation.issues.length).toBeGreaterThan(0);
      expect(initialValidation.qualityScore).toBeLessThan(0.9);

      // Step 6: Apply error handling and recovery
      const errorRecoveryResult = await errorHandler.handleGeometricError({
        type: 'degenerate_geometry',
        severity: 'warning',
        operation: 'offset_operation',
        input: wallSolid,
        message: 'Near-collinear points detected',
        suggestedFix: 'Apply shape healing',
        recoverable: true
      });

      expect(errorRecoveryResult.success).toBe(true);
      expect(errorRecoveryResult.recoveryApplied).toBe(true);

      // Step 7: Apply healing (should fix issues)
      const healingResult = await healingEngine.healShape(wallSolid, tolerance);
      expect(healingResult.success).toBe(true);
      expect(healingResult.operationsApplied.length).toBeGreaterThan(0);
      expect(healingResult.operationsApplied).toContain('remove_micro_segments');

      // Step 8: Apply simplification (should clean up further)
      const simplificationResult = await simplificationEngine.simplifyWallGeometry(
        healingResult.healedSolid || wallSolid,
        problematicWallDef.thickness * 0.01
      );
      expect(simplificationResult.success).toBe(true);
      expect(simplificationResult.pointsRemoved).toBeGreaterThan(0);

      // Step 9: Final validation should show improvement
      const finalValidation = await validator.validateWallSolid(
        simplificationResult.simplifiedSolid
      );
      expect(finalValidation.isValid).toBe(true);
      expect(finalValidation.qualityScore).toBeGreaterThan(initialValidation.qualityScore);
      expect(finalValidation.qualityScore).toBeGreaterThan(0.9);

      // Step 10: Verify error recovery was logged
      expect(errorRecoveryResult.recoverySteps).toContain('shape_healing');
      expect(errorRecoveryResult.qualityImprovement).toBeGreaterThan(0);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Error recovery workflow should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);

      // Verify final geometry quality
      const finalWall = simplificationResult.simplifiedSolid;
      expect(finalWall.geometricQuality.geometricAccuracy).toBeGreaterThan(0.9);
      expect(finalWall.geometricQuality.sliverFaceCount).toBe(0);
      expect(finalWall.geometricQuality.microGapCount).toBe(0);
    });
  });

  describe('Performance and Scalability Workflows', () => {
    test('should handle large-scale workflow efficiently', async () => {
      const startTime = performance.now();

      // Step 1: Create large number of walls (100 walls)
      const wallCount = 100;
      const walls: UnifiedWallData[] = [];
      const wallSolids: WallSolidImpl[] = [];

      for (let i = 0; i < wallCount; i++) {
        const row = Math.floor(i / 10);
        const col = i % 10;
        
        const wallDef = {
          id: `large_scale_wall_${i}`,
          type: 'Layout' as WallTypeString,
          thickness: 150,
          points: [
            { x: col * 1000, y: row * 1000 },
            { x: col * 1000 + 800, y: row * 1000 + 800 }
          ]
        };

        // Create unified wall
        const unifiedWall = testDataFactory.createTestWall({
          id: wallDef.id,
          type: wallDef.type,
          thickness: wallDef.thickness,
          baselinePoints: wallDef.points,
          includeBIMGeometry: true
        });

        walls.push(unifiedWall);

        // Create wall solid for processing
        const wallSolid = testDataFactory.createTestWallSolid(wallDef.id, wallDef.thickness);
        wallSolids.push(wallSolid);
      }

      expect(walls).toHaveLength(wallCount);
      expect(wallSolids).toHaveLength(wallCount);

      // Step 2: Batch process through BIM pipeline
      const batchProcessingStart = performance.now();

      // Process in batches of 20 for efficiency
      const batchSize = 20;
      const processedWalls: WallSolidImpl[] = [];

      for (let i = 0; i < wallSolids.length; i += batchSize) {
        const batch = wallSolids.slice(i, i + batchSize);
        
        // Apply healing to batch
        const healedBatch: WallSolidImpl[] = [];
        for (const wall of batch) {
          const healingResult = await healingEngine.healShape(wall, 1e-6);
          expect(healingResult.success).toBe(true);
          healedBatch.push(healingResult.healedSolid || wall);
        }

        // Apply simplification to batch
        for (const wall of healedBatch) {
          const simplificationResult = await simplificationEngine.simplifyWallGeometry(
            wall,
            wall.thickness * 0.01
          );
          expect(simplificationResult.success).toBe(true);
          processedWalls.push(simplificationResult.simplifiedSolid);
        }
      }

      const batchProcessingTime = performance.now() - batchProcessingStart;

      // Step 3: Network optimization
      const networkOptimizationStart = performance.now();
      const networkResult = await intersectionResolver.optimizeIntersectionNetwork(processedWalls);
      const networkOptimizationTime = performance.now() - networkOptimizationStart;

      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);
      expect(networkResult.optimizationsApplied).toContain('spatial_indexing');

      // Step 4: Batch database operations
      const dbOperationsStart = performance.now();
      const batchSaveResult = await database.batchSaveWalls(walls);
      const dbOperationsTime = performance.now() - dbOperationsStart;

      expect(batchSaveResult.success).toBe(true);
      expect(batchSaveResult.savedCount).toBe(wallCount);

      // Step 5: Batch validation
      const validationStart = performance.now();
      let validWalls = 0;
      let totalQualityScore = 0;

      for (const wall of processedWalls) {
        const validation = await validator.validateWallSolid(wall);
        if (validation.isValid) {
          validWalls++;
          totalQualityScore += validation.qualityScore;
        }
      }

      const validationTime = performance.now() - validationStart;
      const averageQuality = totalQualityScore / validWalls;

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(batchProcessingTime).toBeLessThan(15000); // Batch processing within 15 seconds
      expect(networkOptimizationTime).toBeLessThan(10000); // Network optimization within 10 seconds
      expect(dbOperationsTime).toBeLessThan(5000); // Database operations within 5 seconds
      expect(validationTime).toBeLessThan(5000); // Validation within 5 seconds

      // Quality assertions
      expect(validWalls).toBe(wallCount); // All walls should be valid
      expect(averageQuality).toBeGreaterThan(0.95); // High average quality

      // Verify scalability metrics
      const timePerWall = totalTime / wallCount;
      expect(timePerWall).toBeLessThan(300); // Less than 300ms per wall on average

      console.log(`Large-scale workflow performance:
        - Total walls: ${wallCount}
        - Total time: ${totalTime.toFixed(2)}ms
        - Time per wall: ${timePerWall.toFixed(2)}ms
        - Average quality: ${averageQuality.toFixed(3)}
        - Network optimization gain: ${networkResult.performanceGain.toFixed(2)}%`);
    });

    test('should handle memory-intensive workflow without leaks', async () => {
      const startTime = performance.now();
      const initialMemory = process.memoryUsage();

      // Step 1: Create memory-intensive walls (high vertex count)
      const complexWalls: WallSolidImpl[] = [];
      const wallCount = 20;
      const verticesPerWall = 500;

      for (let i = 0; i < wallCount; i++) {
        // Create complex curved wall with many vertices
        const points = [];
        for (let j = 0; j < verticesPerWall; j++) {
          const angle = (j / verticesPerWall) * Math.PI * 2;
          const radius = 1000 + Math.sin(angle * 5) * 200;
          points.push({
            x: Math.cos(angle) * radius + i * 3000,
            y: Math.sin(angle) * radius + i * 3000
          });
        }

        const complexWall = testDataFactory.createHighVertexCountWall(verticesPerWall);
        complexWall.id = `memory_test_wall_${i}`;
        complexWalls.push(complexWall);
      }

      const memoryAfterCreation = process.memoryUsage();

      // Step 2: Process through complete pipeline
      const processedWalls: WallSolidImpl[] = [];

      for (const wall of complexWalls) {
        // Apply healing
        const healingResult = await healingEngine.healShape(wall, 1e-6);
        expect(healingResult.success).toBe(true);

        // Apply simplification (should reduce memory usage)
        const simplificationResult = await simplificationEngine.simplifyWallGeometry(
          healingResult.healedSolid || wall,
          wall.thickness * 0.01
        );
        expect(simplificationResult.success).toBe(true);
        expect(simplificationResult.pointsRemoved).toBeGreaterThan(0);

        processedWalls.push(simplificationResult.simplifiedSolid);

        // Force garbage collection periodically
        if (i % 5 === 0 && global.gc) {
          global.gc();
        }
      }

      const memoryAfterProcessing = process.memoryUsage();

      // Step 3: Validate memory usage
      const memoryIncrease = memoryAfterProcessing.heapUsed - initialMemory.heapUsed;
      const memoryPerWall = memoryIncrease / wallCount;

      // Memory usage should be reasonable
      expect(memoryPerWall).toBeLessThan(10 * 1024 * 1024); // Less than 10MB per complex wall

      // Step 4: Verify simplification reduced complexity
      for (let i = 0; i < complexWalls.length; i++) {
        const original = complexWalls[i];
        const processed = processedWalls[i];
        
        expect(processed.baseline.points.length).toBeLessThan(original.baseline.points.length);
        expect(processed.complexity).toBeLessThan(original.complexity);
      }

      // Step 5: Network optimization should handle complex geometry
      const networkResult = await intersectionResolver.optimizeIntersectionNetwork(processedWalls);
      expect(networkResult.performanceGain).toBeGreaterThanOrEqual(0);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Performance should be reasonable even for complex geometry
      expect(totalTime).toBeLessThan(60000); // Within 1 minute

      const finalMemory = process.memoryUsage();
      const finalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory-intensive workflow results:
        - Complex walls: ${wallCount}
        - Vertices per wall: ${verticesPerWall}
        - Total time: ${totalTime.toFixed(2)}ms
        - Memory increase: ${(finalMemoryIncrease / 1024 / 1024).toFixed(2)}MB
        - Memory per wall: ${(memoryPerWall / 1024 / 1024).toFixed(2)}MB
        - Average simplification: ${processedWalls.reduce((sum, w, i) => 
            sum + (1 - w.baseline.points.length / complexWalls[i].baseline.points.length), 0) / wallCount * 100}%`);
    });
  });

  describe('Integration with External Systems', () => {
    test('should integrate with legacy wall system', async () => {
      // Step 1: Create legacy wall data (simulated)
      const legacyWalls = [
        {
          id: 'legacy_wall_1',
          segments: [
            { startX: 0, startY: 0, endX: 3000, endY: 0, thickness: 150 },
            { startX: 3000, startY: 0, endX: 3000, endY: 2000, thickness: 150 }
          ],
          nodes: [
            { id: 'node_1', x: 0, y: 0 },
            { id: 'node_2', x: 3000, y: 0 },
            { id: 'node_3', x: 3000, y: 2000 }
          ]
        }
      ];

      // Step 2: Convert legacy data to BIM format
      const convertedWalls: UnifiedWallData[] = [];

      for (const legacyWall of legacyWalls) {
        // Extract baseline points from segments
        const baselinePoints = [
          { x: legacyWall.segments[0].startX, y: legacyWall.segments[0].startY },
          { x: legacyWall.segments[0].endX, y: legacyWall.segments[0].endY },
          { x: legacyWall.segments[1].endX, y: legacyWall.segments[1].endY }
        ];

        const convertedWall = await bimAdapter.convertLegacyWall(
          {
            id: legacyWall.id,
            type: 'Layout',
            thickness: legacyWall.segments[0].thickness,
            visible: true
          },
          legacyWall.segments.map(s => ({
            id: `${legacyWall.id}_seg_${s.startX}_${s.startY}`,
            startPoint: { x: s.startX, y: s.startY },
            endPoint: { x: s.endX, y: s.endY },
            thickness: s.thickness
          })),
          new Map(legacyWall.nodes.map(n => [n.id, n]))
        );

        expect(convertedWall).toBeDefined();
        expect(convertedWall.id).toBe(legacyWall.id);
        expect(convertedWall.baseline.points).toHaveLength(baselinePoints.length);

        convertedWalls.push(convertedWall);
      }

      // Step 3: Process converted walls through BIM pipeline
      for (const wall of convertedWalls) {
        // Switch to BIM mode
        const wallMap = new Map([[wall.id, wall]]);
        const bimSwitchResult = await modeSwitchingEngine.switchToBIMMode(wallMap);
        expect(bimSwitchResult.success).toBe(true);

        // Validate BIM geometry
        const bimGeometry = wall.bimGeometry;
        expect(bimGeometry).toBeDefined();
        expect(bimGeometry!.wallSolid).toBeDefined();

        const validation = await validator.validateWallSolid(bimGeometry!.wallSolid);
        expect(validation.isValid).toBe(true);
      }

      // Step 4: Convert back to legacy format
      for (const wall of convertedWalls) {
        const legacyFormat = await bimAdapter.convertToLegacyFormat(wall.bimGeometry!.wallSolid);
        
        expect(legacyFormat.wall).toBeDefined();
        expect(legacyFormat.segments).toBeDefined();
        expect(legacyFormat.nodes).toBeDefined();
        expect(legacyFormat.wall.id).toBe(wall.id);
      }

      // Step 5: Verify data integrity throughout conversion
      const originalWall = legacyWalls[0];
      const finalWall = convertedWalls[0];

      expect(finalWall.thickness).toBe(originalWall.segments[0].thickness);
      expect(finalWall.baseline.points).toHaveLength(originalWall.nodes.length);
    });

    test('should handle concurrent multi-user operations', async () => {
      // Simulate multiple users working on the same project
      const userCount = 5;
      const wallsPerUser = 10;
      const allOperations: Promise<any>[] = [];

      // Step 1: Create concurrent user operations
      for (let userId = 0; userId < userCount; userId++) {
        const userOperation = async () => {
          const userWalls: UnifiedWallData[] = [];

          // Each user creates walls
          for (let wallIndex = 0; wallIndex < wallsPerUser; wallIndex++) {
            const wall = testDataFactory.createTestWall({
              id: `user_${userId}_wall_${wallIndex}`,
              type: 'Layout' as WallTypeString,
              thickness: 150,
              baselinePoints: [
                { x: userId * 2000, y: wallIndex * 500 },
                { x: userId * 2000 + 1000, y: wallIndex * 500 + 300 }
              ],
              includeBIMGeometry: true,
              projectId: 'concurrent_test_project'
            });

            userWalls.push(wall);
          }

          // Process walls through BIM pipeline
          for (const wall of userWalls) {
            const validation = await validator.validateWallSolid(wall.bimGeometry!.wallSolid);
            expect(validation.isValid).toBe(true);
          }

          // Save to database (concurrent operations)
          const saveResults = await Promise.all(
            userWalls.map(wall => cachingLayer.saveWall(wall))
          );

          expect(saveResults.every(result => result.success)).toBe(true);

          return { userId, wallCount: userWalls.length };
        };

        allOperations.push(userOperation());
      }

      // Step 2: Execute all operations concurrently
      const startTime = performance.now();
      const results = await Promise.all(allOperations);
      const endTime = performance.now();

      // Step 3: Verify all operations completed successfully
      expect(results).toHaveLength(userCount);
      expect(results.every(result => result.wallCount === wallsPerUser)).toBe(true);

      // Step 4: Verify database consistency
      const allWalls = await database.loadWallsByProject('concurrent_test_project');
      expect(allWalls).toHaveLength(userCount * wallsPerUser);

      // Step 5: Verify no data corruption
      const userWallCounts = new Map<number, number>();
      for (const wall of allWalls) {
        const userId = parseInt(wall.id.split('_')[1]);
        userWallCounts.set(userId, (userWallCounts.get(userId) || 0) + 1);
      }

      for (let userId = 0; userId < userCount; userId++) {
        expect(userWallCounts.get(userId)).toBe(wallsPerUser);
      }

      const totalTime = endTime - startTime;
      console.log(`Concurrent operations completed:
        - Users: ${userCount}
        - Walls per user: ${wallsPerUser}
        - Total walls: ${userCount * wallsPerUser}
        - Total time: ${totalTime.toFixed(2)}ms
        - Average time per user: ${(totalTime / userCount).toFixed(2)}ms`);

      // Concurrent operations should be efficient
      expect(totalTime).toBeLessThan(15000); // Within 15 seconds
    });
  });
});