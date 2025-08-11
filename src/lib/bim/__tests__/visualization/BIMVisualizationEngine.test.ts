/**
 * Tests for BIM Visualization Engine
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BIMVisualizationEngine } from '../../visualization/BIMVisualizationEngine';
import { BIMVisualizationModes } from '../../types/VisualizationTypes';
import type { WallSolid } from '../../geometry/WallSolid';
import type { IntersectionData } from '../../geometry/IntersectionData';
import type { QualityMetrics } from '../../types/QualityMetrics';
import { TestDataFactory } from '../helpers/TestDataFactory';

describe('BIMVisualizationEngine', () => {
  let engine: BIMVisualizationEngine;
  let testWalls: WallSolid[];
  let testIntersections: IntersectionData[];
  let testQualityMetrics: Map<string, QualityMetrics>;

  beforeEach(() => {
    engine = new BIMVisualizationEngine();
    testWalls = [
      TestDataFactory.createTestWallSolid('wall1', 100),
      TestDataFactory.createTestWallSolid('wall2', 150)
    ];
    testIntersections = [
      TestDataFactory.createTestIntersectionData({
        id: 'int1',
        type: 't_junction' as any,
        participatingWalls: ['wall1', 'wall2'],
        intersectionPoint: { x: 50, y: 50 }
      })
    ];
    testQualityMetrics = new Map([
      ['wall1', TestDataFactory.createTestQualityMetrics(0.8)],
      ['wall2', TestDataFactory.createTestQualityMetrics(0.6)]
    ]);
  });

  describe('Visualization Mode Management', () => {
    it('should initialize with standard mode', () => {
      expect(engine.getConfig().mode).toBe(BIMVisualizationModes.STANDARD);
    });

    it('should change visualization mode', () => {
      engine.setVisualizationMode(BIMVisualizationModes.OFFSET_CURVES);
      expect(engine.getConfig().mode).toBe(BIMVisualizationModes.OFFSET_CURVES);
    });

    it('should update color scheme when mode changes', () => {
      const initialColor = engine.getConfig().colorScheme.primary;
      engine.setVisualizationMode(BIMVisualizationModes.QUALITY_HEATMAP);
      const newColor = engine.getConfig().colorScheme.primary;
      expect(newColor).not.toBe(initialColor);
    });

    it('should return all available modes', () => {
      const modes = engine.getAvailableModes();
      expect(modes).toContain(BIMVisualizationModes.STANDARD);
      expect(modes).toContain(BIMVisualizationModes.OFFSET_CURVES);
      expect(modes).toContain(BIMVisualizationModes.QUALITY_HEATMAP);
      expect(modes.length).toBe(7);
    });
  });

  describe('Standard Visualization', () => {
    it('should generate standard visualization data', () => {
      engine.setVisualizationMode(BIMVisualizationModes.STANDARD);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      expect(data.mode).toBe(BIMVisualizationModes.STANDARD);
      expect(data.graphics.length).toBeGreaterThan(0);
      expect(data.labels.length).toBeGreaterThan(0);
    });

    it('should create graphics for each wall polygon', () => {
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      // Should have graphics for each wall's solid geometry
      const wallGraphics = data.graphics.filter(g => g.id?.includes('wall-'));
      expect(wallGraphics.length).toBeGreaterThanOrEqual(testWalls.length);
    });

    it('should create labels when enabled', () => {
      engine.updateConfig({ showLabels: true });
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      const wallLabels = data.labels.filter(l => l.id?.includes('wall-label-'));
      expect(wallLabels.length).toBe(testWalls.length);
    });

    it('should not create labels when disabled', () => {
      engine.updateConfig({ showLabels: false });
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);
      
      expect(data.labels.length).toBe(0);
    });
  });

  describe('Offset Curves Visualization', () => {
    it('should generate offset curve visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.OFFSET_CURVES);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      expect(data.mode).toBe(BIMVisualizationModes.OFFSET_CURVES);
      expect(data.graphics.length).toBeGreaterThan(0);
    });

    it('should create baseline, left offset, and right offset graphics', () => {
      engine.setVisualizationMode(BIMVisualizationModes.OFFSET_CURVES);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const baselineGraphics = data.graphics.filter(g => g.id?.includes('baseline-'));
      const leftOffsetGraphics = data.graphics.filter(g => g.id?.includes('left-offset-'));
      const rightOffsetGraphics = data.graphics.filter(g => g.id?.includes('right-offset-'));

      expect(baselineGraphics.length).toBe(testWalls.length);
      expect(leftOffsetGraphics.length).toBe(testWalls.length);
      expect(rightOffsetGraphics.length).toBe(testWalls.length);
    });

    it('should create join point indicators', () => {
      engine.setVisualizationMode(BIMVisualizationModes.OFFSET_CURVES);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const joinGraphics = data.graphics.filter(g => g.id?.includes('join-'));
      expect(joinGraphics.length).toBeGreaterThan(0);
    });

    it('should include thickness labels', () => {
      engine.setVisualizationMode(BIMVisualizationModes.OFFSET_CURVES);
      engine.updateConfig({ showLabels: true });
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const thicknessLabels = data.labels.filter(l => l.id?.includes('thickness-label-'));
      expect(thicknessLabels.length).toBe(testWalls.length);
    });
  });

  describe('Intersection Data Visualization', () => {
    it('should generate intersection visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.INTERSECTION_DATA);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      expect(data.mode).toBe(BIMVisualizationModes.INTERSECTION_DATA);
      expect(data.graphics.length).toBeGreaterThan(0);
    });

    it('should highlight intersection points', () => {
      engine.setVisualizationMode(BIMVisualizationModes.INTERSECTION_DATA);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const intersectionGraphics = data.graphics.filter(g => g.id?.includes('intersection-'));
      expect(intersectionGraphics.length).toBe(testIntersections.length);
    });

    it('should show miter apex when available', () => {
      // Create intersection with miter apex
      const intersectionWithApex = TestDataFactory.createTestIntersectionData('int-apex', 't_junction');
      intersectionWithApex.miterApex = { x: 100, y: 100 };

      engine.setVisualizationMode(BIMVisualizationModes.INTERSECTION_DATA);
      const data = engine.generateVisualizationData(testWalls, [intersectionWithApex], testQualityMetrics);

      const apexGraphics = data.graphics.filter(g => g.id?.includes('miter-apex-'));
      expect(apexGraphics.length).toBe(1);
    });

    it('should include intersection type labels', () => {
      engine.setVisualizationMode(BIMVisualizationModes.INTERSECTION_DATA);
      engine.updateConfig({ showLabels: true });
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const intersectionLabels = data.labels.filter(l => l.id?.includes('intersection-label-'));
      expect(intersectionLabels.length).toBe(testIntersections.length);
    });
  });

  describe('Quality Heatmap Visualization', () => {
    it('should generate quality heatmap visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.QUALITY_HEATMAP);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      expect(data.mode).toBe(BIMVisualizationModes.QUALITY_HEATMAP);
      expect(data.graphics.length).toBeGreaterThan(0);
    });

    it('should color walls based on quality scores', () => {
      engine.setVisualizationMode(BIMVisualizationModes.QUALITY_HEATMAP);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const qualityWallGraphics = data.graphics.filter(g => g.id?.includes('quality-wall-'));
      expect(qualityWallGraphics.length).toBeGreaterThanOrEqual(testWalls.length);

      // Check that different walls have different colors based on quality
      const colors = qualityWallGraphics.map(g => g.style.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(1);
    });

    it('should show quality issues as markers', () => {
      // Add quality issues to test metrics
      const metricsWithIssues = TestDataFactory.createTestQualityMetrics(0.5);
      metricsWithIssues.issues = [
        {
          type: 'sliver_face',
          severity: 'medium' as const,
          description: 'Test issue',
          location: { x: 50, y: 50 },
          suggestedFix: 'Fix it',
          autoFixable: true
        }
      ];
      testQualityMetrics.set('wall1', metricsWithIssues);

      engine.setVisualizationMode(BIMVisualizationModes.QUALITY_HEATMAP);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const issueGraphics = data.graphics.filter(g => g.id?.includes('quality-issue-'));
      expect(issueGraphics.length).toBeGreaterThan(0);
    });

    it('should include quality score labels', () => {
      engine.setVisualizationMode(BIMVisualizationModes.QUALITY_HEATMAP);
      engine.updateConfig({ showLabels: true });
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const qualityLabels = data.labels.filter(l => l.id?.includes('quality-label-'));
      expect(qualityLabels.length).toBe(testWalls.length);
    });
  });

  describe('Tolerance Zones Visualization', () => {
    it('should generate tolerance zone visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.TOLERANCE_ZONES);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      expect(data.mode).toBe(BIMVisualizationModes.TOLERANCE_ZONES);
      expect(data.graphics.length).toBeGreaterThan(0);
    });

    it('should create tolerance zones around key points', () => {
      engine.setVisualizationMode(BIMVisualizationModes.TOLERANCE_ZONES);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const toleranceGraphics = data.graphics.filter(g => g.id?.includes('tolerance-zone-'));
      expect(toleranceGraphics.length).toBeGreaterThan(0);
    });

    it('should include tolerance value labels', () => {
      engine.setVisualizationMode(BIMVisualizationModes.TOLERANCE_ZONES);
      engine.updateConfig({ showLabels: true });
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const toleranceLabels = data.labels.filter(l => l.id?.includes('tolerance-label-'));
      expect(toleranceLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Boolean Preview Visualization', () => {
    it('should generate boolean preview visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.BOOLEAN_PREVIEW);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      expect(data.mode).toBe(BIMVisualizationModes.BOOLEAN_PREVIEW);
      expect(data.graphics.length).toBeGreaterThan(0);
    });

    it('should differentiate walls with different colors', () => {
      engine.setVisualizationMode(BIMVisualizationModes.BOOLEAN_PREVIEW);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const previewGraphics = data.graphics.filter(g => g.id?.includes('boolean-preview-'));
      expect(previewGraphics.length).toBeGreaterThanOrEqual(testWalls.length);

      // Check that walls have different visual properties
      const alphas = previewGraphics.map(g => g.style.alpha);
      const uniqueAlphas = new Set(alphas);
      expect(uniqueAlphas.size).toBeGreaterThan(1);
    });

    it('should include operation labels', () => {
      engine.setVisualizationMode(BIMVisualizationModes.BOOLEAN_PREVIEW);
      engine.updateConfig({ showLabels: true });
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const operationLabels = data.labels.filter(l => l.id?.includes('boolean-label-'));
      expect(operationLabels.length).toBe(testWalls.length);
    });
  });

  describe('Healing Overlay Visualization', () => {
    it('should generate healing overlay visualization', () => {
      engine.setVisualizationMode(BIMVisualizationModes.HEALING_OVERLAY);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      expect(data.mode).toBe(BIMVisualizationModes.HEALING_OVERLAY);
      expect(data.graphics.length).toBeGreaterThan(0);
    });

    it('should show healing indicators for walls with healing history', () => {
      // Add healing history to test wall
      testWalls[0].healingHistory = [
        {
          id: 'heal1',
          type: 'sliver_removal',
          timestamp: new Date(),
          success: true,
          details: 'Removed sliver face'
        }
      ];

      engine.setVisualizationMode(BIMVisualizationModes.HEALING_OVERLAY);
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const healingIndicators = data.graphics.filter(g => g.id?.includes('healing-indicator-'));
      expect(healingIndicators.length).toBeGreaterThan(0);
    });

    it('should include healing status labels', () => {
      // Add healing history to test wall
      testWalls[0].healingHistory = [
        {
          id: 'heal1',
          type: 'sliver_removal',
          timestamp: new Date(),
          success: true,
          details: 'Removed sliver face'
        }
      ];

      engine.setVisualizationMode(BIMVisualizationModes.HEALING_OVERLAY);
      engine.updateConfig({ showLabels: true });
      const data = engine.generateVisualizationData(testWalls, testIntersections, testQualityMetrics);

      const healingLabels = data.labels.filter(l => l.id?.includes('healing-label-'));
      expect(healingLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        opacity: 0.5,
        lineWidth: 3,
        showLabels: false
      };

      engine.updateConfig(newConfig);
      const config = engine.getConfig();

      expect(config.opacity).toBe(0.5);
      expect(config.lineWidth).toBe(3);
      expect(config.showLabels).toBe(false);
    });

    it('should preserve existing config when partially updating', () => {
      const originalMode = engine.getConfig().mode;
      
      engine.updateConfig({ opacity: 0.7 });
      const config = engine.getConfig();

      expect(config.mode).toBe(originalMode);
      expect(config.opacity).toBe(0.7);
    });

    it('should update color scheme when provided', () => {
      const newColorScheme = {
        primary: '#ff0000',
        secondary: '#00ff00',
        accent: '#0000ff',
        warning: '#ffff00',
        error: '#ff00ff',
        success: '#00ffff',
        background: '#ffffff',
        text: '#000000'
      };

      engine.updateConfig({ colorScheme: newColorScheme });
      const config = engine.getConfig();

      expect(config.colorScheme.primary).toBe('#ff0000');
      expect(config.colorScheme.secondary).toBe('#00ff00');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty wall arrays gracefully', () => {
      const data = engine.generateVisualizationData([], [], new Map());
      
      expect(data.graphics.length).toBe(0);
      expect(data.labels.length).toBe(0);
    });

    it('should handle walls without solid geometry', () => {
      const wallWithoutGeometry = TestDataFactory.createTestWallSolid('empty', 100);
      wallWithoutGeometry.solidGeometry = [];

      const data = engine.generateVisualizationData([wallWithoutGeometry], [], new Map());
      
      // Should not crash and should handle gracefully
      expect(data).toBeDefined();
      expect(data.mode).toBe(BIMVisualizationModes.STANDARD);
    });

    it('should handle missing quality metrics', () => {
      engine.setVisualizationMode(BIMVisualizationModes.QUALITY_HEATMAP);
      const data = engine.generateVisualizationData(testWalls, [], new Map());
      
      // Should use default quality scores
      expect(data.graphics.length).toBeGreaterThan(0);
    });
  });
});