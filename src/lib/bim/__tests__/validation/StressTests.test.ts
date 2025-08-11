import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationPipeline } from '../../validation/ValidationPipeline';
import { AutomaticRecoverySystem } from '../../validation/AutomaticRecoverySystem';
import { ValidationReportingSystem } from '../../validation/ValidationReportingSystem';
import { WallSolid } from '../../geometry/WallSolid';
import { GeometricError, GeometricErrorType, ErrorSeverity } from '../../validation/GeometricError';
import { TestDataFactory } from '../helpers/TestDataFactory';

describe('Stress Tests - Validation and Recovery System', () => {
  let validationPipeline: ValidationPipeline;
  let recoverySystem: AutomaticRecoverySystem;
  let reportingSystem: ValidationReportingSystem;
  let testDataFactory: TestDataFactory;

  beforeEach(() => {
    validationPipeline = new ValidationPipeline();
    recoverySystem = new AutomaticRecoverySystem();
    reportingSystem = new ValidationReportingSystem();
    testDataFactory = new TestDataFactory();
  });

  describe('Large Scale Validation Tests', () => {
    it('should handle 1000+ walls efficiently', async () => {
      const walls = Array(1000).fill(null).map(() => 
        testDataFactory.createValidWallSolid()
      );
      
      const startTime = performance.now();
      const results = await Promise.all(
        walls.map(wall => validationPipeline.executeValidation(wall, 'batch_validation', 'post'))
      );
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const averageTimePerWall = totalTime / walls.length;
      
      expect(results.length).toBe(1000);
      expect(results.every(r => r.success)).toBe(true);
      expect(averageTimePerWall).toBeLessThan(10); // Less than 10ms per wall
      expect(totalTime).toBeLessThan(30000); // Less than 30 seconds total
      
      console.log(`Validated 1000 walls in ${totalTime.toFixed(2)}ms (${averageTimePerWall.toFixed(2)}ms per wall)`);
    });

    it('should handle complex intersection networks', async () => {
      const complexFloorPlan = testDataFactory.createComplexIntersectionNetwork(100);
      
      const startTime = performance.now();
      const results = await Promise.all(
        complexFloorPlan.map(wall => validationPipeline.executeValidation(wall, 'complex_network', 'post'))
      );
      const endTime = performance.now();
      
      expect(results.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(15000); // Less than 15 seconds
      
      // Check that complex intersections are properly validated
      const hasIntersectionValidation = results.some(r => 
        Array.from(r.stageResults.keys()).includes('topology')
      );
      expect(hasIntersectionValidation).toBe(true);
    });

    it('should maintain performance with high vertex count walls', async () => {
      const highVertexWalls = Array(50).fill(null).map(() => 
        testDataFactory.createHighVertexCountWall(1000) // 1000 vertices per wall
      );
      
      const startTime = performance.now();
      const results = await Promise.all(
        highVertexWalls.map(wall => validationPipeline.executeValidation(wall, 'high_vertex', 'post'))
      );
      const endTime = performance.now();
      
      expect(results.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(20000); // Less than 20 seconds
      
      // Check for performance warnings
      const performanceWarnings = results.flatMap(r => 
        Array.from(r.stageResults.values()).flatMap(s => s.warnings)
      ).filter(w => w.includes('High vertex count'));
      
      expect(performanceWarnings.length).toBeGreaterThan(0);
    });

    it('should handle mixed complexity scenarios', async () => {
      const mixedWalls = [
        ...Array(500).fill(null).map(() => testDataFactory.createValidWallSolid()),
        ...Array(300).fill(null).map(() => testDataFactory.createWallSolidWithMinorIssues()),
        ...Array(150).fill(null).map(() => testDataFactory.createWallSolidWithMultipleIssues()),
        ...Array(50).fill(null).map(() => testDataFactory.createComplexWallSolid())
      ];
      
      const startTime = performance.now();
      const results = await Promise.all(
        mixedWalls.map(wall => validationPipeline.executeValidation(wall, 'mixed_complexity', 'post'))
      );
      const endTime = performance.now();
      
      expect(results.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(45000); // Less than 45 seconds
      
      // Analyze results distribution
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      expect(successCount).toBeGreaterThan(500); // At least simple walls should pass
      expect(failureCount).toBeGreaterThan(0); // Some complex walls should fail
      
      console.log(`Mixed complexity: ${successCount} successes, ${failureCount} failures`);
    });
  });

  describe('Memory Usage and Leak Detection', () => {
    it('should not leak memory during large batch processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple batches
      for (let batch = 0; batch < 10; batch++) {
        const walls = Array(100).fill(null).map(() => 
          testDataFactory.createValidWallSolid()
        );
        
        const results = await Promise.all(
          walls.map(wall => validationPipeline.executeValidation(wall, 'memory_test', 'post'))
        );
        
        expect(results.length).toBe(100);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`);
    });

    it('should handle long-running validation sessions', async () => {
      const sessionDuration = 5000; // 5 seconds
      const startTime = Date.now();
      let processedCount = 0;
      
      while (Date.now() - startTime < sessionDuration) {
        const wall = testDataFactory.createValidWallSolid();
        const result = await validationPipeline.executeValidation(wall, 'long_running', 'post');
        
        expect(result).toBeDefined();
        processedCount++;
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      expect(processedCount).toBeGreaterThan(100); // Should process at least 100 walls in 5 seconds
      console.log(`Processed ${processedCount} walls in long-running session`);
    });

    it('should clean up resources after validation', async () => {
      const walls = Array(100).fill(null).map(() => 
        testDataFactory.createComplexWallSolid()
      );
      
      const memoryBefore = process.memoryUsage().heapUsed;
      
      const results = await Promise.all(
        walls.map(wall => validationPipeline.executeValidation(wall, 'resource_cleanup', 'post'))
      );
      
      // Clear references
      walls.length = 0;
      results.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDifference = memoryAfter - memoryBefore;
      
      // Memory should not increase significantly after cleanup
      expect(memoryDifference).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });

  describe('Recovery System Stress Tests', () => {
    it('should handle mass recovery operations', async () => {
      const invalidWalls = Array(500).fill(null).map(() => 
        testDataFactory.createWallSolidWithMultipleIssues()
      );
      
      const errors = invalidWalls.map(() => [
        testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY),
        testDataFactory.createGeometricError(GeometricErrorType.DUPLICATE_VERTICES)
      ]);
      
      const startTime = performance.now();
      const sessions = await Promise.all(
        invalidWalls.map((wall, index) => 
          recoverySystem.attemptRecovery(wall, errors[index])
        )
      );
      const endTime = performance.now();
      
      expect(sessions.length).toBe(500);
      expect(endTime - startTime).toBeLessThan(30000); // Less than 30 seconds
      
      const successfulRecoveries = sessions.filter(s => 
        s.appliedStrategies.length > 0 && !s.requiresUserIntervention
      ).length;
      
      expect(successfulRecoveries).toBeGreaterThan(200); // At least 40% success rate
      
      console.log(`Mass recovery: ${successfulRecoveries}/${sessions.length} successful`);
    });

    it('should handle cascading recovery scenarios', async () => {
      // Create walls where recovery of one issue might create another
      const cascadingWalls = Array(100).fill(null).map(() => 
        testDataFactory.createWallSolidWithCascadingIssues()
      );
      
      const errors = cascadingWalls.map(() => [
        testDataFactory.createGeometricError(GeometricErrorType.SELF_INTERSECTION),
        testDataFactory.createGeometricError(GeometricErrorType.COMPLEXITY_EXCEEDED)
      ]);
      
      const sessions = await Promise.all(
        cascadingWalls.map((wall, index) => 
          recoverySystem.attemptRecovery(wall, errors[index])
        )
      );
      
      expect(sessions.length).toBe(100);
      
      // Check that recovery attempts were made
      const totalRecoveryAttempts = sessions.reduce((sum, s) => sum + s.recoveryHistory.length, 0);
      expect(totalRecoveryAttempts).toBeGreaterThan(100);
      
      // Some sessions should require user intervention due to cascading issues
      const userInterventionRequired = sessions.filter(s => s.requiresUserIntervention).length;
      expect(userInterventionRequired).toBeGreaterThan(0);
    });

    it('should maintain quality thresholds under stress', async () => {
      const recoverySystemWithStrictThreshold = new AutomaticRecoverySystem({
        qualityThreshold: 0.9 // Very strict threshold
      });
      
      const wallsRequiringSignificantRecovery = Array(200).fill(null).map(() => 
        testDataFactory.createWallSolidRequiringSignificantRecovery()
      );
      
      const errors = wallsRequiringSignificantRecovery.map(() => [
        testDataFactory.createGeometricError(GeometricErrorType.COMPLEXITY_EXCEEDED)
      ]);
      
      const sessions = await Promise.all(
        wallsRequiringSignificantRecovery.map((wall, index) => 
          recoverySystemWithStrictThreshold.attemptRecovery(wall, errors[index])
        )
      );
      
      // With strict quality threshold, most should require user intervention
      const userInterventionCount = sessions.filter(s => s.requiresUserIntervention).length;
      expect(userInterventionCount).toBeGreaterThan(150); // At least 75%
      
      // Quality impact should be within acceptable bounds for completed recoveries
      const completedRecoveries = sessions.filter(s => !s.requiresUserIntervention);
      for (const session of completedRecoveries) {
        expect(session.totalQualityImpact).toBeLessThan(0.1); // Less than 10% impact
      }
    });
  });

  describe('Reporting System Stress Tests', () => {
    it('should generate reports for large datasets efficiently', async () => {
      // Generate large validation dataset
      const validationResults = Array(1000).fill(null).map(() => ({
        success: Math.random() > 0.3, // 70% success rate
        stageResults: new Map([
          ['geometric_consistency', {
            passed: Math.random() > 0.2,
            errors: Math.random() > 0.5 ? [] : [testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)],
            warnings: Math.random() > 0.7 ? [] : ['Test warning'],
            metrics: { geometricAccuracy: Math.random() },
            processingTime: Math.random() * 100
          }]
        ]),
        recoveryResults: new Map(),
        overallQuality: testDataFactory.createQualityMetrics(),
        totalProcessingTime: Math.random() * 1000,
        recommendedActions: []
      }));
      
      const recoveryResults = Array(300).fill(null).map(() => ({
        sessionId: `session_${Math.random()}`,
        startTime: performance.now(),
        originalData: null,
        currentData: testDataFactory.createValidWallSolid(),
        appliedStrategies: ['test_strategy'],
        totalQualityImpact: Math.random() * 0.5,
        recoveryHistory: [],
        isComplete: true,
        requiresUserIntervention: Math.random() > 0.6
      }));
      
      const startTime = performance.now();
      const report = reportingSystem.generateReport(validationResults as any, recoveryResults as any);
      const endTime = performance.now();
      
      expect(report).toBeDefined();
      expect(report.summary.totalItemsValidated).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds
      
      console.log(`Generated report for 1000 items in ${(endTime - startTime).toFixed(2)}ms`);
    });

    it('should handle report export for large datasets', async () => {
      const largeValidationResults = Array(2000).fill(null).map(() => ({
        success: Math.random() > 0.4,
        stageResults: new Map([
          ['geometric_consistency', {
            passed: Math.random() > 0.3,
            errors: Array(Math.floor(Math.random() * 3)).fill(null).map(() => 
              testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY)
            ),
            warnings: Array(Math.floor(Math.random() * 2)).fill('Test warning'),
            metrics: { geometricAccuracy: Math.random() },
            processingTime: Math.random() * 200
          }]
        ]),
        recoveryResults: new Map(),
        overallQuality: testDataFactory.createQualityMetrics(),
        totalProcessingTime: Math.random() * 2000,
        recommendedActions: ['Test recommendation']
      }));
      
      const report = reportingSystem.generateReport(largeValidationResults as any, []);
      
      const startTime = performance.now();
      const jsonExport = reportingSystem.exportReport(report.reportId, 'json' as any);
      const htmlExport = reportingSystem.exportReport(report.reportId, 'html' as any);
      const csvExport = reportingSystem.exportReport(report.reportId, 'csv' as any);
      const endTime = performance.now();
      
      expect(jsonExport.success).toBe(true);
      expect(htmlExport.success).toBe(true);
      expect(csvExport.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // Less than 3 seconds
      
      // Check export sizes are reasonable
      expect(jsonExport.exportedData!.length).toBeGreaterThan(1000);
      expect(htmlExport.exportedData!.length).toBeGreaterThan(1000);
      expect(csvExport.exportedData!.length).toBeGreaterThan(500);
    });

    it('should maintain report history efficiently', async () => {
      // Generate many reports
      const reportCount = 100;
      const reportIds: string[] = [];
      
      const startTime = performance.now();
      for (let i = 0; i < reportCount; i++) {
        const validationResults = Array(10).fill(null).map(() => ({
          success: true,
          stageResults: new Map(),
          recoveryResults: new Map(),
          overallQuality: testDataFactory.createQualityMetrics(),
          totalProcessingTime: 100,
          recommendedActions: []
        }));
        
        const report = reportingSystem.generateReport(validationResults as any, []);
        reportIds.push(report.reportId);
      }
      const endTime = performance.now();
      
      expect(reportIds.length).toBe(reportCount);
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds
      
      // Test history retrieval
      const historyStartTime = performance.now();
      const history = reportingSystem.getReportHistory(50);
      const historyEndTime = performance.now();
      
      expect(history.length).toBe(50);
      expect(historyEndTime - historyStartTime).toBeLessThan(100); // Very fast retrieval
      
      console.log(`Generated ${reportCount} reports in ${(endTime - startTime).toFixed(2)}ms`);
    });
  });

  describe('Concurrent Processing Tests', () => {
    it('should handle concurrent validation requests', async () => {
      const concurrentRequests = 50;
      const wallsPerRequest = 20;
      
      const requests = Array(concurrentRequests).fill(null).map(async () => {
        const walls = Array(wallsPerRequest).fill(null).map(() => 
          testDataFactory.createValidWallSolid()
        );
        
        return Promise.all(
          walls.map(wall => validationPipeline.executeValidation(wall, 'concurrent_test', 'post'))
        );
      });
      
      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();
      
      expect(results.length).toBe(concurrentRequests);
      expect(results.every(batch => batch.length === wallsPerRequest)).toBe(true);
      expect(endTime - startTime).toBeLessThan(15000); // Less than 15 seconds
      
      const totalValidations = results.flat().length;
      expect(totalValidations).toBe(concurrentRequests * wallsPerRequest);
      
      console.log(`Processed ${totalValidations} concurrent validations in ${(endTime - startTime).toFixed(2)}ms`);
    });

    it('should handle concurrent recovery operations', async () => {
      const concurrentRecoveries = 30;
      
      const recoveryRequests = Array(concurrentRecoveries).fill(null).map(async () => {
        const invalidWall = testDataFactory.createWallSolidWithMultipleIssues();
        const errors = [
          testDataFactory.createGeometricError(GeometricErrorType.DEGENERATE_GEOMETRY),
          testDataFactory.createGeometricError(GeometricErrorType.DUPLICATE_VERTICES)
        ];
        
        return recoverySystem.attemptRecovery(invalidWall, errors);
      });
      
      const startTime = performance.now();
      const sessions = await Promise.all(recoveryRequests);
      const endTime = performance.now();
      
      expect(sessions.length).toBe(concurrentRecoveries);
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds
      
      const successfulSessions = sessions.filter(s => s.appliedStrategies.length > 0).length;
      expect(successfulSessions).toBeGreaterThan(0);
      
      console.log(`Completed ${concurrentRecoveries} concurrent recoveries in ${(endTime - startTime).toFixed(2)}ms`);
    });
  });

  describe('Edge Case Stress Tests', () => {
    it('should handle extremely complex geometric scenarios', async () => {
      const extremeWalls = [
        testDataFactory.createWallSolidWithExtremeAngles(),
        testDataFactory.createWallSolidWithMicroscopicFeatures(),
        testDataFactory.createWallSolidWithGiantCoordinates(),
        testDataFactory.createWallSolidWithNearZeroThickness(),
        testDataFactory.createWallSolidWithCircularReferences()
      ];
      
      const results = await Promise.all(
        extremeWalls.map(wall => validationPipeline.executeValidation(wall, 'extreme_test', 'post'))
      );
      
      expect(results.length).toBe(5);
      
      // System should handle extreme cases without crashing
      expect(results.every(r => r !== null && r !== undefined)).toBe(true);
      
      // Most extreme cases should fail validation but not crash
      const failureCount = results.filter(r => !r.success).length;
      expect(failureCount).toBeGreaterThan(0);
    });

    it('should handle pathological input data', async () => {
      const pathologicalWalls = [
        testDataFactory.createWallSolidWithInfiniteLoop(),
        testDataFactory.createWallSolidWithNaNValues(),
        testDataFactory.createWallSolidWithNegativeInfinity(),
        testDataFactory.createWallSolidWithEmptyGeometry(),
        testDataFactory.createWallSolidWithCorruptedData()
      ];
      
      const results = await Promise.all(
        pathologicalWalls.map(async (wall) => {
          try {
            return await validationPipeline.executeValidation(wall, 'pathological_test', 'post');
          } catch (error) {
            // Should not throw unhandled exceptions
            return null;
          }
        })
      );
      
      expect(results.length).toBe(5);
      
      // System should handle pathological cases gracefully
      const validResults = results.filter(r => r !== null).length;
      expect(validResults).toBeGreaterThan(0); // At least some should be handled
    });

    it('should maintain stability under resource pressure', async () => {
      // Simulate resource pressure by creating many large objects
      const largeWalls = Array(100).fill(null).map(() => 
        testDataFactory.createVeryLargeWallSolid(5000) // 5000 vertices
      );
      
      const startTime = performance.now();
      let completedCount = 0;
      let errorCount = 0;
      
      for (const wall of largeWalls) {
        try {
          const result = await validationPipeline.executeValidation(wall, 'resource_pressure', 'post');
          if (result) completedCount++;
        } catch (error) {
          errorCount++;
        }
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      const endTime = performance.now();
      
      expect(completedCount + errorCount).toBe(100);
      expect(completedCount).toBeGreaterThan(50); // At least 50% should complete
      expect(endTime - startTime).toBeLessThan(60000); // Less than 1 minute
      
      console.log(`Resource pressure test: ${completedCount} completed, ${errorCount} errors`);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance across runs', async () => {
      const testRuns = 5;
      const wallsPerRun = 100;
      const performanceTimes: number[] = [];
      
      for (let run = 0; run < testRuns; run++) {
        const walls = Array(wallsPerRun).fill(null).map(() => 
          testDataFactory.createValidWallSolid()
        );
        
        const startTime = performance.now();
        const results = await Promise.all(
          walls.map(wall => validationPipeline.executeValidation(wall, 'performance_regression', 'post'))
        );
        const endTime = performance.now();
        
        expect(results.length).toBe(wallsPerRun);
        performanceTimes.push(endTime - startTime);
      }
      
      // Calculate performance statistics
      const avgTime = performanceTimes.reduce((sum, time) => sum + time, 0) / testRuns;
      const maxTime = Math.max(...performanceTimes);
      const minTime = Math.min(...performanceTimes);
      const variance = performanceTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / testRuns;
      const stdDev = Math.sqrt(variance);
      
      // Performance should be consistent (low standard deviation relative to mean)
      const coefficientOfVariation = stdDev / avgTime;
      expect(coefficientOfVariation).toBeLessThan(0.3); // Less than 30% variation
      
      console.log(`Performance regression test - Avg: ${avgTime.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms, CV: ${(coefficientOfVariation * 100).toFixed(2)}%`);
    });

    it('should scale linearly with input size', async () => {
      const testSizes = [10, 50, 100, 200];
      const performanceData: Array<{ size: number; time: number }> = [];
      
      for (const size of testSizes) {
        const walls = Array(size).fill(null).map(() => 
          testDataFactory.createValidWallSolid()
        );
        
        const startTime = performance.now();
        const results = await Promise.all(
          walls.map(wall => validationPipeline.executeValidation(wall, 'scalability_test', 'post'))
        );
        const endTime = performance.now();
        
        expect(results.length).toBe(size);
        performanceData.push({ size, time: endTime - startTime });
      }
      
      // Check for roughly linear scaling
      const timePerItem = performanceData.map(d => d.time / d.size);
      const avgTimePerItem = timePerItem.reduce((sum, time) => sum + time, 0) / timePerItem.length;
      
      // Time per item should be relatively consistent (indicating linear scaling)
      for (const time of timePerItem) {
        const deviation = Math.abs(time - avgTimePerItem) / avgTimePerItem;
        expect(deviation).toBeLessThan(0.5); // Less than 50% deviation from average
      }
      
      console.log('Scalability test results:', performanceData.map(d => 
        `${d.size} items: ${d.time.toFixed(2)}ms (${(d.time/d.size).toFixed(2)}ms per item)`
      ).join(', '));
    });
  });
});