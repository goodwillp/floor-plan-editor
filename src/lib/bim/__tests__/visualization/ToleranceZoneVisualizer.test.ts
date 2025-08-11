/**
 * Tests for Tolerance Zone Visualizer
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToleranceZoneVisualizer } from '../../visualization/ToleranceZoneVisualizer';
import { AdaptiveToleranceManager } from '../../engines/AdaptiveToleranceManager';
import type { WallSolid } from '../../geometry/WallSolid';
import type { IntersectionData } from '../../geometry/IntersectionData';
import { TestDataFactory } from '../helpers/TestDataFactory';

describe('ToleranceZoneVisualizer', () => {
  let visualizer: ToleranceZoneVisualizer;
  let toleranceManager: AdaptiveToleranceManager;
  let testWalls: WallSolid[];
  let testIntersections: IntersectionData[];

  beforeEach(() => {
    toleranceManager = new AdaptiveToleranceManager();
    visualizer = new ToleranceZoneVisualizer(toleranceManager, 0.1);
    
    testWalls = [
      TestDataFactory.createTestWallSolid('wall1', 100),
      TestDataFactory.createTestWallSolid('wall2', 150)
    ];
    
    testIntersections = [
      TestDataFactory.createTestIntersectionData('int1', 't_junction'),
      TestDataFactory.createTestIntersectionData('int2', 'l_junction')
    ];
  });

  describe('Tolerance Zone Generation', () => {
    it('should generate tolerance zones for walls and intersections', () => {
      const zones = visualizer.generateToleranceZones(testWalls, testIntersections);
      
      expect(zones.length).toBeGreaterThan(0);
      expect(zones.every(zone => zone.centerPoint)).toBe(true);
      expect(zones.every(zone => zone.radius > 0)).toBe(true);
      expect(zones.every(zone => zone.toleranceValue > 0)).toBe(true);
    });

    it('should create zones for each wall vertex', () => {
      const zones = visualizer.generateToleranceZones(testWalls, []);
      
      // Should have zones for baseline points of both walls
      const vertexZones = zones.filter(zone => zone.context.includes('Vertex merge'));
      expect(vertexZones.length).toBeGreaterThan(0);
      
      // Each wall should contribute vertex zones
      testWalls.forEach(wall => {
        const wallVertexZones = vertexZones.filter(zone => zone.context.includes(wall.id));
        expect(wallVertexZones.length).toBe(wall.baseline.points.length);
      });
    });

    it('should create offset tolerance zones', () => {
      const zones = visualizer.generateToleranceZones(testWalls, []);
      
      const offsetZones = zones.filter(zone => zone.context.includes('Offset tolerance'));
      expect(offsetZones.length).toBeGreaterThan(0);
      
      // Offset zones should be inactive by default
      offsetZones.forEach(zone => {
        expect(zone.isActive).toBe(false);
      });
    });

    it('should create intersection tolerance zones', () => {
      const zones = visualizer.generateToleranceZones([], testIntersections);
      
      const intersectionZones = zones.filter(zone => zone.context.includes('Intersection tolerance'));
      expect(intersectionZones.length).toBe(testIntersections.length);
      
      // Intersection zones should be active
      intersectionZones.forEach(zone => {
        expect(zone.isActive).toBe(true);
      });
    });

    it('should create miter apex zones when available', () => {
      // Add miter apex to test intersection
      testIntersections[0].miterApex = { x: 100, y: 100 };
      
      const zones = visualizer.generateToleranceZones([], testIntersections);
      
      const miterZones = zones.filter(zone => zone.context.includes('Miter apex'));
      expect(miterZones.length).toBe(1);
      expect(miterZones[0].centerPoint.x).toBe(100);
      expect(miterZones[0].centerPoint.y).toBe(100);
    });

    it('should create offset intersection zones', () => {
      // Add offset intersections to test intersection
      testIntersections[0].offsetIntersections = [
        { x: 50, y: 50 },
        { x: 150, y: 150 }
      ];
      
      const zones = visualizer.generateToleranceZones([], testIntersections);
      
      const offsetIntersectionZones = zones.filter(zone => zone.context.includes('Offset intersection'));
      expect(offsetIntersectionZones.length).toBe(2);
      
      // Offset intersection zones should be inactive
      offsetIntersectionZones.forEach(zone => {
        expect(zone.isActive).toBe(false);
      });
    });
  });

  describe('Graphics Data Conversion', () => {
    it('should convert tolerance zones to graphics data', () => {
      const zones = visualizer.generateToleranceZones(testWalls, testIntersections);
      const graphics = visualizer.convertToGraphicsData(zones);
      
      expect(graphics.length).toBeGreaterThan(0);
      expect(graphics.every(g => g.type === 'circle')).toBe(true);
      expect(graphics.every(g => g.points.length === 1)).toBe(true);
    });

    it('should create main tolerance circles', () => {
      const zones = visualizer.generateToleranceZones(testWalls, []);
      const graphics = visualizer.convertToGraphicsData(zones);
      
      const toleranceCircles = graphics.filter(g => g.id?.includes('tolerance-zone-'));
      expect(toleranceCircles.length).toBeGreaterThan(0);
      
      // Active zones should have higher z-index
      const activeCircles = toleranceCircles.filter(g => g.zIndex === 3);
      const inactiveCircles = toleranceCircles.filter(g => g.zIndex === 2);
      expect(activeCircles.length).toBeGreaterThan(0);
      expect(inactiveCircles.length).toBeGreaterThan(0);
    });

    it('should create center point indicators', () => {
      const zones = visualizer.generateToleranceZones(testWalls, []);
      const graphics = visualizer.convertToGraphicsData(zones);
      
      const centerPoints = graphics.filter(g => g.id?.includes('tolerance-center-'));
      expect(centerPoints.length).toBe(zones.length);
      
      // Center points should have highest z-index
      centerPoints.forEach(point => {
        expect(point.zIndex).toBe(4);
      });
    });

    it('should create boundary indicators', () => {
      const zones = visualizer.generateToleranceZones(testWalls, []);
      const graphics = visualizer.convertToGraphicsData(zones);
      
      const boundaryPoints = graphics.filter(g => g.id?.includes('tolerance-boundary-'));
      expect(boundaryPoints.length).toBeGreaterThan(0);
      
      // Should have 4 boundary points per zone (cardinal directions)
      expect(boundaryPoints.length).toBe(zones.length * 4);
    });

    it('should apply different styles for active and inactive zones', () => {
      // Create zones with mixed active states
      const activeZone = {
        centerPoint: { x: 0, y: 0 },
        radius: 5,
        toleranceValue: 0.1,
        context: 'Active zone',
        isActive: true,
        color: '#ff0000'
      };
      
      const inactiveZone = {
        centerPoint: { x: 10, y: 10 },
        radius: 3,
        toleranceValue: 0.05,
        context: 'Inactive zone',
        isActive: false,
        color: '#00ff00'
      };
      
      const graphics = visualizer.convertToGraphicsData([activeZone, inactiveZone]);
      
      const activeGraphics = graphics.filter(g => g.id?.includes('tolerance-zone-0'));
      const inactiveGraphics = graphics.filter(g => g.id?.includes('tolerance-zone-1'));
      
      expect(activeGraphics[0].style.lineWidth).toBeGreaterThan(inactiveGraphics[0].style.lineWidth);
      expect(activeGraphics[0].style.dashPattern).toBeUndefined();
      expect(inactiveGraphics[0].style.dashPattern).toBeDefined();
    });
  });

  describe('Tolerance Calculations', () => {
    it('should calculate different tolerances for different intersection types', () => {
      const tJunction = TestDataFactory.createTestIntersectionData('t', 't_junction');
      const lJunction = TestDataFactory.createTestIntersectionData('l', 'l_junction');
      const crossJunction = TestDataFactory.createTestIntersectionData('cross', 'cross_junction');
      
      const zones = visualizer.generateToleranceZones([], [tJunction, lJunction, crossJunction]);
      
      const tZone = zones.find(z => z.context.includes('t_junction'));
      const lZone = zones.find(z => z.context.includes('l_junction'));
      const crossZone = zones.find(z => z.context.includes('cross_junction'));
      
      expect(tZone?.toleranceValue).toBeDefined();
      expect(lZone?.toleranceValue).toBeDefined();
      expect(crossZone?.toleranceValue).toBeDefined();
      
      // Cross junction should have largest tolerance
      expect(crossZone!.toleranceValue).toBeGreaterThan(tZone!.toleranceValue);
      expect(crossZone!.toleranceValue).toBeGreaterThan(lZone!.toleranceValue);
    });

    it('should scale tolerance with wall thickness', () => {
      const thinWall = TestDataFactory.createTestWallSolid('thin', 50);
      const thickWall = TestDataFactory.createTestWallSolid('thick', 200);
      
      const zones = visualizer.generateToleranceZones([thinWall, thickWall], []);
      
      const thinWallZones = zones.filter(z => z.context.includes(thinWall.id));
      const thickWallZones = zones.filter(z => z.context.includes(thickWall.id));
      
      const avgThinTolerance = thinWallZones.reduce((sum, z) => sum + z.toleranceValue, 0) / thinWallZones.length;
      const avgThickTolerance = thickWallZones.reduce((sum, z) => sum + z.toleranceValue, 0) / thickWallZones.length;
      
      expect(avgThickTolerance).toBeGreaterThan(avgThinTolerance);
    });
  });

  describe('Color Assignment', () => {
    it('should assign different colors for different intersection types', () => {
      const intersections = [
        TestDataFactory.createTestIntersectionData('t', 't_junction'),
        TestDataFactory.createTestIntersectionData('l', 'l_junction'),
        TestDataFactory.createTestIntersectionData('cross', 'cross_junction'),
        TestDataFactory.createTestIntersectionData('parallel', 'parallel_overlap')
      ];
      
      const zones = visualizer.generateToleranceZones([], intersections);
      const intersectionZones = zones.filter(z => z.context.includes('Intersection tolerance'));
      
      const colors = intersectionZones.map(z => z.color);
      const uniqueColors = new Set(colors);
      
      expect(uniqueColors.size).toBe(4); // Should have 4 different colors
    });

    it('should assign colors based on tolerance value for wall zones', () => {
      const zones = visualizer.generateToleranceZones(testWalls, []);
      const wallZones = zones.filter(z => z.context.includes('Vertex merge'));
      
      // All zones should have valid colors
      wallZones.forEach(zone => {
        expect(zone.color).toBeDefined();
        expect(typeof zone.color).toBe('string');
      });
    });
  });

  describe('Settings Management', () => {
    it('should update visualization settings', () => {
      visualizer.updateSettings({
        showActiveZones: false,
        showInactiveZones: true,
        zoneOpacity: 0.8
      });
      
      const zones = visualizer.generateToleranceZones(testWalls, testIntersections);
      const graphics = visualizer.convertToGraphicsData(zones);
      
      // Should only show inactive zones now
      const activeZoneGraphics = graphics.filter(g => g.id?.includes('tolerance-zone-') && g.zIndex === 3);
      expect(activeZoneGraphics.length).toBe(0);
    });

    it('should respect show active zones setting', () => {
      visualizer.updateSettings({ showActiveZones: true, showInactiveZones: false });
      
      const zones = visualizer.generateToleranceZones(testWalls, testIntersections);
      const graphics = visualizer.convertToGraphicsData(zones);
      
      // Should only show active zones
      const inactiveZoneGraphics = graphics.filter(g => g.id?.includes('tolerance-zone-') && g.zIndex === 2);
      expect(inactiveZoneGraphics.length).toBe(0);
    });

    it('should clamp opacity values', () => {
      visualizer.updateSettings({ zoneOpacity: 2.0 }); // Above max
      visualizer.updateSettings({ zoneOpacity: -0.5 }); // Below min
      
      // Should not crash and should handle gracefully
      const zones = visualizer.generateToleranceZones(testWalls, []);
      const graphics = visualizer.convertToGraphicsData(zones);
      
      expect(graphics.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics Generation', () => {
    it('should generate tolerance statistics', () => {
      const zones = visualizer.generateToleranceZones(testWalls, testIntersections);
      const stats = visualizer.getToleranceStatistics(zones);
      
      expect(stats.totalZones).toBe(zones.length);
      expect(stats.activeZones).toBeGreaterThan(0);
      expect(stats.averageTolerance).toBeGreaterThan(0);
      expect(stats.minTolerance).toBeGreaterThan(0);
      expect(stats.maxTolerance).toBeGreaterThanOrEqual(stats.minTolerance);
      expect(stats.toleranceRange).toContain('-');
    });

    it('should count active and inactive zones correctly', () => {
      const zones = visualizer.generateToleranceZones(testWalls, testIntersections);
      const stats = visualizer.getToleranceStatistics(zones);
      
      const actualActiveZones = zones.filter(z => z.isActive).length;
      expect(stats.activeZones).toBe(actualActiveZones);
      expect(stats.totalZones).toBe(zones.length);
    });

    it('should calculate tolerance range correctly', () => {
      const zones = visualizer.generateToleranceZones(testWalls, testIntersections);
      const stats = visualizer.getToleranceStatistics(zones);
      
      const tolerances = zones.map(z => z.toleranceValue);
      const actualMin = Math.min(...tolerances);
      const actualMax = Math.max(...tolerances);
      
      expect(stats.minTolerance).toBe(actualMin);
      expect(stats.maxTolerance).toBe(actualMax);
      expect(stats.toleranceRange).toBe(`${actualMin.toFixed(3)} - ${actualMax.toFixed(3)}`);
    });

    it('should handle empty zones array', () => {
      const stats = visualizer.getToleranceStatistics([]);
      
      expect(stats.totalZones).toBe(0);
      expect(stats.activeZones).toBe(0);
      expect(isNaN(stats.averageTolerance)).toBe(true);
      expect(stats.minTolerance).toBe(Infinity);
      expect(stats.maxTolerance).toBe(-Infinity);
    });
  });

  describe('Edge Cases', () => {
    it('should handle walls without baseline points', () => {
      const emptyWall = TestDataFactory.createTestWallSolid('empty', 100);
      emptyWall.baseline.points = [];
      
      const zones = visualizer.generateToleranceZones([emptyWall], []);
      
      // Should not crash and should handle gracefully
      expect(zones).toBeDefined();
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should handle intersections without offset intersections', () => {
      const intersection = TestDataFactory.createTestIntersectionData('simple', 't_junction');
      intersection.offsetIntersections = [];
      
      const zones = visualizer.generateToleranceZones([], [intersection]);
      
      // Should still create main intersection zone
      const intersectionZones = zones.filter(z => z.context.includes('Intersection tolerance'));
      expect(intersectionZones.length).toBe(1);
    });

    it('should handle very small tolerance values', () => {
      const smallToleranceManager = new AdaptiveToleranceManager();
      const smallVisualizer = new ToleranceZoneVisualizer(smallToleranceManager, 0.001);
      
      const zones = smallVisualizer.generateToleranceZones(testWalls, []);
      
      // Should still generate zones with very small tolerances
      expect(zones.length).toBeGreaterThan(0);
      zones.forEach(zone => {
        expect(zone.toleranceValue).toBeGreaterThan(0);
        expect(zone.radius).toBeGreaterThan(0);
      });
    });

    it('should handle walls with single point baseline', () => {
      const singlePointWall = TestDataFactory.createTestWallSolid('single', 100);
      singlePointWall.baseline.points = [{ x: 0, y: 0 }];
      
      const zones = visualizer.generateToleranceZones([singlePointWall], []);
      
      // Should create one zone for the single point
      const wallZones = zones.filter(z => z.context.includes(singlePointWall.id));
      expect(wallZones.length).toBe(1);
    });
  });
});