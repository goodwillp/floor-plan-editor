/**
 * Unit tests for GeometryValidator
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { GeometryValidator } from '../../validation/GeometryValidator';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { CurveImpl } from '../../geometry/Curve';
import { BIMPointImpl } from '../../geometry/BIMPoint';
import { BIMPolygonImpl } from '../../geometry/BIMPolygon';
import { CurveType } from '../../types/BIMTypes';

describe('GeometryValidator', () => {
  let validator: GeometryValidator;

  beforeEach(() => {
    validator = new GeometryValidator();
  });

  test('should create with default options', () => {
    const v = new GeometryValidator();
    expect(v).toBeDefined();
  });

  test('should validate a simple wall solid', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0),
      new BIMPointImpl(10, 10),
      new BIMPointImpl(0, 10)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);
    const wallSolid = new WallSolidImpl(baseline, 200, 'layout');

    const result = validator.validateWallSolid(wallSolid);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.qualityMetrics).toBeDefined();
    expect(result.qualityMetrics.geometricAccuracy).toBeGreaterThan(0);
  });

  test('should detect invalid baseline', () => {
    const points = [new BIMPointImpl(0, 0)]; // Only one point
    const baseline = new CurveImpl(points, CurveType.POLYLINE);
    const wallSolid = new WallSolidImpl(baseline, 200, 'layout');

    const result = validator.validateWallSolid(wallSolid);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(error => error.includes('baseline'))).toBe(true);
  });

  test('should detect invalid thickness', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);
    const wallSolid = new WallSolidImpl(baseline, -100, 'layout'); // Negative thickness

    const result = validator.validateWallSolid(wallSolid);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('thickness'))).toBe(true);
  });

  test('should warn about unusually large thickness', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);
    const wallSolid = new WallSolidImpl(baseline, 1500, 'layout'); // Very thick wall

    const result = validator.validateWallSolid(wallSolid);

    expect(result.warnings.some(warning => warning.includes('thickness'))).toBe(true);
  });

  test('should validate curve geometry', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0),
      new BIMPointImpl(20, 0)
    ];
    const curve = new CurveImpl(points, CurveType.POLYLINE);

    const result = validator.validateCurve(curve);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should detect curve with insufficient points', () => {
    const points = [new BIMPointImpl(0, 0)];
    const curve = new CurveImpl(points, CurveType.POLYLINE);

    const result = validator.validateCurve(curve);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('2 points'))).toBe(true);
  });

  test('should detect duplicate consecutive points', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(0, 0), // Duplicate
      new BIMPointImpl(10, 0)
    ];
    const curve = new CurveImpl(points, CurveType.POLYLINE);

    const result = validator.validateCurve(curve);

    expect(result.warnings.some(warning => warning.includes('Duplicate'))).toBe(true);
  });

  test('should detect zero-length segments', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(0.0000001, 0), // Very close point
      new BIMPointImpl(10, 0)
    ];
    const curve = new CurveImpl(points, CurveType.POLYLINE);

    const result = validator.validateCurve(curve);

    expect(result.warnings.some(warning => warning.includes('zero-length'))).toBe(true);
  });

  test('should validate wall network', () => {
    const wall1Points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const wall1Baseline = new CurveImpl(wall1Points, CurveType.POLYLINE);
    const wall1 = new WallSolidImpl(wall1Baseline, 200, 'layout');

    const wall2Points = [
      new BIMPointImpl(10, 0),
      new BIMPointImpl(10, 10)
    ];
    const wall2Baseline = new CurveImpl(wall2Points, CurveType.POLYLINE);
    const wall2 = new WallSolidImpl(wall2Baseline, 200, 'layout');

    const result = validator.validateWallNetwork([wall1, wall2]);

    expect(result.wallResults.size).toBe(2);
    expect(result.overallQuality).toBeDefined();
  });

  test('should detect isolated walls in network', () => {
    const wall1Points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const wall1Baseline = new CurveImpl(wall1Points, CurveType.POLYLINE);
    const wall1 = new WallSolidImpl(wall1Baseline, 200, 'layout');

    const wall2Points = [
      new BIMPointImpl(20, 20), // Isolated wall
      new BIMPointImpl(30, 20)
    ];
    const wall2Baseline = new CurveImpl(wall2Points, CurveType.POLYLINE);
    const wall2 = new WallSolidImpl(wall2Baseline, 200, 'layout');

    const result = validator.validateWallNetwork([wall1, wall2]);

    expect(result.networkIssues.some(issue => issue.message.includes('isolated'))).toBe(true);
  });

  test('should add custom validation rule', () => {
    const customRule = {
      name: 'custom_test_rule',
      description: 'Test rule',
      validate: () => [{
        rule: 'custom_test_rule',
        severity: 'warning' as const,
        message: 'Custom test warning',
        suggestion: 'Fix the custom issue',
        autoFixable: false
      }],
      severity: 'warning' as const,
      category: 'test'
    };

    validator.addValidationRule(customRule);

    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);
    const wallSolid = new WallSolidImpl(baseline, 200, 'layout');

    const result = validator.validateWallSolid(wallSolid);

    expect(result.warnings.some(warning => warning.includes('Custom test warning'))).toBe(true);
  });

  test('should remove validation rule', () => {
    const customRule = {
      name: 'removable_rule',
      description: 'Removable rule',
      validate: () => [{
        rule: 'removable_rule',
        severity: 'error' as const,
        message: 'This should be removed',
        suggestion: 'Remove this rule',
        autoFixable: false
      }],
      severity: 'error' as const,
      category: 'test'
    };

    validator.addValidationRule(customRule);
    const removed = validator.removeValidationRule('removable_rule');

    expect(removed).toBe(true);

    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);
    const wallSolid = new WallSolidImpl(baseline, 200, 'layout');

    const result = validator.validateWallSolid(wallSolid);

    expect(result.errors.some(error => error.includes('This should be removed'))).toBe(false);
  });

  test('should get validation rules', () => {
    const rules = validator.getValidationRules();
    
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]).toHaveProperty('name');
    expect(rules[0]).toHaveProperty('description');
    expect(rules[0]).toHaveProperty('validate');
  });

  test('should calculate quality metrics', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0),
      new BIMPointImpl(10, 10),
      new BIMPointImpl(0, 10)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);
    const wallSolid = new WallSolidImpl(baseline, 200, 'layout');

    const result = validator.validateWallSolid(wallSolid);

    expect(result.qualityMetrics.geometricAccuracy).toBeGreaterThanOrEqual(0);
    expect(result.qualityMetrics.geometricAccuracy).toBeLessThanOrEqual(1);
    expect(result.qualityMetrics.topologicalConsistency).toBeGreaterThanOrEqual(0);
    expect(result.qualityMetrics.topologicalConsistency).toBeLessThanOrEqual(1);
    expect(result.qualityMetrics.complexity).toBeGreaterThanOrEqual(0);
  });

  test('should provide suggestions', () => {
    const points = [new BIMPointImpl(0, 0)]; // Invalid baseline
    const baseline = new CurveImpl(points, CurveType.POLYLINE);
    const wallSolid = new WallSolidImpl(baseline, -100, 'layout'); // Invalid thickness

    const result = validator.validateWallSolid(wallSolid);

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  test('should handle empty wall network', () => {
    const result = validator.validateWallNetwork([]);

    expect(result.isValid).toBe(true);
    expect(result.wallResults.size).toBe(0);
    expect(result.networkIssues).toHaveLength(0);
  });

  test('should validate intersection data', () => {
    const intersection = {
      id: 'test-intersection',
      type: 't_junction',
      participatingWalls: ['wall1', 'wall2'],
      intersectionPoint: { x: 10, y: 10 },
      miterApex: { x: 10, y: 10 },
      offsetIntersections: [{ x: 10, y: 10 }],
      resolvedGeometry: new BIMPolygonImpl([
        new BIMPointImpl(9, 9),
        new BIMPointImpl(11, 9),
        new BIMPointImpl(11, 11),
        new BIMPointImpl(9, 11)
      ]),
      resolutionMethod: 'miter',
      geometricAccuracy: 0.95,
      validated: true
    };

    const result = validator.validateIntersection(intersection);

    expect(result.isValid).toBe(true);
    expect(result.qualityMetrics.geometricAccuracy).toBe(0.95);
  });

  test('should detect missing intersection data', () => {
    const intersection = {
      id: 'incomplete-intersection',
      type: 't_junction',
      participatingWalls: ['wall1', 'wall2'],
      // Missing intersectionPoint and resolvedGeometry
      miterApex: null,
      offsetIntersections: [],
      resolutionMethod: 'none',
      geometricAccuracy: 0.5,
      validated: false
    };

    const result = validator.validateIntersection(intersection);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // New tests for enhanced validation and repair functionality
  describe('Enhanced Validation and Repair', () => {
    test('should validate topology consistency', () => {
      const points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      const polygon = new BIMPolygonImpl(points);
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');
      const wallWithGeometry = wallSolid.withUpdates({ solidGeometry: [polygon] });

      const result = validator.validateTopology(wallWithGeometry);

      expect(result.isValid).toBe(true);
      expect(result.connectivity).toBeDefined();
      expect(result.consistency).toBeDefined();
      expect(result.connectivity.connectedComponents).toBeGreaterThanOrEqual(0);
      expect(result.consistency.orientationConsistent).toBeDefined();
    });

    test('should detect invalid polygon topology', () => {
      const points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      
      // Create polygon with invalid hole (only 2 points)
      const invalidHole = [
        new BIMPointImpl(2, 2),
        new BIMPointImpl(8, 2)
      ];
      const polygonWithInvalidHole = new BIMPolygonImpl(points, [invalidHole]);
      
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');
      const wallWithInvalidGeometry = wallSolid.withUpdates({ solidGeometry: [polygonWithInvalidHole] });

      const result = validator.validateTopology(wallWithInvalidGeometry);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.message.includes('insufficient vertices'))).toBe(true);
    });

    test('should repair invalid geometry automatically', () => {
      const points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      
      // Create polygon with invalid hole
      const invalidHole = [
        new BIMPointImpl(2, 2),
        new BIMPointImpl(8, 2) // Only 2 points - invalid
      ];
      const polygonWithInvalidHole = new BIMPolygonImpl(points, [invalidHole]);
      
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');
      const wallWithInvalidGeometry = wallSolid.withUpdates({ solidGeometry: [polygonWithInvalidHole] });

      const result = validator.repairInvalidGeometry(wallWithInvalidGeometry);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBeGreaterThan(0);
      expect(result.repairOperations.length).toBeGreaterThan(0);
      expect(result.repairedGeometry).toBeDefined();
    });

    test('should calculate detailed quality metrics', () => {
      const points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      const polygon = new BIMPolygonImpl(points);
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');
      const wallWithGeometry = wallSolid.withUpdates({ solidGeometry: [polygon] });

      const result = validator.calculateDetailedQualityMetrics(wallWithGeometry);

      expect(result.detailedMetrics).toBeDefined();
      expect(result.detailedMetrics.polygonQuality).toBeInstanceOf(Array);
      expect(result.detailedMetrics.intersectionQuality).toBeInstanceOf(Array);
      expect(typeof result.detailedMetrics.baselineQuality).toBe('number');
      expect(typeof result.detailedMetrics.offsetQuality).toBe('number');
      expect(typeof result.detailedMetrics.healingEffectiveness).toBe('number');
    });

    test('should generate comprehensive validation report', () => {
      const points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');

      const report = validator.generateValidationReport(wallSolid);

      expect(report.summary).toBeDefined();
      expect(report.summary.overallHealth).toMatch(/excellent|good|fair|poor|critical/);
      expect(typeof report.summary.totalIssues).toBe('number');
      expect(typeof report.summary.criticalIssues).toBe('number');
      expect(typeof report.summary.errorIssues).toBe('number');
      expect(typeof report.summary.warningIssues).toBe('number');
      
      expect(Array.isArray(report.detailedIssues)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.qualityMetrics).toBeDefined();
    });

    test('should handle repair with disabled repair mode', () => {
      const validatorWithoutRepair = new GeometryValidator({ repairEnabled: false });
      
      const points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');

      const result = validatorWithoutRepair.repairInvalidGeometry(wallSolid);

      expect(result.success).toBe(false);
      expect(result.issuesFixed).toBe(0);
      expect(result.repairOperations.length).toBe(0);
    });

    test('should detect critical issues in validation report', () => {
      const points = [new BIMPointImpl(0, 0)]; // Invalid baseline
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      const wallSolid = new WallSolidImpl(baseline, -100, 'layout'); // Invalid thickness

      const report = validator.generateValidationReport(wallSolid);

      expect(report.summary.overallHealth).toMatch(/excellent|good|fair|poor|critical/);
      expect(report.summary.errorIssues).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    test('should provide auto-fixable recommendations', () => {
      const points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      
      // Create invalid intersection
      const invalidIntersection = {
        id: 'invalid-intersection',
        type: 't_junction',
        participatingWalls: [], // Invalid - no participating walls
        intersectionPoint: null, // Invalid - no intersection point
        miterApex: null,
        offsetIntersections: [],
        resolvedGeometry: new BIMPolygonImpl(points),
        resolutionMethod: 'none',
        geometricAccuracy: 0.1,
        validated: false
      };
      
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');
      const wallWithInvalidIntersection = wallSolid.withUpdates({ 
        intersectionData: [invalidIntersection] 
      });

      const result = validator.repairInvalidGeometry(wallWithInvalidIntersection);

      expect(result.success).toBe(true);
      expect(result.repairedGeometry).toBeDefined();
      if (result.issuesFixed > 0) {
        expect(result.repairOperations.some(op => op.includes('removed_invalid_intersection'))).toBe(true);
      }
    });

    test('should validate network with thickness consistency', () => {
      const wall1Points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0)
      ];
      const wall1Baseline = new CurveImpl(wall1Points, CurveType.POLYLINE);
      const wall1 = new WallSolidImpl(wall1Baseline, 200, 'layout');

      const wall2Points = [
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10)
      ];
      const wall2Baseline = new CurveImpl(wall2Points, CurveType.POLYLINE);
      const wall2 = new WallSolidImpl(wall2Baseline, 300, 'layout'); // Different thickness

      // Add intersection data to simulate connected walls
      const intersection = {
        id: 'test-intersection',
        type: 't_junction',
        participatingWalls: [wall1.id, wall2.id],
        intersectionPoint: { x: 10, y: 0 },
        miterApex: { x: 10, y: 0 },
        offsetIntersections: [{ x: 10, y: 0 }],
        resolvedGeometry: new BIMPolygonImpl(wall1Points),
        resolutionMethod: 'miter',
        geometricAccuracy: 0.95,
        validated: true
      };

      const wall1WithIntersection = wall1.withUpdates({ intersectionData: [intersection] });
      const wall2WithIntersection = wall2.withUpdates({ intersectionData: [intersection] });

      const result = validator.validateWallNetwork([wall1WithIntersection, wall2WithIntersection]);

      expect(result.networkIssues.some(issue => 
        issue.message.includes('different thicknesses')
      )).toBe(true);
    });

    test('should handle empty geometry in repair', () => {
      const points = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');
      const wallWithEmptyGeometry = wallSolid.withUpdates({ solidGeometry: [] });

      const result = validator.repairInvalidGeometry(wallWithEmptyGeometry);

      expect(result.success).toBe(true);
      expect(result.repairedGeometry).toBeDefined();
      expect(result.repairedGeometry.solidGeometry).toBeDefined();
    });

    test('should calculate polygon quality correctly', () => {
      // Create a high-quality polygon
      const goodPoints = [
        new BIMPointImpl(0, 0),
        new BIMPointImpl(10, 0),
        new BIMPointImpl(10, 10),
        new BIMPointImpl(0, 10)
      ];
      const goodPolygon = new BIMPolygonImpl(goodPoints);
      
      const baseline = new CurveImpl(goodPoints, CurveType.POLYLINE);
      const wallSolid = new WallSolidImpl(baseline, 200, 'layout');
      const wallWithGoodGeometry = wallSolid.withUpdates({ solidGeometry: [goodPolygon] });

      const metrics = validator.calculateDetailedQualityMetrics(wallWithGoodGeometry);

      expect(metrics.detailedMetrics.polygonQuality[0]).toBeGreaterThan(0.8);
    });

    test('should categorize issues correctly in validation report', () => {
      const points = [new BIMPointImpl(0, 0)]; // Invalid baseline
      const baseline = new CurveImpl(points, CurveType.POLYLINE);
      const wallSolid = new WallSolidImpl(baseline, -100, 'layout'); // Invalid thickness

      const report = validator.generateValidationReport(wallSolid);

      expect(report.detailedIssues.length).toBeGreaterThan(0);
      expect(report.detailedIssues.some(category => 
        ['Topology', 'Geometry', 'Intersections', 'Parameters', 'General'].includes(category.category)
      )).toBe(true);
    });
  });
});