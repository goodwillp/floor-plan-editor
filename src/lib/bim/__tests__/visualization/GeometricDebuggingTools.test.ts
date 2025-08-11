/**
 * Tests for Geometric Debugging Tools
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeometricDebuggingTools } from '../../visualization/GeometricDebuggingTools';
import type { WallSolid } from '../../geometry/WallSolid';
import type { IntersectionData } from '../../geometry/IntersectionData';
import type { BooleanResult, ValidationResult } from '../../types/GeometricTypes';
import { TestDataFactory } from '../helpers/TestDataFactory';

describe('GeometricDebuggingTools', () => {
  let debugTools: GeometricDebuggingTools;
  let testWalls: WallSolid[];
  let testIntersection: IntersectionData;
  let testBooleanResult: BooleanResult;
  let testValidationResult: ValidationResult;

  beforeEach(() => {
    debugTools = new GeometricDebuggingTools();
    
    testWalls = [
      TestDataFactory.createTestWallSolid('wall1', 100),
      TestDataFactory.createTestWallSolid('wall2', 150)
    ];
    
    testIntersection = TestDataFactory.createTestIntersectionData({
      id: 'test-intersection',
      type: 't_junction' as any,
      participatingWalls: ['wall1', 'wall2'],
      intersectionPoint: { x: 50, y: 50 },
      miterApex: { x: 60, y: 60 }
    });
    
    testBooleanResult = {
      success: true,
      resultSolid: testWalls[0],
      operationType: 'union',
      processingTime: 25,
      warnings: [],
      requiresHealing: false
    };
    
    testValidationResult = {
      isValid: true,
      errors: [],
      warnings: ['Minor geometry issue'],
      qualityMetrics: TestDataFactory.createTestQualityMetrics(0.9),
      suggestions: ['Consider simplification']
    };
  });

  describe('Debugging State Management', () => {
    it('should initialize with debugging disabled', () => {
      expect(debugTools.isDebuggingActive()).toBe(false);
    });

    it('should enable and disable debugging', () => {
      debugTools.setDebuggingEnabled(true);
      expect(debugTools.isDebuggingActive()).toBe(true);
      
      debugTools.setDebuggingEnabled(false);
      expect(debugTools.isDebuggingActive()).toBe(false);
    });

    it('should manage debug history size', () => {
      const smallDebugTools = new GeometricDebuggingTools(2);
      
      // Add more entries than the limit
      const debugData1 = smallDebugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      const debugData2 = smallDebugTools.createBooleanOperationDebug('intersection', testWalls, testBooleanResult);
      const debugData3 = smallDebugTools.createBooleanOperationDebug('difference', testWalls, testBooleanResult);
      
      const history = smallDebugTools.getDebugHistory();
      expect(history.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Boolean Operation Debugging', () => {
    it('should create boolean operation debug data', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      
      expect(debugData.operationType).toBe('union');
      expect(debugData.inputSolids).toEqual(testWalls);
      expect(debugData.finalResult).toBe(testBooleanResult.resultSolid);
      expect(debugData.success).toBe(true);
      expect(debugData.steps.length).toBeGreaterThan(0);
    });

    it('should include all required debug steps', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      
      const stepNames = debugData.steps.map(step => step.stepName);
      expect(stepNames).toContain('Input Validation');
      expect(stepNames).toContain('Geometry Preparation');
      expect(stepNames).toContain('Boolean Operation');
      expect(stepNames).toContain('Result Validation');
    });

    it('should handle failed boolean operations', () => {
      const failedResult: BooleanResult = {
        success: false,
        resultSolid: null,
        operationType: 'union',
        processingTime: 15,
        warnings: ['Operation failed'],
        requiresHealing: false
      };
      
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, failedResult);
      
      expect(debugData.success).toBe(false);
      expect(debugData.finalResult).toBe(null);
      expect(debugData.errors).toContain('Operation failed');
    });

    it('should create highlighted elements for each step', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      
      debugData.steps.forEach(step => {
        expect(step.highlightedElements).toBeDefined();
        expect(Array.isArray(step.highlightedElements)).toBe(true);
      });
    });
  });

  describe('Intersection Debugging', () => {
    it('should create intersection debug data', () => {
      const debugData = debugTools.createIntersectionDebug(testIntersection, testWalls);
      
      expect(debugData.intersectionId).toBe(testIntersection.id);
      expect(debugData.participatingWalls).toEqual(testIntersection.participatingWalls);
      expect(debugData.finalResult).toBe(testIntersection);
      expect(debugData.calculationSteps.length).toBeGreaterThan(0);
    });

    it('should include baseline intersection step', () => {
      const debugData = debugTools.createIntersectionDebug(testIntersection, testWalls);
      
      const baselineStep = debugData.calculationSteps.find(step => step.stepName === 'Baseline Intersection');
      expect(baselineStep).toBeDefined();
      expect(baselineStep?.outputPoints).toContain(testIntersection.intersectionPoint);
    });

    it('should include offset intersection steps when available', () => {
      const debugData = debugTools.createIntersectionDebug(testIntersection, testWalls);
      
      const offsetStep = debugData.calculationSteps.find(step => step.stepName === 'Offset Intersections');
      expect(offsetStep).toBeDefined();
      expect(offsetStep?.outputPoints).toEqual(testIntersection.offsetIntersections);
    });

    it('should include miter apex step when available', () => {
      const debugData = debugTools.createIntersectionDebug(testIntersection, testWalls);
      
      const miterStep = debugData.calculationSteps.find(step => step.stepName === 'Miter Apex');
      expect(miterStep).toBeDefined();
      expect(miterStep?.outputPoints).toContain(testIntersection.miterApex);
    });

    it('should calculate quality metrics', () => {
      const debugData = debugTools.createIntersectionDebug(testIntersection, testWalls);
      
      expect(debugData.qualityMetrics.accuracy).toBeGreaterThan(0);
      expect(debugData.qualityMetrics.stability).toBeGreaterThan(0);
      expect(debugData.qualityMetrics.convergence).toBeGreaterThan(0);
    });
  });

  describe('Step-by-Step Visualization', () => {
    it('should create step-by-step visualization data', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      const visualization = debugTools.createStepByStepVisualization(debugData, 0);
      
      expect(visualization.operationType).toBe('union');
      expect(visualization.stepIndex).toBe(0);
      expect(visualization.totalSteps).toBe(debugData.steps.length);
      expect(visualization.graphics.length).toBeGreaterThan(0);
      expect(visualization.labels.length).toBeGreaterThan(0);
    });

    it('should include step information labels', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      const visualization = debugTools.createStepByStepVisualization(debugData, 0);
      
      const stepLabel = visualization.labels.find(label => label.id?.includes('step-label'));
      const descriptionLabel = visualization.labels.find(label => label.id?.includes('description-label'));
      
      expect(stepLabel).toBeDefined();
      expect(descriptionLabel).toBeDefined();
      expect(stepLabel?.text).toContain('Step 1');
      expect(descriptionLabel?.text).toBe(debugData.steps[0].description);
    });

    it('should handle different step indices', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      const lastStepIndex = debugData.steps.length - 1;
      const visualization = debugTools.createStepByStepVisualization(debugData, lastStepIndex);
      
      expect(visualization.stepIndex).toBe(lastStepIndex);
      
      const stepLabel = visualization.labels.find(label => label.id?.includes('step-label'));
      expect(stepLabel?.text).toContain(`Step ${lastStepIndex + 1}`);
    });

    it('should include metadata for each visualization', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      const visualization = debugTools.createStepByStepVisualization(debugData, 0);
      
      expect(visualization.metadata).toBeDefined();
      expect(visualization.metadata.operationId).toBeDefined();
      expect(visualization.metadata.timestamp).toBeInstanceOf(Date);
      expect(visualization.metadata.intermediateSteps.length).toBe(debugData.steps.length);
    });
  });

  describe('Intersection Point Highlighting', () => {
    it('should create intersection point highlights', () => {
      const graphics = debugTools.createIntersectionPointHighlighting([testIntersection]);
      
      expect(graphics.length).toBeGreaterThan(0);
      
      // Should have main intersection point
      const mainPoint = graphics.find(g => g.id?.includes('intersection-highlight'));
      expect(mainPoint).toBeDefined();
      expect(mainPoint?.points[0]).toEqual(testIntersection.intersectionPoint);
    });

    it('should highlight miter apex when available', () => {
      const graphics = debugTools.createIntersectionPointHighlighting([testIntersection]);
      
      const miterApex = graphics.find(g => g.id?.includes('miter-apex-highlight'));
      const miterConnection = graphics.find(g => g.id?.includes('miter-connection'));
      
      expect(miterApex).toBeDefined();
      expect(miterConnection).toBeDefined();
      expect(miterApex?.points[0]).toEqual(testIntersection.miterApex);
    });

    it('should highlight offset intersections', () => {
      const graphics = debugTools.createIntersectionPointHighlighting([testIntersection]);
      
      const offsetHighlights = graphics.filter(g => g.id?.includes('offset-intersection'));
      expect(offsetHighlights.length).toBe(testIntersection.offsetIntersections.length);
    });

    it('should handle multiple intersections', () => {
      const intersection2 = TestDataFactory.createTestIntersectionData({
        id: 'test-intersection-2',
        type: 'l_junction' as any,
        participatingWalls: ['wall2', 'wall3'],
        intersectionPoint: { x: 100, y: 100 }
      });
      
      const graphics = debugTools.createIntersectionPointHighlighting([testIntersection, intersection2]);
      
      const intersection1Graphics = graphics.filter(g => g.id?.includes(testIntersection.id));
      const intersection2Graphics = graphics.filter(g => g.id?.includes(intersection2.id));
      
      expect(intersection1Graphics.length).toBeGreaterThan(0);
      expect(intersection2Graphics.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Visualization', () => {
    it('should create validation visualization for valid geometry', () => {
      const graphics = debugTools.createValidationVisualization(testValidationResult, testWalls[0]);
      
      expect(graphics.length).toBeGreaterThan(0);
      
      // Should use green color for valid geometry
      const wallGraphics = graphics.filter(g => g.id?.includes('validation-wall'));
      expect(wallGraphics.length).toBeGreaterThan(0);
      expect(wallGraphics[0].style.color).toBe('#00ff00');
    });

    it('should create validation visualization for invalid geometry', () => {
      const invalidResult: ValidationResult = {
        isValid: false,
        errors: ['Self-intersection detected', 'Invalid topology'],
        warnings: [],
        qualityMetrics: TestDataFactory.createTestQualityMetrics(0.3),
        suggestions: ['Fix self-intersection']
      };
      
      const graphics = debugTools.createValidationVisualization(invalidResult, testWalls[0]);
      
      // Should use red color for invalid geometry
      const wallGraphics = graphics.filter(g => g.id?.includes('validation-wall'));
      expect(wallGraphics[0].style.color).toBe('#ff0000');
      
      // Should have error markers
      const errorMarkers = graphics.filter(g => g.id?.includes('validation-error'));
      expect(errorMarkers.length).toBe(invalidResult.errors.length);
    });

    it('should create warning markers', () => {
      const graphics = debugTools.createValidationVisualization(testValidationResult, testWalls[0]);
      
      const warningMarkers = graphics.filter(g => g.id?.includes('validation-warning'));
      expect(warningMarkers.length).toBe(testValidationResult.warnings.length);
      expect(warningMarkers[0].style.color).toBe('#ffaa00');
    });

    it('should position markers correctly', () => {
      const graphics = debugTools.createValidationVisualization(testValidationResult, testWalls[0]);
      
      graphics.forEach(graphic => {
        expect(graphic.points.length).toBeGreaterThan(0);
        expect(graphic.points[0].x).toBeGreaterThanOrEqual(0);
        expect(graphic.points[0].y).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Debug History Management', () => {
    it('should store and retrieve debug history', () => {
      debugTools.setDebuggingEnabled(true);
      debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      
      const history = debugTools.getDebugHistory();
      expect(history.length).toBe(1);
      expect(history[0].inputData).toEqual(testWalls);
    });

    it('should retrieve specific operation history', () => {
      debugTools.setDebuggingEnabled(true);
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      
      // Get the stored operation ID from history
      const allHistory = debugTools.getDebugHistory();
      expect(allHistory.length).toBe(1);
      const operationId = allHistory[0].operationId;
      
      const specificHistory = debugTools.getDebugHistory(operationId);
      expect(specificHistory.length).toBe(1);
      expect(specificHistory[0].operationId).toBe(operationId);
    });

    it('should clear debug history', () => {
      debugTools.setDebuggingEnabled(true);
      debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      expect(debugTools.getDebugHistory().length).toBe(1);
      
      debugTools.clearDebugHistory();
      expect(debugTools.getDebugHistory().length).toBe(0);
    });

    it('should return empty array for non-existent operation', () => {
      const history = debugTools.getDebugHistory('non-existent-id');
      expect(history).toEqual([]);
    });
  });

  describe('Debug Statistics', () => {
    it('should calculate debug statistics', () => {
      // Create some debug operations
      debugTools.setDebuggingEnabled(true);
      debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      debugTools.createBooleanOperationDebug('intersection', testWalls, testBooleanResult);
      
      const stats = debugTools.getDebugStatistics();
      
      expect(stats.totalOperations).toBe(2);
      expect(stats.successfulOperations).toBe(2);
      expect(stats.failedOperations).toBe(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should handle failed operations in statistics', () => {
      const failedResult: BooleanResult = {
        success: false,
        resultSolid: null,
        operationType: 'union',
        processingTime: 10,
        warnings: ['Failed'],
        requiresHealing: false
      };
      
      debugTools.setDebuggingEnabled(true);
      debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      debugTools.createBooleanOperationDebug('union', testWalls, failedResult);
      
      const stats = debugTools.getDebugStatistics();
      
      expect(stats.totalOperations).toBe(2);
      expect(stats.successfulOperations).toBe(1);
      expect(stats.failedOperations).toBe(1);
    });

    it('should handle empty history in statistics', () => {
      const stats = debugTools.getDebugStatistics();
      
      expect(stats.totalOperations).toBe(0);
      expect(stats.successfulOperations).toBe(0);
      expect(stats.failedOperations).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
    });
  });

  describe('Visual Element Conversion', () => {
    it('should convert debug elements to graphics data', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      const visualization = debugTools.createStepByStepVisualization(debugData, 0);
      
      visualization.graphics.forEach(graphic => {
        expect(graphic.type).toBeDefined();
        expect(graphic.points).toBeDefined();
        expect(graphic.style).toBeDefined();
        expect(graphic.zIndex).toBeDefined();
        expect(graphic.id).toBeDefined();
      });
    });

    it('should create appropriate labels for debug elements', () => {
      const debugData = debugTools.createBooleanOperationDebug('union', testWalls, testBooleanResult);
      const visualization = debugTools.createStepByStepVisualization(debugData, 0);
      
      visualization.labels.forEach(label => {
        expect(label.text).toBeDefined();
        expect(label.position).toBeDefined();
        expect(label.style).toBeDefined();
        expect(label.anchor).toBeDefined();
        expect(label.id).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle walls without solid geometry', () => {
      const emptyWall = TestDataFactory.createTestWallSolid('empty', 100);
      emptyWall.solidGeometry = [];
      
      const debugData = debugTools.createBooleanOperationDebug('union', [emptyWall], testBooleanResult);
      
      expect(debugData).toBeDefined();
      expect(debugData.steps.length).toBeGreaterThan(0);
    });

    it('should handle intersections without miter apex', () => {
      const simpleIntersection = TestDataFactory.createTestIntersectionData({
        id: 'simple',
        type: 't_junction' as any,
        participatingWalls: ['wall1', 'wall2'],
        intersectionPoint: { x: 50, y: 50 }
      });
      simpleIntersection.miterApex = null;
      
      const debugData = debugTools.createIntersectionDebug(simpleIntersection, testWalls);
      
      expect(debugData).toBeDefined();
      expect(debugData.calculationSteps.length).toBeGreaterThan(0);
    });

    it('should handle empty intersection arrays', () => {
      const graphics = debugTools.createIntersectionPointHighlighting([]);
      expect(graphics).toEqual([]);
    });
  });
});