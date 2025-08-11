/**
 * Visual Reference Tests for BIM Visualization
 * Tests visualization output against reference images/data
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BIMVisualizationEngine } from '../../visualization/BIMVisualizationEngine';
import { QualityColorCoding } from '../../visualization/QualityColorCoding';
import { ToleranceZoneVisualizer } from '../../visualization/ToleranceZoneVisualizer';
import { AdaptiveToleranceManager } from '../../engines/AdaptiveToleranceManager';
import { BIMVisualizationModes } from '../../types/VisualizationTypes';
import type { WallSolid } from '../../geometry/WallSolid';
import type { IntersectionData } from '../../geometry/IntersectionData';
import type { QualityMetrics } from '../../types/QualityMetrics';
import { TestDataFactory } from '../helpers/TestDataFactory';

/**
 * Reference data for visual regression testing
 */
interface VisualReferenceData {
  mode: BIMVisualizationModes;
  graphicsCount: number;
  labelsCount: number;
  expectedColors: string[];
  expectedZIndices: number[];
  keyElements: string[];
}

describe('Visual Reference Tests', () => {
  let engine: BIMVisualizationEngine;
  let colorCoding: QualityColorCoding;
  let toleranceVisualizer: ToleranceZoneVisualizer;
  let testWalls: WallSolid[];
  let testIntersections: IntersectionData[];
  let testQualityMetrics: Map<string, QualityMetrics>;

  beforeEach(() => {
    engine = new BIMVisualizationEngine();
    colorCoding = new QualityColorCoding();
    toleranceVisualizer = new ToleranceZoneVisualizer(new AdaptiveToleranceManager());
    
    // Create consistent test data for reference comparisons
    testWalls = [
      createReferenceWall('ref-wall-1', 100, [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ]),
      createReferenceWall('ref-wall-2', 150, [
        { x: 50, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 150 }
      ])
    ];
    
    testIntersections = [
      createReferenceIntersection('ref-int-1', 't_junction', { x: 100, y: 50 }),
      createReferenceIntersection('ref-int-2', 'l_junction', { x: 100, y: 100 })
    ];
    
    testQualityMetrics = new Map([
      ['ref-wall-1', createReferenceQualityMetrics(0.85, 2)],
      ['ref-wall-2', createReferenceQualityMetrics(0.65, 4)]
    ]);
  });

  describe('Standard Mode Visual Reference', () => {
    it('should match reference data for standard visualization', () => {
      const referenceData: VisualReferenceData = {
        mode: BIMVisualizationModes.STANDARD,
        graphicsCount: 4, // 2 walls × 2 polygons each
        labelsCount: 2,   // 1 label per wall
        expectedColors: ['#2563eb'], // Primary color
        expectedZIndices: [1, 2],
        keyElements: ['wall-ref-wall-1-poly-0', 'wall-ref-wall-2-poly-0', 'wall-label-ref-wall-1']
      };

      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      expect(data.mode).toBe(referenceData.mode);
      expect(data.graphics.length).toBe(referenceData.graphicsCount);
      expect(data.labels.length).toBe(referenceData.labelsCount);
      
      // Check key elements exist
      referenceData.keyElements.forEach(elementId => {
        const hasElement = data.graphics.some(g => g.id === elementId) || 
                          data.labels.some(l => l.id === elementId);
        expect(hasElement).toBe(true);
      });
    });

    it('should maintain consistent polygon structure', () => {
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const polygonGraphics = data.graphics.filter(g => g.type === 'polygon');
      
      polygonGraphics.forEach(polygon => {
        expect(polygon.points.length).toBeGreaterThanOrEqual(3);
        expect(polygon.style.lineWidth).toBe(2); // Default line width
        expect(polygon.style.alpha).toBe(1.0);   // Default opacity
        expect(polygon.zIndex).toBeDefined();
      });
    });

    it('should generate consistent label positioning', () => {
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      data.labels.forEach(label => {
        expect(label.position.x).toBeGreaterThanOrEqual(0);
        expect(label.position.y).toBeGreaterThanOrEqual(0);
        expect(label.anchor.x).toBe(0.5);
        expect(label.anchor.y).toBe(0.5);
        expect(label.style.fontSize).toBe(12);
      });
    });
  });

  describe('Offset Curves Mode Visual Reference', () => {
    it('should match reference data for offset curves visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.OFFSET_CURVES);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const referenceData: VisualReferenceData = {
        mode: BIMVisualizationModes.OFFSET_CURVES,
        graphicsCount: 14, // 2 walls × (baseline + left + right + 3 joins) = 14
        labelsCount: 2,    // Thickness labels
        expectedColors: ['#7c3aed', '#a78bfa', '#c4b5fd'], // Primary, secondary, accent
        expectedZIndices: [2, 3, 4],
        keyElements: ['baseline-ref-wall-1', 'left-offset-ref-wall-1', 'right-offset-ref-wall-1']
      };

      expect(data.mode).toBe(referenceData.mode);
      expect(data.graphics.length).toBe(referenceData.graphicsCount);
      expect(data.labels.length).toBe(referenceData.labelsCount);
      
      // Check for baseline, offset curves, and join points
      const baselineGraphics = data.graphics.filter(g => g.id?.includes('baseline-'));
      const leftOffsetGraphics = data.graphics.filter(g => g.id?.includes('left-offset-'));
      const rightOffsetGraphics = data.graphics.filter(g => g.id?.includes('right-offset-'));
      const joinGraphics = data.graphics.filter(g => g.id?.includes('join-'));
      
      expect(baselineGraphics.length).toBe(2);
      expect(leftOffsetGraphics.length).toBe(2);
      expect(rightOffsetGraphics.length).toBe(2);
      expect(joinGraphics.length).toBeGreaterThan(0);
    });

    it('should use consistent line styles for different curve types', () => {
      engine.setVisualizationMode(BIMVisualizationModes.OFFSET_CURVES);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const baselineGraphics = data.graphics.filter(g => g.id?.includes('baseline-'));
      const offsetGraphics = data.graphics.filter(g => g.id?.includes('offset-'));
      
      // Baseline should have dashed pattern
      baselineGraphics.forEach(baseline => {
        expect(baseline.style.dashPattern).toEqual([5, 5]);
        expect(baseline.style.lineWidth).toBe(3); // 1.5 × default
      });
      
      // Offset curves should be solid
      offsetGraphics.forEach(offset => {
        expect(offset.style.dashPattern).toBeUndefined();
        expect(offset.style.lineWidth).toBe(2); // Default
      });
    });
  });

  describe('Quality Heatmap Mode Visual Reference', () => {
    it('should match reference data for quality heatmap visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.QUALITY_HEATMAP);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const qualityWallGraphics = data.graphics.filter(g => g.id?.includes('quality-wall-'));
      const qualityIssueGraphics = data.graphics.filter(g => g.id?.includes('quality-issue-'));
      const qualityLabels = data.labels.filter(l => l.id?.includes('quality-label-'));
      
      expect(qualityWallGraphics.length).toBeGreaterThanOrEqual(2);
      expect(qualityIssueGraphics.length).toBeGreaterThan(0); // Test data has issues
      expect(qualityLabels.length).toBe(2);
      
      // Check quality-based coloring
      const colors = qualityWallGraphics.map(g => g.style.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(1); // Different quality scores = different colors
    });

    it('should display quality scores as percentages', () => {
      engine.setVisualizationMode(BIMVisualizationModes.QUALITY_HEATMAP);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const qualityLabels = data.labels.filter(l => l.id?.includes('quality-label-'));
      
      qualityLabels.forEach(label => {
        expect(label.text).toMatch(/^\d+%$/); // Should be percentage format
        const percentage = parseInt(label.text.replace('%', ''));
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Intersection Data Mode Visual Reference', () => {
    it('should match reference data for intersection visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.INTERSECTION_DATA);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const intersectionGraphics = data.graphics.filter(g => g.id?.includes('intersection-'));
      const intersectionLabels = data.labels.filter(l => l.id?.includes('intersection-label-'));
      
      expect(intersectionGraphics.length).toBe(testIntersections.length);
      expect(intersectionLabels.length).toBe(testIntersections.length);
      
      // Check intersection point highlighting
      intersectionGraphics.forEach((graphic, index) => {
        expect(graphic.type).toBe('circle');
        expect(graphic.zIndex).toBe(5); // Highest priority
        expect(graphic.style.lineWidth).toBe(3);
        expect(graphic.points[0]).toEqual(testIntersections[index].intersectionPoint);
      });
    });

    it('should show miter apex when available', () => {
      // Add miter apex to test intersection
      testIntersections[0].miterApex = { x: 125, y: 75 };
      
      engine.setVisualizationMode(BIMVisualizationModes.INTERSECTION_DATA);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const miterGraphics = data.graphics.filter(g => g.id?.includes('miter-apex-'));
      const miterLines = data.graphics.filter(g => g.id?.includes('miter-line-'));
      
      expect(miterGraphics.length).toBe(1);
      expect(miterLines.length).toBe(1);
      expect(miterGraphics[0].points[0]).toEqual({ x: 125, y: 75 });
    });
  });

  describe('Tolerance Zones Mode Visual Reference', () => {
    it('should match reference data for tolerance zones visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.TOLERANCE_ZONES);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const toleranceGraphics = data.graphics.filter(g => g.id?.includes('tolerance-zone-'));
      const toleranceLabels = data.labels.filter(l => l.id?.includes('tolerance-label-'));
      
      expect(toleranceGraphics.length).toBeGreaterThan(0);
      expect(toleranceLabels.length).toBeGreaterThan(0);
      
      // Check tolerance zone properties
      toleranceGraphics.forEach(graphic => {
        expect(graphic.type).toBe('circle');
        expect(graphic.style.alpha).toBe(0.5);
        expect(graphic.style.fillAlpha).toBeGreaterThan(0);
      });
    });

    it('should generate consistent tolerance values', () => {
      const zones = toleranceVisualizer.generateToleranceZones(testWalls, testIntersections);
      const stats = toleranceVisualizer.getToleranceStatistics(zones);
      
      expect(stats.totalZones).toBeGreaterThan(0);
      expect(stats.averageTolerance).toBeGreaterThan(0);
      expect(stats.minTolerance).toBeGreaterThan(0);
      expect(stats.maxTolerance).toBeGreaterThanOrEqual(stats.minTolerance);
    });
  });

  describe('Color Consistency Tests', () => {
    it('should maintain consistent color schemes across modes', () => {
      const modes = [
        BIMVisualizationModes.STANDARD,
        BIMVisualizationModes.OFFSET_CURVES,
        BIMVisualizationModes.QUALITY_HEATMAP,
        BIMVisualizationModes.INTERSECTION_DATA
      ];
      
      modes.forEach(mode => {
        engine.setVisualizationMode(mode);
        const config = engine.getConfig();
        
        expect(config.colorScheme.primary).toBeDefined();
        expect(config.colorScheme.secondary).toBeDefined();
        expect(config.colorScheme.accent).toBeDefined();
        expect(config.colorScheme.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('should generate consistent quality color gradients', () => {
      const scores = [0.1, 0.3, 0.5, 0.7, 0.9];
      const colors = scores.map(score => colorCoding.getQualityColor(score));
      
      expect(colors.length).toBe(5);
      expect(new Set(colors).size).toBe(5); // All different colors
      
      // Check specific expected colors
      expect(colors[0]).toBe('#ef4444'); // Critical
      expect(colors[4]).toBe('#10b981'); // Excellent
    });
  });

  describe('Performance Reference Tests', () => {
    it('should generate visualization data within performance thresholds', () => {
      const startTime = performance.now();
      
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(data.graphics.length).toBeGreaterThan(0);
    });

    it('should handle large datasets efficiently', () => {
      // Create larger test dataset
      const largeWallSet = Array.from({ length: 50 }, (_, i) => 
        createReferenceWall(`large-wall-${i}`, 100 + i, [
          { x: i * 10, y: 0 },
          { x: i * 10 + 50, y: 0 },
          { x: i * 10 + 50, y: 50 },
          { x: i * 10, y: 50 }
        ])
      );
      
      const startTime = performance.now();
      const data = engine.generateVisualizationData(largeWallSet, [], new Map());
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should handle 50 walls within 500ms
      expect(data.graphics.length).toBeGreaterThan(50);
    });
  });

  describe('Visual Regression Prevention', () => {
    it('should maintain consistent graphic element structure', () => {
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      data.graphics.forEach(graphic => {
        expect(graphic).toHaveProperty('type');
        expect(graphic).toHaveProperty('points');
        expect(graphic).toHaveProperty('style');
        expect(graphic).toHaveProperty('zIndex');
        expect(graphic).toHaveProperty('interactive');
        
        expect(graphic.style).toHaveProperty('lineWidth');
        expect(graphic.style).toHaveProperty('color');
        expect(graphic.style).toHaveProperty('alpha');
      });
    });

    it('should maintain consistent label structure', () => {
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      data.labels.forEach(label => {
        expect(label).toHaveProperty('text');
        expect(label).toHaveProperty('position');
        expect(label).toHaveProperty('style');
        expect(label).toHaveProperty('anchor');
        expect(label).toHaveProperty('visible');
        
        expect(label.style).toHaveProperty('fontSize');
        expect(label.style).toHaveProperty('fontFamily');
        expect(label.style).toHaveProperty('color');
      });
    });
  });
});

// Helper functions for creating consistent reference data

function createReferenceWall(id: string, thickness: number, points: { x: number; y: number }[]): WallSolid {
  const wall = TestDataFactory.createTestWallSolid(id, thickness);
  wall.baseline.points = points;
  
  // Create consistent offset curves
  wall.leftOffset.points = points.map(p => ({ x: p.x - thickness/2, y: p.y - thickness/2 }));
  wall.rightOffset.points = points.map(p => ({ x: p.x + thickness/2, y: p.y + thickness/2 }));
  
  // Create consistent solid geometry
  wall.solidGeometry = [{
    id: `${id}-poly`,
    outerRing: [
      ...wall.leftOffset.points,
      ...wall.rightOffset.points.reverse()
    ],
    holes: [],
    area: thickness * 100, // Approximate area
    perimeter: thickness * 4,
    centroid: { x: 50, y: 50 },
    boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    isValid: true,
    selfIntersects: false,
    hasSliversFaces: false,
    creationMethod: 'test',
    healingApplied: false,
    simplificationApplied: false
  }];
  
  return wall;
}

function createReferenceIntersection(id: string, type: string, point: { x: number; y: number }): IntersectionData {
  const intersection = TestDataFactory.createTestIntersectionData(id, type as any);
  intersection.intersectionPoint = point;
  intersection.offsetIntersections = [
    { x: point.x - 10, y: point.y - 10 },
    { x: point.x + 10, y: point.y + 10 }
  ];
  return intersection;
}

function createReferenceQualityMetrics(score: number, issueCount: number): QualityMetrics {
  const metrics = TestDataFactory.createTestQualityMetrics(score);
  
  // Add consistent issues for testing
  metrics.issues = Array.from({ length: issueCount }, (_, i) => ({
    type: i % 2 === 0 ? 'sliver_face' : 'micro_gap',
    severity: (i % 4 === 0 ? 'critical' : i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low') as any,
    description: `Reference issue ${i + 1}`,
    location: { x: 25 + i * 10, y: 25 + i * 10 },
    suggestedFix: `Fix issue ${i + 1}`,
    autoFixable: i % 2 === 0
  }));
  
  return metrics;
}