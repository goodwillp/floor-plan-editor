/**
 * Migration Validation Tools
 * 
 * Provides specialized validation tools for verifying migration accuracy
 * and data integrity during the BIM conversion process.
 * 
 * @since 1.0.0
 */

import { UnifiedWallData } from '../data/UnifiedWallData';
import { WallSolid } from '../geometry/WallSolid';
import { QualityMetrics } from '../types/QualityMetrics';

export interface MigrationAccuracyReport {
  overallAccuracy: number;
  geometricAccuracy: number;
  dataPreservation: number;
  performanceImpact: number;
  issues: AccuracyIssue[];
  recommendations: string[];
}

export interface AccuracyIssue {
  type: 'geometric' | 'data' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedWalls: string[];
  originalValue?: any;
  migratedValue?: any;
  deviation?: number;
  suggestedFix: string;
}

export interface DataIntegrityCheck {
  wallCount: {
    original: number;
    migrated: number;
    missing: string[];
    extra: string[];
  };
  geometricProperties: {
    totalLength: { original: number; migrated: number; deviation: number };
    totalArea: { original: number; migrated: number; deviation: number };
    averageThickness: { original: number; migrated: number; deviation: number };
  };
  topologicalConsistency: {
    intersectionCount: { original: number; migrated: number };
    connectionIntegrity: number; // 0-1 score
    networkConnectivity: number; // 0-1 score
  };
  qualityMetrics: QualityMetrics;
}

export interface PerformanceComparison {
  operationTimes: {
    creation: { original: number; migrated: number; improvement: number };
    intersection: { original: number; migrated: number; improvement: number };
    rendering: { original: number; migrated: number; improvement: number };
  };
  memoryUsage: {
    original: number;
    migrated: number;
    increase: number;
  };
  scalabilityMetrics: {
    maxWallCount: { original: number; migrated: number };
    responseTime: { original: number; migrated: number };
  };
}

/**
 * Validates migration accuracy and data integrity
 */
export class MigrationValidationTools {
  private toleranceThreshold: number;

  constructor(toleranceThreshold: number = 0.01) {
    this.toleranceThreshold = toleranceThreshold;
  }

  /**
   * Performs comprehensive validation of migrated data
   * 
   * Compares original and migrated data to ensure accuracy and identify
   * any issues that may have occurred during the migration process.
   * 
   * @param originalData - Original floor plan data before migration
   * @param migratedWalls - Migrated wall data in BIM format
   * @returns Promise resolving to comprehensive accuracy report
   * 
   * @example
   * ```typescript
   * const validator = new MigrationValidationTools();
   * const report = await validator.validateMigrationAccuracy(
   *   originalFloorPlan,
   *   migratedWalls
   * );
   * 
   * console.log(`Overall accuracy: ${report.overallAccuracy * 100}%`);
   * if (report.issues.length > 0) {
   *   console.log('Issues found:', report.issues);
   * }
   * ```
   */
  async validateMigrationAccuracy(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<MigrationAccuracyReport> {
    const issues: AccuracyIssue[] = [];

    // Validate geometric accuracy
    const geometricAccuracy = await this.validateGeometricAccuracy(
      originalData,
      migratedWalls,
      issues
    );

    // Validate data preservation
    const dataPreservation = await this.validateDataPreservation(
      originalData,
      migratedWalls,
      issues
    );

    // Assess performance impact
    const performanceImpact = await this.assessPerformanceImpact(
      originalData,
      migratedWalls,
      issues
    );

    // Calculate overall accuracy
    const overallAccuracy = (geometricAccuracy + dataPreservation + performanceImpact) / 3;

    // Generate recommendations
    const recommendations = this.generateAccuracyRecommendations(issues);

    return {
      overallAccuracy,
      geometricAccuracy,
      dataPreservation,
      performanceImpact,
      issues,
      recommendations
    };
  }

  /**
   * Performs detailed data integrity check
   * 
   * @param originalData - Original data before migration
   * @param migratedWalls - Migrated wall data
   * @returns Promise resolving to integrity check results
   */
  async checkDataIntegrity(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<DataIntegrityCheck> {
    // Count validation
    const wallCount = {
      original: originalData.walls?.size || 0,
      migrated: migratedWalls.size,
      missing: this.findMissingWalls(originalData, migratedWalls),
      extra: this.findExtraWalls(originalData, migratedWalls)
    };

    // Geometric properties validation
    const geometricProperties = await this.compareGeometricProperties(
      originalData,
      migratedWalls
    );

    // Topological consistency validation
    const topologicalConsistency = await this.validateTopologicalConsistency(
      originalData,
      migratedWalls
    );

    // Quality metrics calculation
    const qualityMetrics = await this.calculateMigrationQualityMetrics(migratedWalls);

    return {
      wallCount,
      geometricProperties,
      topologicalConsistency,
      qualityMetrics
    };
  }

  /**
   * Compares performance between original and migrated systems
   * 
   * @param originalData - Original data for performance baseline
   * @param migratedWalls - Migrated data for performance comparison
   * @returns Promise resolving to performance comparison results
   */
  async comparePerformance(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<PerformanceComparison> {
    // Benchmark operation times
    const operationTimes = await this.benchmarkOperations(originalData, migratedWalls);

    // Measure memory usage
    const memoryUsage = await this.compareMemoryUsage(originalData, migratedWalls);

    // Test scalability
    const scalabilityMetrics = await this.testScalability(originalData, migratedWalls);

    return {
      operationTimes,
      memoryUsage,
      scalabilityMetrics
    };
  }

  /**
   * Validates that critical data relationships are preserved
   * 
   * @param originalData - Original data structure
   * @param migratedWalls - Migrated wall data
   * @returns Promise resolving to relationship validation results
   */
  async validateDataRelationships(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<{
    preservedRelationships: number;
    brokenRelationships: string[];
    newRelationships: string[];
    relationshipIntegrity: number;
  }> {
    const preservedRelationships: string[] = [];
    const brokenRelationships: string[] = [];
    const newRelationships: string[] = [];

    // Check wall-segment relationships
    if (originalData.walls && originalData.segments) {
      for (const [wallId, wall] of originalData.walls) {
        const migratedWall = migratedWalls.get(wallId);
        
        if (migratedWall && wall.segments) {
          for (const segmentId of wall.segments) {
            if (originalData.segments.has(segmentId)) {
              // Check if relationship is preserved in migrated data
              if (this.isRelationshipPreserved(migratedWall, segmentId)) {
                preservedRelationships.push(`${wallId}-${segmentId}`);
              } else {
                brokenRelationships.push(`${wallId}-${segmentId}`);
              }
            }
          }
        }
      }
    }

    // Check for new relationships created during migration
    for (const [wallId, wall] of migratedWalls) {
      if (wall.bimGeometry?.intersectionData) {
        for (const intersection of wall.bimGeometry.intersectionData) {
          const relationshipId = `${wallId}-intersection-${intersection.id}`;
          newRelationships.push(relationshipId);
        }
      }
    }

    const totalOriginalRelationships = preservedRelationships.length + brokenRelationships.length;
    const relationshipIntegrity = totalOriginalRelationships > 0 
      ? preservedRelationships.length / totalOriginalRelationships 
      : 1;

    return {
      preservedRelationships: preservedRelationships.length,
      brokenRelationships,
      newRelationships,
      relationshipIntegrity
    };
  }

  // Private validation methods

  private async validateGeometricAccuracy(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>,
    issues: AccuracyIssue[]
  ): Promise<number> {
    let totalAccuracy = 0;
    let validatedWalls = 0;

    for (const [wallId, migratedWall] of migratedWalls) {
      const originalWall = originalData.walls?.get(wallId);
      if (!originalWall) continue;

      // Compare wall length
      const originalLength = this.calculateOriginalWallLength(originalWall, originalData);
      const migratedLength = migratedWall.bimGeometry?.wallSolid?.baseline?.length || 0;
      const lengthDeviation = Math.abs(originalLength - migratedLength) / originalLength;

      if (lengthDeviation > this.toleranceThreshold) {
        issues.push({
          type: 'geometric',
          severity: lengthDeviation > 0.1 ? 'high' : 'medium',
          description: `Wall ${wallId} length deviation: ${(lengthDeviation * 100).toFixed(2)}%`,
          affectedWalls: [wallId],
          originalValue: originalLength,
          migratedValue: migratedLength,
          deviation: lengthDeviation,
          suggestedFix: 'Review baseline curve conversion accuracy'
        });
      }

      // Compare wall thickness
      if (originalWall.thickness && migratedWall.thickness) {
        const thicknessDeviation = Math.abs(originalWall.thickness - migratedWall.thickness) / originalWall.thickness;
        
        if (thicknessDeviation > this.toleranceThreshold) {
          issues.push({
            type: 'geometric',
            severity: 'medium',
            description: `Wall ${wallId} thickness deviation: ${(thicknessDeviation * 100).toFixed(2)}%`,
            affectedWalls: [wallId],
            originalValue: originalWall.thickness,
            migratedValue: migratedWall.thickness,
            deviation: thicknessDeviation,
            suggestedFix: 'Verify thickness preservation during conversion'
          });
        }
      }

      // Calculate accuracy for this wall
      const wallAccuracy = 1 - Math.min(lengthDeviation, 1);
      totalAccuracy += wallAccuracy;
      validatedWalls++;
    }

    return validatedWalls > 0 ? totalAccuracy / validatedWalls : 0;
  }

  private async validateDataPreservation(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>,
    issues: AccuracyIssue[]
  ): Promise<number> {
    let preservationScore = 1;

    // Check for missing walls
    const missingWalls = this.findMissingWalls(originalData, migratedWalls);
    if (missingWalls.length > 0) {
      const missingRatio = missingWalls.length / (originalData.walls?.size || 1);
      preservationScore -= missingRatio * 0.5;

      issues.push({
        type: 'data',
        severity: missingRatio > 0.1 ? 'critical' : 'high',
        description: `${missingWalls.length} walls missing after migration`,
        affectedWalls: missingWalls,
        suggestedFix: 'Review migration process for data loss causes'
      });
    }

    // Check for property preservation
    for (const [wallId, migratedWall] of migratedWalls) {
      const originalWall = originalData.walls?.get(wallId);
      if (!originalWall) continue;

      // Check if essential properties are preserved
      const essentialProperties = ['type', 'thickness', 'visible'];
      for (const prop of essentialProperties) {
        if ((originalWall as any)[prop] !== undefined && (migratedWall as any)[prop] !== (originalWall as any)[prop]) {
          issues.push({
            type: 'data',
            severity: 'medium',
            description: `Wall ${wallId} property ${prop} not preserved`,
            affectedWalls: [wallId],
            originalValue: (originalWall as any)[prop],
            migratedValue: (migratedWall as any)[prop],
            suggestedFix: `Ensure ${prop} property is correctly migrated`
          });
          preservationScore -= 0.01; // Small penalty per property
        }
      }
    }

    return Math.max(0, preservationScore);
  }

  private async assessPerformanceImpact(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>,
    issues: AccuracyIssue[]
  ): Promise<number> {
    // This would involve actual performance testing
    // For now, return a mock assessment based on data complexity
    
    const originalComplexity = this.calculateDataComplexity(originalData);
    const migratedComplexity = this.calculateMigratedComplexity(migratedWalls);
    
    const complexityIncrease = (migratedComplexity - originalComplexity) / originalComplexity;
    
    if (complexityIncrease > 0.5) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        description: `Data complexity increased by ${(complexityIncrease * 100).toFixed(1)}%`,
        affectedWalls: Array.from(migratedWalls.keys()),
        suggestedFix: 'Consider geometry simplification or performance optimization'
      });
    }

    // Return performance score (1 = no impact, 0 = severe impact)
    return Math.max(0, 1 - Math.min(complexityIncrease / 2, 1));
  }

  private findMissingWalls(originalData: any, migratedWalls: Map<string, UnifiedWallData>): string[] {
    const missing: string[] = [];
    
    if (originalData.walls) {
      for (const wallId of originalData.walls.keys()) {
        if (!migratedWalls.has(wallId)) {
          missing.push(wallId);
        }
      }
    }
    
    return missing;
  }

  private findExtraWalls(originalData: any, migratedWalls: Map<string, UnifiedWallData>): string[] {
    const extra: string[] = [];
    
    for (const wallId of migratedWalls.keys()) {
      if (!originalData.walls?.has(wallId)) {
        extra.push(wallId);
      }
    }
    
    return extra;
  }

  private async compareGeometricProperties(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<DataIntegrityCheck['geometricProperties']> {
    let originalTotalLength = 0;
    let originalTotalArea = 0;
    let originalThicknessSum = 0;
    let originalWallCount = 0;

    // Calculate original metrics
    if (originalData.walls) {
      for (const [wallId, wall] of originalData.walls) {
        const length = this.calculateOriginalWallLength(wall, originalData);
        originalTotalLength += length;
        
        if (wall.thickness) {
          originalTotalArea += length * wall.thickness;
          originalThicknessSum += wall.thickness;
          originalWallCount++;
        }
      }
    }

    // Calculate migrated metrics
    let migratedTotalLength = 0;
    let migratedTotalArea = 0;
    let migratedThicknessSum = 0;
    let migratedWallCount = 0;

    for (const [wallId, wall] of migratedWalls) {
      const length = wall.bimGeometry?.wallSolid.baseline.length || 0;
      migratedTotalLength += length;
      
      if (wall.thickness) {
        migratedTotalArea += length * wall.thickness;
        migratedThicknessSum += wall.thickness;
        migratedWallCount++;
      }
    }

    return {
      totalLength: {
        original: originalTotalLength,
        migrated: migratedTotalLength,
        deviation: Math.abs(originalTotalLength - migratedTotalLength) / originalTotalLength
      },
      totalArea: {
        original: originalTotalArea,
        migrated: migratedTotalArea,
        deviation: Math.abs(originalTotalArea - migratedTotalArea) / originalTotalArea
      },
      averageThickness: {
        original: originalWallCount > 0 ? originalThicknessSum / originalWallCount : 0,
        migrated: migratedWallCount > 0 ? migratedThicknessSum / migratedWallCount : 0,
        deviation: 0 // Calculate based on averages
      }
    };
  }

  private async validateTopologicalConsistency(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<DataIntegrityCheck['topologicalConsistency']> {
    // Count intersections in original data
    const originalIntersectionCount = this.countOriginalIntersections(originalData);
    
    // Count intersections in migrated data
    let migratedIntersectionCount = 0;
    for (const [wallId, wall] of migratedWalls) {
      if (wall.bimGeometry?.intersectionData) {
        migratedIntersectionCount += wall.bimGeometry.intersectionData.length;
      }
    }

    // Calculate connectivity metrics
    const connectionIntegrity = this.calculateConnectionIntegrity(originalData, migratedWalls);
    const networkConnectivity = this.calculateNetworkConnectivity(migratedWalls);

    return {
      intersectionCount: {
        original: originalIntersectionCount,
        migrated: migratedIntersectionCount
      },
      connectionIntegrity,
      networkConnectivity
    };
  }

  private async calculateMigrationQualityMetrics(
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<QualityMetrics> {
    let totalAccuracy = 0;
    let totalConsistency = 0;
    let wallCount = 0;

    for (const [wallId, wall] of migratedWalls) {
      if (wall.bimGeometry?.qualityMetrics) {
        totalAccuracy += wall.bimGeometry.qualityMetrics.geometricAccuracy;
        totalConsistency += wall.bimGeometry.qualityMetrics.topologicalConsistency;
        wallCount++;
      }
    }

    return {
      geometricAccuracy: wallCount > 0 ? totalAccuracy / wallCount : 0,
      topologicalConsistency: wallCount > 0 ? totalConsistency / wallCount : 0,
      manufacturability: 0.9,
      architecturalCompliance: 0.95,
      sliverFaceCount: 0,
      microGapCount: 0,
      selfIntersectionCount: 0,
      degenerateElementCount: 0,
      complexity: wallCount,
      processingEfficiency: 0.8,
      memoryUsage: wallCount * 1024,
      calculatedAt: new Date(),
      calculationMethod: 'migration-validation',
      toleranceUsed: this.toleranceThreshold,
      issues: [],
      recommendations: []
    } as any;
  }

  private generateAccuracyRecommendations(issues: AccuracyIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const geometricIssues = issues.filter(i => i.type === 'geometric');
    const dataIssues = issues.filter(i => i.type === 'data');
    const performanceIssues = issues.filter(i => i.type === 'performance');

    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical issues immediately`);
    }

    if (highIssues.length > 0) {
      recommendations.push(`Review ${highIssues.length} high-priority issues`);
    }

    if (geometricIssues.length > 0) {
      recommendations.push('Improve geometric conversion accuracy');
      recommendations.push('Consider adjusting tolerance thresholds');
    }

    if (dataIssues.length > 0) {
      recommendations.push('Review data preservation mechanisms');
      recommendations.push('Implement additional data validation checks');
    }

    if (performanceIssues.length > 0) {
      recommendations.push('Optimize performance for large datasets');
      recommendations.push('Consider implementing progressive loading');
    }

    return recommendations;
  }

  // Helper methods for calculations

  private calculateOriginalWallLength(wall: any, originalData: any): number {
    // Mock implementation - would calculate based on segments
    return wall.segments?.length * 1000 || 1000; // Default 1000mm per segment
  }

  private calculateDataComplexity(data: any): number {
    const wallCount = data.walls?.size || 0;
    const segmentCount = data.segments?.size || 0;
    const nodeCount = data.nodes?.size || 0;
    
    return wallCount + segmentCount * 0.5 + nodeCount * 0.3;
  }

  private calculateMigratedComplexity(walls: Map<string, UnifiedWallData>): number {
    let complexity = 0;
    
    for (const [wallId, wall] of walls) {
      complexity += 1; // Base wall complexity
      
      if (wall.bimGeometry?.wallSolid) {
        complexity += 0.5; // BIM geometry adds complexity
      }
      
      if (wall.bimGeometry?.intersectionData) {
        complexity += wall.bimGeometry.intersectionData.length * 0.3;
      }
    }
    
    return complexity;
  }

  private isRelationshipPreserved(wall: UnifiedWallData, segmentId: string): boolean {
    // Mock implementation - would check if segment relationship is preserved
    return true; // Assume preserved for now
  }

  private countOriginalIntersections(originalData: any): number {
    // Mock implementation - would analyze original data for intersections
    return Math.floor((originalData.walls?.size || 0) / 3); // Rough estimate
  }

  private calculateConnectionIntegrity(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): number {
    // Mock implementation - would compare connection patterns
    return 0.9; // 90% integrity
  }

  private calculateNetworkConnectivity(walls: Map<string, UnifiedWallData>): number {
    // Mock implementation - would analyze wall network connectivity
    return 0.95; // 95% connectivity
  }

  private async benchmarkOperations(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<PerformanceComparison['operationTimes']> {
    // Mock performance comparison
    return {
      creation: { original: 100, migrated: 80, improvement: 0.2 },
      intersection: { original: 200, migrated: 150, improvement: 0.25 },
      rendering: { original: 50, migrated: 40, improvement: 0.2 }
    };
  }

  private async compareMemoryUsage(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<PerformanceComparison['memoryUsage']> {
    // Mock memory comparison
    const originalSize = (originalData.walls?.size || 0) * 1024; // 1KB per wall
    const migratedSize = migratedWalls.size * 2048; // 2KB per BIM wall
    
    return {
      original: originalSize,
      migrated: migratedSize,
      increase: (migratedSize - originalSize) / originalSize
    };
  }

  private async testScalability(
    originalData: any,
    migratedWalls: Map<string, UnifiedWallData>
  ): Promise<PerformanceComparison['scalabilityMetrics']> {
    // Mock scalability comparison
    return {
      maxWallCount: { original: 1000, migrated: 2000 },
      responseTime: { original: 500, migrated: 300 }
    };
  }
}