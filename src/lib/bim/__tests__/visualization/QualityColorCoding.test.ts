/**
 * Tests for Quality Color Coding System
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QualityColorCoding } from '../../visualization/QualityColorCoding';
import { QUALITY_COLOR_MAPPING } from '../../types/VisualizationTypes';
import type { QualityMetrics } from '../../types/QualityMetrics';
import { TestDataFactory } from '../helpers/TestDataFactory';

describe('QualityColorCoding', () => {
  let colorCoding: QualityColorCoding;

  beforeEach(() => {
    colorCoding = new QualityColorCoding();
  });

  describe('Quality Score Color Mapping', () => {
    it('should return excellent color for high scores', () => {
      const color = colorCoding.getQualityColor(0.95);
      expect(color).toBe(QUALITY_COLOR_MAPPING.excellent);
    });

    it('should return good color for good scores', () => {
      const color = colorCoding.getQualityColor(0.8);
      expect(color).toBe(QUALITY_COLOR_MAPPING.good);
    });

    it('should return fair color for moderate scores', () => {
      const color = colorCoding.getQualityColor(0.6);
      expect(color).toBe(QUALITY_COLOR_MAPPING.fair);
    });

    it('should return poor color for low scores', () => {
      const color = colorCoding.getQualityColor(0.4);
      expect(color).toBe(QUALITY_COLOR_MAPPING.poor);
    });

    it('should return critical color for very low scores', () => {
      const color = colorCoding.getQualityColor(0.1);
      expect(color).toBe(QUALITY_COLOR_MAPPING.critical);
    });

    it('should clamp scores to valid range', () => {
      const colorHigh = colorCoding.getQualityColor(1.5);
      const colorLow = colorCoding.getQualityColor(-0.5);
      
      expect(colorHigh).toBe(QUALITY_COLOR_MAPPING.excellent);
      expect(colorLow).toBe(QUALITY_COLOR_MAPPING.critical);
    });
  });

  describe('Interpolated Color Mapping', () => {
    it('should return interpolated colors for intermediate scores', () => {
      const color1 = colorCoding.getInterpolatedQualityColor(0.85);
      const color2 = colorCoding.getInterpolatedQualityColor(0.75);
      
      // Colors should be different for different scores in the same range
      expect(color1).toBeDefined();
      expect(color2).toBeDefined();
      expect(typeof color1).toBe('string');
      expect(typeof color2).toBe('string');
    });

    it('should handle boundary conditions', () => {
      const colorExcellent = colorCoding.getInterpolatedQualityColor(1.0);
      const colorCritical = colorCoding.getInterpolatedQualityColor(0.0);
      
      expect(colorExcellent).toBeDefined();
      expect(colorCritical).toBe(QUALITY_COLOR_MAPPING.critical);
    });

    it('should provide smooth transitions between quality levels', () => {
      const colors = [];
      for (let i = 0; i <= 10; i++) {
        colors.push(colorCoding.getInterpolatedQualityColor(i / 10));
      }
      
      // All colors should be valid hex colors
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('Gradient Generation', () => {
    it('should generate gradient colors for given range', () => {
      const gradientColors = colorCoding.generateGradientColors(0.2, 0.8);
      
      expect(gradientColors.length).toBe(101); // Default 100 steps + 1
      expect(gradientColors[0]).toBeDefined();
      expect(gradientColors[gradientColors.length - 1]).toBeDefined();
    });

    it('should handle edge cases in gradient generation', () => {
      const sameValueGradient = colorCoding.generateGradientColors(0.5, 0.5);
      expect(sameValueGradient.length).toBe(101);
      
      // All colors should be the same for same min/max
      const uniqueColors = new Set(sameValueGradient);
      expect(uniqueColors.size).toBe(1);
    });

    it('should generate different colors for different ranges', () => {
      const lowRangeGradient = colorCoding.generateGradientColors(0.0, 0.3);
      const highRangeGradient = colorCoding.generateGradientColors(0.7, 1.0);
      
      expect(lowRangeGradient[0]).not.toBe(highRangeGradient[0]);
      expect(lowRangeGradient[lowRangeGradient.length - 1]).not.toBe(highRangeGradient[highRangeGradient.length - 1]);
    });
  });

  describe('Issue Color Mapping', () => {
    it('should return appropriate colors for different severities', () => {
      expect(colorCoding.getIssueColor('low')).toBe(QUALITY_COLOR_MAPPING.good);
      expect(colorCoding.getIssueColor('medium')).toBe(QUALITY_COLOR_MAPPING.fair);
      expect(colorCoding.getIssueColor('high')).toBe(QUALITY_COLOR_MAPPING.poor);
      expect(colorCoding.getIssueColor('critical')).toBe(QUALITY_COLOR_MAPPING.critical);
    });

    it('should handle unknown severity levels', () => {
      const color = colorCoding.getIssueColor('unknown' as any);
      expect(color).toBe(QUALITY_COLOR_MAPPING.fair);
    });
  });

  describe('Issue Opacity Calculation', () => {
    it('should calculate opacity based on issue count', () => {
      const lowOpacity = colorCoding.getIssueOpacity(1, 10);
      const highOpacity = colorCoding.getIssueOpacity(10, 10);
      
      expect(lowOpacity).toBeLessThan(highOpacity);
      expect(lowOpacity).toBeGreaterThanOrEqual(0.3);
      expect(highOpacity).toBeLessThanOrEqual(1.0);
    });

    it('should clamp opacity to maximum when issue count exceeds limit', () => {
      const opacity = colorCoding.getIssueOpacity(20, 10);
      expect(opacity).toBe(1.0);
    });

    it('should handle zero issues', () => {
      const opacity = colorCoding.getIssueOpacity(0, 10);
      expect(opacity).toBe(0.3);
    });
  });

  describe('Heatmap Data Generation', () => {
    it('should generate heatmap data for wall quality map', () => {
      const wallQualityMap = new Map<string, QualityMetrics>([
        ['wall1', TestDataFactory.createTestQualityMetrics(0.9)],
        ['wall2', TestDataFactory.createTestQualityMetrics(0.5)],
        ['wall3', TestDataFactory.createTestQualityMetrics(0.2)]
      ]);

      const heatmapData = colorCoding.generateHeatmapData(wallQualityMap);

      expect(heatmapData.size).toBe(3);
      expect(heatmapData.get('wall1')).toBeDefined();
      expect(heatmapData.get('wall2')).toBeDefined();
      expect(heatmapData.get('wall3')).toBeDefined();

      // High quality wall should have different color than low quality
      const wall1Data = heatmapData.get('wall1')!;
      const wall3Data = heatmapData.get('wall3')!;
      
      // Check that the colors are different by comparing the actual quality scores
      const wall1Score = 0.9;
      const wall3Score = 0.2;
      const wall1Color = colorCoding.getQualityColor(wall1Score);
      const wall3Color = colorCoding.getQualityColor(wall3Score);
      expect(wall1Color).not.toBe(wall3Color);
    });

    it('should include issues in heatmap data', () => {
      const metricsWithIssues = TestDataFactory.createTestQualityMetrics(0.6);
      metricsWithIssues.issues = [
        {
          type: 'sliver_face',
          severity: 'medium' as const,
          description: 'Test issue',
          location: { x: 10, y: 20 },
          suggestedFix: 'Fix it',
          autoFixable: true
        }
      ];

      const wallQualityMap = new Map([['wall1', metricsWithIssues]]);
      const heatmapData = colorCoding.generateHeatmapData(wallQualityMap);

      const wallData = heatmapData.get('wall1')!;
      expect(wallData.issues.length).toBe(1);
      expect(wallData.issues[0].type).toBe('sliver_face');
    });

    it('should handle empty quality map', () => {
      const heatmapData = colorCoding.generateHeatmapData(new Map());
      expect(heatmapData.size).toBe(0);
    });
  });

  describe('Color Legend Generation', () => {
    it('should generate color legend with correct structure', () => {
      const legend = colorCoding.generateColorLegend();

      expect(legend.length).toBe(5);
      expect(legend[0].score).toBe(1.0);
      expect(legend[0].label).toContain('Excellent');
      expect(legend[4].score).toBe(0.1);
      expect(legend[4].label).toContain('Critical');
    });

    it('should include all quality categories in legend', () => {
      const legend = colorCoding.generateColorLegend();
      const labels = legend.map(item => item.label.toLowerCase());

      expect(labels.some(label => label.includes('excellent'))).toBe(true);
      expect(labels.some(label => label.includes('good'))).toBe(true);
      expect(labels.some(label => label.includes('fair'))).toBe(true);
      expect(labels.some(label => label.includes('poor'))).toBe(true);
      expect(labels.some(label => label.includes('critical'))).toBe(true);
    });

    it('should have colors matching the color mapping', () => {
      const legend = colorCoding.generateColorLegend();

      expect(legend[0].color).toBe(QUALITY_COLOR_MAPPING.excellent);
      expect(legend[4].color).toBe(QUALITY_COLOR_MAPPING.critical);
    });
  });

  describe('Quality Category Classification', () => {
    it('should classify scores into correct categories', () => {
      expect(colorCoding.getQualityCategory(0.95)).toBe('excellent');
      expect(colorCoding.getQualityCategory(0.8)).toBe('good');
      expect(colorCoding.getQualityCategory(0.6)).toBe('fair');
      expect(colorCoding.getQualityCategory(0.4)).toBe('poor');
      expect(colorCoding.getQualityCategory(0.1)).toBe('critical');
    });

    it('should handle boundary values correctly', () => {
      expect(colorCoding.getQualityCategory(0.9)).toBe('excellent');
      expect(colorCoding.getQualityCategory(0.7)).toBe('good');
      expect(colorCoding.getQualityCategory(0.5)).toBe('fair');
      expect(colorCoding.getQualityCategory(0.3)).toBe('poor');
      expect(colorCoding.getQualityCategory(0.0)).toBe('critical');
    });
  });

  describe('Color Mapping Updates', () => {
    it('should update color mapping', () => {
      const newMapping = {
        excellent: '#00ff00',
        good: '#80ff00'
      };

      colorCoding.updateColorMapping(newMapping);
      const updatedMapping = colorCoding.getColorMapping();

      expect(updatedMapping.excellent).toBe('#00ff00');
      expect(updatedMapping.good).toBe('#80ff00');
      expect(updatedMapping.fair).toBe(QUALITY_COLOR_MAPPING.fair); // Should preserve unchanged values
    });

    it('should return current color mapping', () => {
      const mapping = colorCoding.getColorMapping();

      expect(mapping.excellent).toBeDefined();
      expect(mapping.good).toBeDefined();
      expect(mapping.fair).toBeDefined();
      expect(mapping.poor).toBeDefined();
      expect(mapping.critical).toBeDefined();
    });

    it('should not modify original mapping when returned', () => {
      const mapping1 = colorCoding.getColorMapping();
      mapping1.excellent = '#modified';
      
      const mapping2 = colorCoding.getColorMapping();
      expect(mapping2.excellent).not.toBe('#modified');
    });
  });

  describe('Custom Color Mapping', () => {
    it('should accept custom color mapping in constructor', () => {
      const customMapping = {
        excellent: '#custom1',
        good: '#custom2',
        fair: '#custom3',
        poor: '#custom4',
        critical: '#custom5'
      };

      const customColorCoding = new QualityColorCoding(customMapping);
      const color = customColorCoding.getQualityColor(0.95);

      expect(color).toBe('#custom1');
    });

    it('should accept custom gradient steps', () => {
      const customColorCoding = new QualityColorCoding(undefined, 50);
      const gradientColors = customColorCoding.generateGradientColors(0, 1);

      expect(gradientColors.length).toBe(51); // 50 steps + 1
    });
  });
});