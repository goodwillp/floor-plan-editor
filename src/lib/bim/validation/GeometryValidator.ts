/**
 * Geometry Validator for validating geometric consistency
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { ValidationResult } from '../types/GeometricTypes';
import type { QualityMetrics } from '../types/BIMTypes';
import type { WallSolid } from '../geometry/WallSolid';
import type { Curve } from '../geometry/Curve';
import type { BIMPolygon } from '../geometry/BIMPolygon';
import type { BIMPoint } from '../geometry/BIMPoint';
import { WallSolidImpl } from '../geometry/WallSolid';
import { BIMPolygonImpl } from '../geometry/BIMPolygon';
import { GeometricErrorFactory } from './GeometricError';

/**
 * Validation rule interface
 */
interface ValidationRule {
  name: string;
  description: string;
  validate(geometry: any): ValidationIssue[];
  severity: 'warning' | 'error' | 'critical';
  category: string;
}

/**
 * Validation issue
 */
interface ValidationIssue {
  rule: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  location?: { x: number; y: number };
  suggestion: string;
  autoFixable: boolean;
}

/**
 * Network validation result for multiple walls
 */
export interface NetworkValidationResult {
  isValid: boolean;
  wallResults: Map<string, ValidationResult>;
  networkIssues: ValidationIssue[];
  overallQuality: QualityMetrics;
  suggestions: string[];
}

/**
 * Repair operation result
 */
interface RepairResult {
  success: boolean;
  repairedGeometry: any;
  repairOperations: string[];
  issuesFixed: number;
  remainingIssues: ValidationIssue[];
}

/**
 * Topology validation result
 */
interface TopologyValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  connectivity: {
    connectedComponents: number;
    isolatedElements: number;
    danglingEdges: number;
  };
  consistency: {
    orientationConsistent: boolean;
    manifoldEdges: boolean;
    closedSurfaces: boolean;
  };
}

/**
 * Comprehensive geometry validator with repair capabilities
 */
export class GeometryValidator {
  private validationRules: ValidationRule[] = [];
  private tolerance: number = 1e-6;
  private repairEnabled: boolean = true;

  constructor(options: {
    tolerance?: number;
    repairEnabled?: boolean;
  } = {}) {
    this.tolerance = options.tolerance || 1e-6;
    this.repairEnabled = options.repairEnabled !== false;
    this.initializeDefaultRules();
  }

  /**
   * Validate a wall solid
   */
  validateWallSolid(solid: WallSolid): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Apply all validation rules
    for (const rule of this.validationRules) {
      try {
        const ruleIssues = rule.validate(solid);
        issues.push(...ruleIssues);

        // Categorize issues
        for (const issue of ruleIssues) {
          if (issue.severity === 'error' || issue.severity === 'critical') {
            errors.push(issue.message);
          } else {
            warnings.push(issue.message);
          }
        }
      } catch (validationError) {
        errors.push(`Validation rule '${rule.name}' failed: ${validationError}`);
      }
    }

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(solid, issues);

    // Generate suggestions
    const suggestions = this.generateSuggestions(issues);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityMetrics,
      suggestions
    };
  }

  /**
   * Validate an intersection
   */
  validateIntersection(intersection: any): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate intersection geometry
    if (!intersection.intersectionPoint) {
      errors.push('Intersection missing intersection point');
    }

    if (!intersection.resolvedGeometry) {
      errors.push('Intersection missing resolved geometry');
    }

    if (intersection.geometricAccuracy < 0.8) {
      warnings.push('Intersection has low geometric accuracy');
    }

    // Calculate basic quality metrics
    const qualityMetrics: QualityMetrics = {
      geometricAccuracy: intersection.geometricAccuracy || 0,
      topologicalConsistency: intersection.validated ? 1.0 : 0.5,
      manufacturability: 1.0,
      architecturalCompliance: 1.0,
      sliverFaceCount: 0,
      microGapCount: 0,
      selfIntersectionCount: 0,
      degenerateElementCount: 0,
      complexity: 1,
      processingEfficiency: 1.0,
      memoryUsage: 0
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityMetrics,
      suggestions: this.generateSuggestions(issues)
    };
  }

  /**
   * Validate a curve
   */
  validateCurve(curve: Curve): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check minimum points
    if (curve.points.length < 2) {
      errors.push('Curve must have at least 2 points');
    }

    // Check for duplicate consecutive points
    for (let i = 0; i < curve.points.length - 1; i++) {
      if (curve.points[i].equals(curve.points[i + 1], this.tolerance)) {
        warnings.push(`Duplicate consecutive points at index ${i}`);
      }
    }

    // Check for zero-length segments
    let zeroLengthSegments = 0;
    for (let i = 0; i < curve.points.length - 1; i++) {
      const distance = curve.points[i].distanceTo(curve.points[i + 1]);
      if (distance < this.tolerance) {
        zeroLengthSegments++;
      }
    }

    if (zeroLengthSegments > 0) {
      warnings.push(`Found ${zeroLengthSegments} zero-length segments`);
    }

    // Check curve length
    if (curve.length < this.tolerance) {
      errors.push('Curve has zero or negative length');
    }

    // Calculate quality metrics
    const qualityMetrics: QualityMetrics = {
      geometricAccuracy: this.calculateCurveAccuracy(curve),
      topologicalConsistency: errors.length === 0 ? 1.0 : 0.0,
      manufacturability: 1.0,
      architecturalCompliance: 1.0,
      sliverFaceCount: 0,
      microGapCount: 0,
      selfIntersectionCount: this.countSelfIntersections(curve),
      degenerateElementCount: zeroLengthSegments,
      complexity: curve.points.length,
      processingEfficiency: 1.0,
      memoryUsage: curve.points.length * 32 // Rough estimate
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityMetrics,
      suggestions: this.generateSuggestions(issues)
    };
  }

  /**
   * Validate a wall network (multiple walls)
   */
  validateWallNetwork(solids: WallSolid[]): NetworkValidationResult {
    const wallResults = new Map<string, ValidationResult>();
    const networkIssues: ValidationIssue[] = [];

    // Validate individual walls
    for (const solid of solids) {
      const result = this.validateWallSolid(solid);
      wallResults.set(solid.id, result);
    }

    // Check network-level issues
    this.validateNetworkConnectivity(solids, networkIssues);
    this.validateNetworkConsistency(solids, networkIssues);

    // Calculate overall quality
    const overallQuality = this.calculateNetworkQuality(wallResults, networkIssues);

    // Generate network-level suggestions
    const suggestions = this.generateNetworkSuggestions(wallResults, networkIssues);

    return {
      isValid: networkIssues.filter(issue => issue.severity !== 'warning').length === 0,
      wallResults,
      networkIssues,
      overallQuality,
      suggestions
    };
  }

  /**
   * Add a custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * Remove a validation rule by name
   */
  removeValidationRule(name: string): boolean {
    const initialLength = this.validationRules.length;
    this.validationRules = this.validationRules.filter(rule => rule.name !== name);
    return this.validationRules.length < initialLength;
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * Validate topology consistency
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  validateTopology(solid: WallSolid): TopologyValidationResult {
    const issues: ValidationIssue[] = [];
    
    // Check connectivity
    const connectivity = this.analyzeConnectivity(solid);
    
    // Check consistency
    const consistency = this.analyzeConsistency(solid);
    
    // Validate each polygon's topology
    for (const polygon of solid.solidGeometry) {
      const polygonIssues = this.validatePolygonTopology(polygon);
      issues.push(...polygonIssues);
    }
    
    // Check intersection topology
    for (const intersection of solid.intersectionData) {
      const intersectionIssues = this.validateIntersectionTopology(intersection);
      issues.push(...intersectionIssues);
    }

    return {
      isValid: issues.filter(issue => issue.severity !== 'warning').length === 0,
      issues,
      connectivity,
      consistency
    };
  }

  /**
   * Repair invalid geometry automatically
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  repairInvalidGeometry(solid: WallSolid): RepairResult {
    if (!this.repairEnabled) {
      return {
        success: false,
        repairedGeometry: solid,
        repairOperations: [],
        issuesFixed: 0,
        remainingIssues: []
      };
    }

    const repairOperations: string[] = [];
    let repairedSolid = solid;
    let totalIssuesFixed = 0;

    try {
      // 1. Repair polygon topology
      const polygonRepair = this.repairPolygonTopology(repairedSolid);
      repairedSolid = polygonRepair.repairedGeometry;
      repairOperations.push(...polygonRepair.repairOperations);
      totalIssuesFixed += polygonRepair.issuesFixed;

      // 2. Repair intersection topology
      const intersectionRepair = this.repairIntersectionTopology(repairedSolid);
      repairedSolid = intersectionRepair.repairedGeometry;
      repairOperations.push(...intersectionRepair.repairOperations);
      totalIssuesFixed += intersectionRepair.issuesFixed;

      // 3. Repair connectivity issues
      const connectivityRepair = this.repairConnectivity(repairedSolid);
      repairedSolid = connectivityRepair.repairedGeometry;
      repairOperations.push(...connectivityRepair.repairOperations);
      totalIssuesFixed += connectivityRepair.issuesFixed;

      // 4. Final validation to check remaining issues
      const finalValidation = this.validateWallSolid(repairedSolid);
      const remainingIssues = this.extractValidationIssues(finalValidation);

      return {
        success: true,
        repairedGeometry: repairedSolid,
        repairOperations,
        issuesFixed: totalIssuesFixed,
        remainingIssues
      };

    } catch (error) {
      console.error('Repair failed:', error);
      return {
        success: false,
        repairedGeometry: solid,
        repairOperations,
        issuesFixed: totalIssuesFixed,
        remainingIssues: []
      };
    }
  }

  /**
   * Calculate detailed quality metrics for geometric accuracy assessment
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  calculateDetailedQualityMetrics(solid: WallSolid): QualityMetrics & {
    detailedMetrics: {
      polygonQuality: number[];
      intersectionQuality: number[];
      baselineQuality: number;
      offsetQuality: number;
      healingEffectiveness: number;
    };
  } {
    const baseMetrics = this.calculateQualityMetrics(solid, []);
    
    // Calculate detailed metrics
    const polygonQuality = solid.solidGeometry.map(polygon => this.calculatePolygonQuality(polygon));
    const intersectionQuality = solid.intersectionData.map(intersection => intersection.geometricAccuracy);
    const baselineQuality = this.calculateCurveQuality(solid.baseline);
    const offsetQuality = (this.calculateCurveQuality(solid.leftOffset) + this.calculateCurveQuality(solid.rightOffset)) / 2;
    const healingEffectiveness = this.calculateHealingEffectiveness(solid);

    return {
      ...baseMetrics,
      detailedMetrics: {
        polygonQuality,
        intersectionQuality,
        baselineQuality,
        offsetQuality,
        healingEffectiveness
      }
    };
  }

  /**
   * Generate detailed validation report with issue descriptions
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  generateValidationReport(solid: WallSolid): {
    summary: {
      overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      totalIssues: number;
      criticalIssues: number;
      errorIssues: number;
      warningIssues: number;
    };
    detailedIssues: {
      category: string;
      issues: ValidationIssue[];
    }[];
    recommendations: {
      priority: 'high' | 'medium' | 'low';
      action: string;
      description: string;
      autoFixable: boolean;
    }[];
    qualityMetrics: QualityMetrics;
  } {
    const validation = this.validateWallSolid(solid);
    const topologyValidation = this.validateTopology(solid);
    const allIssues = [...this.extractValidationIssues(validation), ...topologyValidation.issues];

    // Categorize issues
    const issuesByCategory = new Map<string, ValidationIssue[]>();
    for (const issue of allIssues) {
      const category = this.getIssueCategory(issue);
      if (!issuesByCategory.has(category)) {
        issuesByCategory.set(category, []);
      }
      issuesByCategory.get(category)!.push(issue);
    }

    // Calculate summary
    const criticalIssues = allIssues.filter(issue => issue.severity === 'critical').length;
    const errorIssues = allIssues.filter(issue => issue.severity === 'error').length;
    const warningIssues = allIssues.filter(issue => issue.severity === 'warning').length;
    const totalIssues = allIssues.length;

    const overallHealth = this.determineOverallHealth(criticalIssues, errorIssues, warningIssues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(allIssues, validation.qualityMetrics);

    return {
      summary: {
        overallHealth,
        totalIssues,
        criticalIssues,
        errorIssues,
        warningIssues
      },
      detailedIssues: Array.from(issuesByCategory.entries()).map(([category, issues]) => ({
        category,
        issues
      })),
      recommendations,
      qualityMetrics: validation.qualityMetrics
    };
  }

  /**
   * Calculate quality metrics for a wall solid
   */
  private calculateQualityMetrics(solid: WallSolid, issues: ValidationIssue[]): QualityMetrics {
    const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
    const errorIssues = issues.filter(issue => issue.severity === 'error').length;
    const warningIssues = issues.filter(issue => issue.severity === 'warning').length;

    // Calculate accuracy based on issues
    let geometricAccuracy = 1.0;
    geometricAccuracy -= criticalIssues * 0.5;
    geometricAccuracy -= errorIssues * 0.2;
    geometricAccuracy -= warningIssues * 0.05;
    geometricAccuracy = Math.max(0, geometricAccuracy);

    // Calculate topological consistency
    const topologicalConsistency = criticalIssues === 0 && errorIssues === 0 ? 1.0 : 0.5;

    // Count specific issues
    let sliverFaceCount = 0;
    let microGapCount = 0;
    let selfIntersectionCount = 0;
    let degenerateElementCount = 0;

    for (const polygon of solid.solidGeometry) {
      if (polygon.hasSliversFaces) sliverFaceCount++;
      if (polygon.selfIntersects) selfIntersectionCount++;
    }

    return {
      geometricAccuracy,
      topologicalConsistency,
      manufacturability: geometricAccuracy > 0.8 ? 1.0 : 0.5,
      architecturalCompliance: topologicalConsistency,
      sliverFaceCount,
      microGapCount,
      selfIntersectionCount,
      degenerateElementCount,
      complexity: solid.complexity,
      processingEfficiency: solid.processingTime > 0 ? 1000 / solid.processingTime : 1.0,
      memoryUsage: solid.solidGeometry.length * 1000 // Rough estimate
    };
  }

  /**
   * Calculate curve accuracy
   */
  private calculateCurveAccuracy(curve: Curve): number {
    let accuracy = 1.0;

    // Reduce accuracy for curves with issues
    const selfIntersections = this.countSelfIntersections(curve);
    accuracy -= selfIntersections * 0.1;

    // Check for sharp angles that might cause issues
    const sharpAngles = this.countSharpAngles(curve);
    accuracy -= sharpAngles * 0.05;

    return Math.max(0, accuracy);
  }

  /**
   * Count self-intersections in a curve
   */
  private countSelfIntersections(curve: Curve): number {
    let count = 0;
    const points = curve.points;

    for (let i = 0; i < points.length - 1; i++) {
      for (let j = i + 2; j < points.length - 1; j++) {
        // Skip adjacent segments and closing segment
        if (j === points.length - 1 && i === 0) continue;

        if (this.segmentsIntersect(points[i], points[i + 1], points[j], points[j + 1])) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Count sharp angles in a curve
   */
  private countSharpAngles(curve: Curve): number {
    let count = 0;
    const points = curve.points;
    const sharpAngleThreshold = Math.PI / 6; // 30 degrees

    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[i + 1];

      const angle = this.calculateAngle(p1, p2, p3);
      if (angle < sharpAngleThreshold) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if two line segments intersect
   */
  private segmentsIntersect(p1: BIMPoint, p2: BIMPoint, p3: BIMPoint, p4: BIMPoint): boolean {
    const d1 = this.orientation(p3, p4, p1);
    const d2 = this.orientation(p3, p4, p2);
    const d3 = this.orientation(p1, p2, p3);
    const d4 = this.orientation(p1, p2, p4);

    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  /**
   * Calculate orientation of three points
   */
  private orientation(p: BIMPoint, q: BIMPoint, r: BIMPoint): number {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (Math.abs(val) < this.tolerance) return 0;
    return val > 0 ? 1 : -1;
  }

  /**
   * Calculate angle at point p2 formed by p1-p2-p3
   */
  private calculateAngle(p1: BIMPoint, p2: BIMPoint, p3: BIMPoint): number {
    const v1x = p1.x - p2.x;
    const v1y = p1.y - p2.y;
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;

    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (mag1 < this.tolerance || mag2 < this.tolerance) return 0;

    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  }

  /**
   * Validate network connectivity
   */
  private validateNetworkConnectivity(solids: WallSolid[], issues: ValidationIssue[]): void {
    // Check for isolated walls
    const connectedWalls = new Set<string>();
    
    for (const solid of solids) {
      if (solid.intersectionData.length > 0) {
        connectedWalls.add(solid.id);
        for (const intersection of solid.intersectionData) {
          intersection.participatingWalls.forEach(wallId => connectedWalls.add(wallId));
        }
      }
    }

    const isolatedWalls = solids.filter(solid => !connectedWalls.has(solid.id));
    if (isolatedWalls.length > 0) {
      issues.push({
        rule: 'network_connectivity',
        severity: 'warning',
        message: `Found ${isolatedWalls.length} isolated walls`,
        suggestion: 'Consider connecting isolated walls or verify they are intentionally separate',
        autoFixable: false
      });
    }
  }

  /**
   * Validate network consistency
   */
  private validateNetworkConsistency(solids: WallSolid[], issues: ValidationIssue[]): void {
    // Check for thickness consistency at intersections
    const thicknessMap = new Map<string, number>();
    
    for (const solid of solids) {
      thicknessMap.set(solid.id, solid.thickness);
    }

    for (const solid of solids) {
      for (const intersection of solid.intersectionData) {
        const thicknesses = intersection.participatingWalls.map(wallId => thicknessMap.get(wallId) || 0);
        const uniqueThicknesses = new Set(thicknesses);
        
        if (uniqueThicknesses.size > 1) {
          issues.push({
            rule: 'thickness_consistency',
            severity: 'warning',
            message: `Intersection has walls with different thicknesses: ${Array.from(uniqueThicknesses).join(', ')}`,
            location: intersection.intersectionPoint,
            suggestion: 'Consider using consistent wall thicknesses at intersections',
            autoFixable: false
          });
        }
      }
    }
  }

  /**
   * Calculate network-level quality metrics
   */
  private calculateNetworkQuality(wallResults: Map<string, ValidationResult>, networkIssues: ValidationIssue[]): QualityMetrics {
    const results = Array.from(wallResults.values());
    
    if (results.length === 0) {
      return {
        geometricAccuracy: 0,
        topologicalConsistency: 0,
        manufacturability: 0,
        architecturalCompliance: 0,
        sliverFaceCount: 0,
        microGapCount: 0,
        selfIntersectionCount: 0,
        degenerateElementCount: 0,
        complexity: 0,
        processingEfficiency: 0,
        memoryUsage: 0
      };
    }

    // Average individual wall metrics
    const avgAccuracy = results.reduce((sum, r) => sum + r.qualityMetrics.geometricAccuracy, 0) / results.length;
    const avgConsistency = results.reduce((sum, r) => sum + r.qualityMetrics.topologicalConsistency, 0) / results.length;
    const avgManufacturability = results.reduce((sum, r) => sum + r.qualityMetrics.manufacturability, 0) / results.length;
    const avgCompliance = results.reduce((sum, r) => sum + r.qualityMetrics.architecturalCompliance, 0) / results.length;

    // Sum counts
    const totalSliverFaces = results.reduce((sum, r) => sum + r.qualityMetrics.sliverFaceCount, 0);
    const totalMicroGaps = results.reduce((sum, r) => sum + r.qualityMetrics.microGapCount, 0);
    const totalSelfIntersections = results.reduce((sum, r) => sum + r.qualityMetrics.selfIntersectionCount, 0);
    const totalDegenerateElements = results.reduce((sum, r) => sum + r.qualityMetrics.degenerateElementCount, 0);
    const totalComplexity = results.reduce((sum, r) => sum + r.qualityMetrics.complexity, 0);
    const avgEfficiency = results.reduce((sum, r) => sum + r.qualityMetrics.processingEfficiency, 0) / results.length;
    const totalMemory = results.reduce((sum, r) => sum + r.qualityMetrics.memoryUsage, 0);

    // Adjust for network-level issues
    const networkPenalty = networkIssues.length * 0.05;

    return {
      geometricAccuracy: Math.max(0, avgAccuracy - networkPenalty),
      topologicalConsistency: Math.max(0, avgConsistency - networkPenalty),
      manufacturability: avgManufacturability,
      architecturalCompliance: avgCompliance,
      sliverFaceCount: totalSliverFaces,
      microGapCount: totalMicroGaps,
      selfIntersectionCount: totalSelfIntersections,
      degenerateElementCount: totalDegenerateElements,
      complexity: totalComplexity,
      processingEfficiency: avgEfficiency,
      memoryUsage: totalMemory
    };
  }

  /**
   * Generate suggestions based on validation issues
   */
  private generateSuggestions(issues: ValidationIssue[]): string[] {
    const suggestions = new Set<string>();

    for (const issue of issues) {
      suggestions.add(issue.suggestion);
    }

    // Add general suggestions based on issue patterns
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const errorCount = issues.filter(i => i.severity === 'error').length;

    if (criticalCount > 0) {
      suggestions.add('Address critical issues before proceeding with geometric operations');
    }

    if (errorCount > 3) {
      suggestions.add('Consider simplifying geometry to reduce validation errors');
    }

    return Array.from(suggestions);
  }

  /**
   * Generate network-level suggestions
   */
  private generateNetworkSuggestions(wallResults: Map<string, ValidationResult>, networkIssues: ValidationIssue[]): string[] {
    const suggestions = new Set<string>();

    // Add suggestions from network issues
    for (const issue of networkIssues) {
      suggestions.add(issue.suggestion);
    }

    // Add suggestions based on overall network health
    const totalErrors = Array.from(wallResults.values()).reduce((sum, result) => sum + result.errors.length, 0);
    
    if (totalErrors > wallResults.size * 2) {
      suggestions.add('Network has high error density - consider systematic geometry review');
    }

    return Array.from(suggestions);
  }

  /**
   * Analyze connectivity of wall solid
   */
  private analyzeConnectivity(solid: WallSolid): {
    connectedComponents: number;
    isolatedElements: number;
    danglingEdges: number;
  } {
    let connectedComponents = 0;
    let isolatedElements = 0;
    let danglingEdges = 0;

    // Analyze polygon connectivity
    const polygonGraph = this.buildPolygonConnectivityGraph(solid.solidGeometry);
    connectedComponents = this.countConnectedComponents(polygonGraph);
    isolatedElements = solid.solidGeometry.length - connectedComponents;

    // Count dangling edges (edges that don't connect to other polygons)
    for (const polygon of solid.solidGeometry) {
      danglingEdges += this.countDanglingEdges(polygon, solid.solidGeometry);
    }

    return {
      connectedComponents,
      isolatedElements,
      danglingEdges
    };
  }

  /**
   * Analyze consistency of wall solid
   */
  private analyzeConsistency(solid: WallSolid): {
    orientationConsistent: boolean;
    manifoldEdges: boolean;
    closedSurfaces: boolean;
  } {
    let orientationConsistent = true;
    let manifoldEdges = true;
    let closedSurfaces = true;

    // Check polygon orientation consistency
    for (const polygon of solid.solidGeometry) {
      if (!this.isPolygonOrientationConsistent(polygon)) {
        orientationConsistent = false;
      }
    }

    // Check for manifold edges (each edge should be shared by at most 2 polygons)
    const edgeCount = this.countSharedEdges(solid.solidGeometry);
    for (const count of edgeCount.values()) {
      if (count > 2) {
        manifoldEdges = false;
        break;
      }
    }

    // Check if surfaces are closed (simplified check)
    for (const polygon of solid.solidGeometry) {
      if (!this.isPolygonClosed(polygon)) {
        closedSurfaces = false;
      }
    }

    return {
      orientationConsistent,
      manifoldEdges,
      closedSurfaces
    };
  }

  /**
   * Validate polygon topology
   */
  private validatePolygonTopology(polygon: BIMPolygon): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check minimum vertices
    if (polygon.outerRing.length < 3) {
      issues.push({
        rule: 'polygon_topology',
        severity: 'error',
        message: 'Polygon outer ring has insufficient vertices',
        suggestion: 'Ensure polygon has at least 3 vertices',
        autoFixable: false
      });
    }

    // Check for self-intersections
    if (polygon.selfIntersects) {
      issues.push({
        rule: 'polygon_topology',
        severity: 'error',
        message: 'Polygon has self-intersections',
        suggestion: 'Remove self-intersections or split polygon',
        autoFixable: true
      });
    }

    // Check holes
    for (let i = 0; i < polygon.holes.length; i++) {
      const hole = polygon.holes[i];
      if (hole.length < 3) {
        issues.push({
          rule: 'polygon_topology',
          severity: 'error',
          message: `Polygon hole ${i} has insufficient vertices`,
          suggestion: 'Remove invalid hole or add more vertices',
          autoFixable: true
        });
      }
    }

    return issues;
  }

  /**
   * Validate intersection topology
   */
  private validateIntersectionTopology(intersection: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if intersection point is valid
    if (!intersection.intersectionPoint || 
        typeof intersection.intersectionPoint.x !== 'number' ||
        typeof intersection.intersectionPoint.y !== 'number') {
      issues.push({
        rule: 'intersection_topology',
        severity: 'error',
        message: 'Intersection has invalid intersection point',
        suggestion: 'Recalculate intersection geometry',
        autoFixable: true
      });
    }

    // Check if participating walls exist
    if (!intersection.participatingWalls || intersection.participatingWalls.length < 2) {
      issues.push({
        rule: 'intersection_topology',
        severity: 'error',
        message: 'Intersection must involve at least 2 walls',
        suggestion: 'Verify intersection participants or remove invalid intersection',
        autoFixable: true
      });
    }

    return issues;
  }

  /**
   * Repair polygon topology
   */
  private repairPolygonTopology(solid: WallSolid): RepairResult {
    const repairOperations: string[] = [];
    let issuesFixed = 0;
    const repairedGeometry: BIMPolygon[] = [];

    for (const polygon of solid.solidGeometry) {
      // Remove invalid holes
      const validHoles = polygon.holes.filter(hole => hole.length >= 3);
      if (validHoles.length < polygon.holes.length) {
        const removedHoles = polygon.holes.length - validHoles.length;
        repairOperations.push(`removed_${removedHoles}_invalid_holes`);
        issuesFixed += removedHoles;
      }

      // Only keep polygon if outer ring is valid
      if (polygon.outerRing.length >= 3) {
        // Create repaired polygon with valid holes
        const repairedPolygon = new BIMPolygonImpl(
          polygon.outerRing,
          validHoles,
          {
            id: polygon.id,
            creationMethod: polygon.creationMethod,
            healingApplied: true,
            simplificationApplied: polygon.simplificationApplied
          }
        );
        repairedGeometry.push(repairedPolygon);
      } else {
        repairOperations.push(`removed_invalid_polygon_${polygon.id}`);
        issuesFixed++;
      }
    }

    let repairedSolid: WallSolid;
    if (solid instanceof WallSolidImpl && typeof (solid as any).withUpdates === 'function') {
      repairedSolid = (solid as any).withUpdates({ solidGeometry: repairedGeometry });
    } else {
      // Create a new wall solid with repaired geometry
      repairedSolid = new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
        id: solid.id,
        leftOffset: solid.leftOffset,
        rightOffset: solid.rightOffset,
        solidGeometry: repairedGeometry,
        intersectionData: solid.intersectionData,
        healingHistory: solid.healingHistory,
        geometricQuality: solid.geometricQuality,
        processingTime: solid.processingTime
      });
    }

    return {
      success: true,
      repairedGeometry: repairedSolid,
      repairOperations,
      issuesFixed,
      remainingIssues: []
    };
  }

  /**
   * Repair intersection topology
   */
  private repairIntersectionTopology(solid: WallSolid): RepairResult {
    const repairOperations: string[] = [];
    let issuesFixed = 0;
    const validIntersections = [];

    for (const intersection of solid.intersectionData) {
      let isValid = true;

      // Check intersection point validity
      if (!intersection.intersectionPoint || 
          typeof intersection.intersectionPoint.x !== 'number' ||
          typeof intersection.intersectionPoint.y !== 'number') {
        isValid = false;
      }

      // Check participating walls
      if (!intersection.participatingWalls || intersection.participatingWalls.length < 2) {
        isValid = false;
      }

      if (isValid) {
        validIntersections.push(intersection);
      } else {
        repairOperations.push(`removed_invalid_intersection_${intersection.id}`);
        issuesFixed++;
      }
    }

    let repairedSolid: WallSolid;
    if (solid instanceof WallSolidImpl && typeof (solid as any).withUpdates === 'function') {
      repairedSolid = (solid as any).withUpdates({ intersectionData: validIntersections });
    } else {
      // Create a new wall solid with repaired intersections
      repairedSolid = new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
        id: solid.id,
        leftOffset: solid.leftOffset,
        rightOffset: solid.rightOffset,
        solidGeometry: solid.solidGeometry,
        intersectionData: validIntersections,
        healingHistory: solid.healingHistory,
        geometricQuality: solid.geometricQuality,
        processingTime: solid.processingTime
      });
    }

    return {
      success: true,
      repairedGeometry: repairedSolid,
      repairOperations,
      issuesFixed,
      remainingIssues: []
    };
  }

  /**
   * Repair connectivity issues
   */
  private repairConnectivity(solid: WallSolid): RepairResult {
    // This is a simplified implementation
    // In a real system, this would attempt to reconnect disconnected components
    return {
      success: true,
      repairedGeometry: solid,
      repairOperations: [],
      issuesFixed: 0,
      remainingIssues: []
    };
  }

  /**
   * Extract validation issues from validation result
   */
  private extractValidationIssues(validation: ValidationResult): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Convert errors to issues
    for (const error of validation.errors) {
      issues.push({
        rule: 'validation_error',
        severity: 'error',
        message: error,
        suggestion: 'Address this error to improve geometry quality',
        autoFixable: false
      });
    }

    // Convert warnings to issues
    for (const warning of validation.warnings) {
      issues.push({
        rule: 'validation_warning',
        severity: 'warning',
        message: warning,
        suggestion: 'Consider addressing this warning',
        autoFixable: false
      });
    }

    return issues;
  }

  /**
   * Calculate polygon quality
   */
  private calculatePolygonQuality(polygon: BIMPolygon): number {
    let quality = 1.0;

    // Reduce quality for invalid polygons
    if (!polygon.isValid) quality -= 0.5;
    if (polygon.selfIntersects) quality -= 0.3;
    if (polygon.hasSliversFaces) quality -= 0.2;

    // Reduce quality for very small or very large polygons
    if (polygon.area < 1e-6) quality -= 0.1;
    if (polygon.area > 1e6) quality -= 0.1;

    return Math.max(0, quality);
  }

  /**
   * Calculate curve quality
   */
  private calculateCurveQuality(curve: Curve): number {
    let quality = 1.0;

    // Reduce quality for curves with issues
    if (curve.points.length < 2) quality -= 0.5;
    if (curve.length < 1e-6) quality -= 0.3;

    // Check for duplicate points
    let duplicatePoints = 0;
    for (let i = 0; i < curve.points.length - 1; i++) {
      if (curve.points[i].distanceTo(curve.points[i + 1]) < this.tolerance) {
        duplicatePoints++;
      }
    }
    quality -= duplicatePoints * 0.05;

    return Math.max(0, quality);
  }

  /**
   * Calculate healing effectiveness
   */
  private calculateHealingEffectiveness(solid: WallSolid): number {
    if (solid.healingHistory.length === 0) return 1.0;

    const successfulOperations = solid.healingHistory.filter(op => op.success).length;
    return successfulOperations / solid.healingHistory.length;
  }

  /**
   * Get issue category
   */
  private getIssueCategory(issue: ValidationIssue): string {
    if (issue.rule.includes('topology')) return 'Topology';
    if (issue.rule.includes('geometry')) return 'Geometry';
    if (issue.rule.includes('intersection')) return 'Intersections';
    if (issue.rule.includes('thickness')) return 'Parameters';
    return 'General';
  }

  /**
   * Determine overall health
   */
  private determineOverallHealth(critical: number, errors: number, warnings: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (critical > 0) return 'critical';
    if (errors > 5) return 'poor';
    if (errors > 0) return 'fair';
    if (warnings > 10) return 'fair';
    if (warnings > 0) return 'good';
    return 'excellent';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(issues: ValidationIssue[], metrics: QualityMetrics): {
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    autoFixable: boolean;
  }[] {
    const recommendations = [];

    // High priority recommendations
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'high' as const,
        action: 'Fix critical issues',
        description: `Address ${criticalIssues.length} critical geometry issues that prevent proper operation`,
        autoFixable: criticalIssues.some(issue => issue.autoFixable)
      });
    }

    // Medium priority recommendations
    if (metrics.geometricAccuracy < 0.8) {
      recommendations.push({
        priority: 'medium' as const,
        action: 'Improve geometric accuracy',
        description: 'Apply geometry healing and simplification to improve accuracy',
        autoFixable: true
      });
    }

    // Low priority recommendations
    const warnings = issues.filter(issue => issue.severity === 'warning');
    if (warnings.length > 5) {
      recommendations.push({
        priority: 'low' as const,
        action: 'Address warnings',
        description: `Consider addressing ${warnings.length} geometry warnings for optimal quality`,
        autoFixable: warnings.some(issue => issue.autoFixable)
      });
    }

    return recommendations;
  }

  /**
   * Build polygon connectivity graph (simplified)
   */
  private buildPolygonConnectivityGraph(polygons: BIMPolygon[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const polygon of polygons) {
      graph.set(polygon.id, []);
    }

    // This is a simplified implementation
    // In a real system, this would analyze actual geometric connectivity
    return graph;
  }

  /**
   * Count connected components in graph
   */
  private countConnectedComponents(graph: Map<string, string[]>): number {
    const visited = new Set<string>();
    let components = 0;

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        this.dfsVisit(graph, node, visited);
        components++;
      }
    }

    return components;
  }

  /**
   * DFS visit for connected components
   */
  private dfsVisit(graph: Map<string, string[]>, node: string, visited: Set<string>): void {
    visited.add(node);
    const neighbors = graph.get(node) || [];
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsVisit(graph, neighbor, visited);
      }
    }
  }

  /**
   * Count dangling edges (simplified)
   */
  private countDanglingEdges(polygon: BIMPolygon, allPolygons: BIMPolygon[]): number {
    // Simplified implementation - just return 0
    return 0;
  }

  /**
   * Check polygon orientation consistency
   */
  private isPolygonOrientationConsistent(polygon: BIMPolygon): boolean {
    // Check if outer ring is counter-clockwise and holes are clockwise
    const outerRingArea = this.calculateSignedArea(polygon.outerRing);
    if (outerRingArea <= 0) return false; // Should be positive (counter-clockwise)

    for (const hole of polygon.holes) {
      const holeArea = this.calculateSignedArea(hole);
      if (holeArea >= 0) return false; // Should be negative (clockwise)
    }

    return true;
  }

  /**
   * Calculate signed area of a ring
   */
  private calculateSignedArea(ring: BIMPoint[]): number {
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      area += ring[i].x * ring[j].y;
      area -= ring[j].x * ring[i].y;
    }
    return area / 2;
  }

  /**
   * Count shared edges between polygons
   */
  private countSharedEdges(polygons: BIMPolygon[]): Map<string, number> {
    const edgeCount = new Map<string, number>();
    
    // This is a simplified implementation
    // In a real system, this would analyze actual edge sharing
    
    return edgeCount;
  }

  /**
   * Check if polygon is closed
   */
  private isPolygonClosed(polygon: BIMPolygon): boolean {
    // Check if first and last points of outer ring are the same (within tolerance)
    const outerRing = polygon.outerRing;
    if (outerRing.length < 3) return false;
    
    const first = outerRing[0];
    const last = outerRing[outerRing.length - 1];
    
    return first.distanceTo(last) <= this.tolerance;
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Wall solid validation rules
    this.addValidationRule({
      name: 'baseline_validity',
      description: 'Check if wall baseline is valid',
      validate: (solid: WallSolid) => {
        const issues: ValidationIssue[] = [];
        if (solid.baseline.points.length < 2) {
          issues.push({
            rule: 'baseline_validity',
            severity: 'error',
            message: 'Wall baseline must have at least 2 points',
            suggestion: 'Add more points to the baseline or remove the wall',
            autoFixable: false
          });
        }
        return issues;
      },
      severity: 'error',
      category: 'geometry'
    });

    this.addValidationRule({
      name: 'thickness_validity',
      description: 'Check if wall thickness is valid',
      validate: (solid: WallSolid) => {
        const issues: ValidationIssue[] = [];
        if (solid.thickness <= 0) {
          issues.push({
            rule: 'thickness_validity',
            severity: 'error',
            message: 'Wall thickness must be positive',
            suggestion: 'Set a positive thickness value',
            autoFixable: true
          });
        }
        if (solid.thickness > 1000) { // 1 meter
          issues.push({
            rule: 'thickness_validity',
            severity: 'warning',
            message: 'Wall thickness is unusually large',
            suggestion: 'Verify thickness value is correct',
            autoFixable: false
          });
        }
        return issues;
      },
      severity: 'error',
      category: 'parameters'
    });

    this.addValidationRule({
      name: 'solid_geometry_validity',
      description: 'Check if solid geometry is valid',
      validate: (solid: WallSolid) => {
        const issues: ValidationIssue[] = [];
        for (const polygon of solid.solidGeometry) {
          if (!polygon.isValid) {
            issues.push({
              rule: 'solid_geometry_validity',
              severity: 'error',
              message: 'Wall contains invalid polygon geometry',
              suggestion: 'Apply geometry healing or regenerate wall solid',
              autoFixable: true
            });
          }
        }
        return issues;
      },
      severity: 'error',
      category: 'geometry'
    });
  }
}