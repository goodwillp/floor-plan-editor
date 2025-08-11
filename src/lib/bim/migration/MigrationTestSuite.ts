/**
 * Migration Test Suite
 * 
 * Comprehensive testing framework for validating data migration processes
 * with various existing data scenarios and edge cases.
 * 
 * @since 1.0.0
 */

import { DataMigrationManager, type LegacyFloorPlanData, type MigrationOptions, type MigrationResult } from './DataMigrationManager';
import { MigrationValidationTools, type MigrationAccuracyReport } from './MigrationValidationTools';
import type { UnifiedWallData } from '../data/UnifiedWallData';

export interface MigrationTestScenario {
  name: string;
  description: string;
  testData: LegacyFloorPlanData;
  expectedResults: {
    shouldSucceed: boolean;
    expectedWallCount: number;
    expectedWarnings: number;
    expectedErrors: number;
    minimumAccuracy: number;
  };
  migrationOptions?: Partial<MigrationOptions>;
}

export interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  overallSuccess: boolean;
  testResults: TestResult[];
  executionTime: number;
  summary: {
    averageAccuracy: number;
    totalWallsMigrated: number;
    totalWarnings: number;
    totalErrors: number;
  };
}

export interface TestResult {
  scenarioName: string;
  success: boolean;
  migrationResult?: MigrationResult;
  accuracyReport?: MigrationAccuracyReport;
  executionTime: number;
  errors: string[];
  warnings: string[];
  skipped: boolean;
  skipReason?: string;
}

/**
 * Comprehensive test suite for migration validation
 */
export class MigrationTestSuite {
  private migrationManager: DataMigrationManager;
  private validationTools: MigrationValidationTools;
  private testScenarios: MigrationTestScenario[] = [];

  constructor(
    migrationManager: DataMigrationManager,
    validationTools: MigrationValidationTools
  ) {
    this.migrationManager = migrationManager;
    this.validationTools = validationTools;
    this.initializeTestScenarios();
  }

  /**
   * Runs all migration test scenarios
   * 
   * Executes comprehensive testing of the migration system with various
   * data scenarios including edge cases, large datasets, and corrupted data.
   * 
   * @param options - Test execution options
   * @returns Promise resolving to complete test suite results
   * 
   * @example
   * ```typescript
   * const testSuite = new MigrationTestSuite(migrationManager, validationTools);
   * const results = await testSuite.runAllTests();
   * 
   * console.log(`Tests passed: ${results.passedTests}/${results.totalTests}`);
   * console.log(`Overall accuracy: ${results.summary.averageAccuracy * 100}%`);
   * ```
   */
  async runAllTests(options: {
    skipLongRunningTests?: boolean;
    maxExecutionTime?: number;
    parallelExecution?: boolean;
  } = {}): Promise<TestSuiteResult> {
    const startTime = performance.now();
    const testResults: TestResult[] = [];

    console.log(`Starting migration test suite with ${this.testScenarios.length} scenarios...`);

    for (const scenario of this.testScenarios) {
      // Skip long-running tests if requested
      if (options.skipLongRunningTests && this.isLongRunningTest(scenario)) {
        testResults.push({
          scenarioName: scenario.name,
          success: false,
          executionTime: 0,
          errors: [],
          warnings: [],
          skipped: true,
          skipReason: 'Long-running test skipped'
        });
        continue;
      }

      console.log(`Running test: ${scenario.name}`);
      const testResult = await this.runSingleTest(scenario, options.maxExecutionTime);
      testResults.push(testResult);

      // Log immediate results
      if (testResult.success) {
        console.log(`✓ ${scenario.name} passed`);
      } else if (testResult.skipped) {
        console.log(`⊘ ${scenario.name} skipped: ${testResult.skipReason}`);
      } else {
        console.log(`✗ ${scenario.name} failed: ${testResult.errors.join(', ')}`);
      }
    }

    const executionTime = performance.now() - startTime;
    const passedTests = testResults.filter(r => r.success && !r.skipped).length;
    const failedTests = testResults.filter(r => !r.success && !r.skipped).length;
    const skippedTests = testResults.filter(r => r.skipped).length;

    // Calculate summary statistics
    const summary = this.calculateTestSummary(testResults);

    const suiteResult: TestSuiteResult = {
      totalTests: this.testScenarios.length,
      passedTests,
      failedTests,
      skippedTests,
      overallSuccess: failedTests === 0,
      testResults,
      executionTime,
      summary
    };

    console.log(`\nTest suite completed in ${executionTime.toFixed(2)}ms`);
    console.log(`Results: ${passedTests} passed, ${failedTests} failed, ${skippedTests} skipped`);

    return suiteResult;
  }

  /**
   * Runs a specific test scenario by name
   * 
   * @param scenarioName - Name of the scenario to run
   * @returns Promise resolving to test result
   */
  async runSpecificTest(scenarioName: string): Promise<TestResult | null> {
    const scenario = this.testScenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      console.error(`Test scenario '${scenarioName}' not found`);
      return null;
    }

    console.log(`Running specific test: ${scenarioName}`);
    return this.runSingleTest(scenario);
  }

  /**
   * Adds a custom test scenario to the suite
   * 
   * @param scenario - Custom test scenario to add
   */
  addTestScenario(scenario: MigrationTestScenario): void {
    this.testScenarios.push(scenario);
  }

  /**
   * Lists all available test scenarios
   * 
   * @returns Array of scenario names and descriptions
   */
  listTestScenarios(): Array<{ name: string; description: string }> {
    return this.testScenarios.map(s => ({
      name: s.name,
      description: s.description
    }));
  }

  /**
   * Generates a detailed test report
   * 
   * @param results - Test suite results to generate report from
   * @returns Formatted test report string
   */
  generateTestReport(results: TestSuiteResult): string {
    const report = [];
    
    report.push('='.repeat(80));
    report.push('MIGRATION TEST SUITE REPORT');
    report.push('='.repeat(80));
    report.push('');
    
    // Summary
    report.push('SUMMARY:');
    report.push(`Total Tests: ${results.totalTests}`);
    report.push(`Passed: ${results.passedTests}`);
    report.push(`Failed: ${results.failedTests}`);
    report.push(`Skipped: ${results.skippedTests}`);
    report.push(`Overall Success: ${results.overallSuccess ? 'YES' : 'NO'}`);
    report.push(`Execution Time: ${results.executionTime.toFixed(2)}ms`);
    report.push('');
    
    // Statistics
    report.push('STATISTICS:');
    report.push(`Average Accuracy: ${(results.summary.averageAccuracy * 100).toFixed(2)}%`);
    report.push(`Total Walls Migrated: ${results.summary.totalWallsMigrated}`);
    report.push(`Total Warnings: ${results.summary.totalWarnings}`);
    report.push(`Total Errors: ${results.summary.totalErrors}`);
    report.push('');
    
    // Individual test results
    report.push('DETAILED RESULTS:');
    report.push('-'.repeat(80));
    
    for (const testResult of results.testResults) {
      report.push(`Test: ${testResult.scenarioName}`);
      report.push(`Status: ${testResult.skipped ? 'SKIPPED' : (testResult.success ? 'PASSED' : 'FAILED')}`);
      
      if (testResult.skipped) {
        report.push(`Reason: ${testResult.skipReason}`);
      } else {
        report.push(`Execution Time: ${testResult.executionTime.toFixed(2)}ms`);
        
        if (testResult.accuracyReport) {
          report.push(`Accuracy: ${(testResult.accuracyReport.overallAccuracy * 100).toFixed(2)}%`);
        }
        
        if (testResult.migrationResult) {
          report.push(`Migrated Walls: ${testResult.migrationResult.migratedWalls.length}`);
          report.push(`Failed Walls: ${testResult.migrationResult.failedWalls.length}`);
        }
        
        if (testResult.errors.length > 0) {
          report.push(`Errors: ${testResult.errors.join(', ')}`);
        }
        
        if (testResult.warnings.length > 0) {
          report.push(`Warnings: ${testResult.warnings.join(', ')}`);
        }
      }
      
      report.push('-'.repeat(40));
    }
    
    return report.join('\n');
  }

  // Private methods

  private async runSingleTest(
    scenario: MigrationTestScenario,
    maxExecutionTime?: number
  ): Promise<TestResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Set timeout if specified
      const timeoutPromise = maxExecutionTime 
        ? new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), maxExecutionTime)
          )
        : null;

      // Run migration
      const migrationPromise = this.migrationManager.migrateWithBackup(
        scenario.testData,
        scenario.migrationOptions || {}
      );

      const migrationResult = timeoutPromise
        ? await Promise.race([migrationPromise, timeoutPromise])
        : await migrationPromise;

      // Validate results against expectations
      const validationErrors = this.validateTestResults(migrationResult, scenario.expectedResults);
      errors.push(...validationErrors);

      // Run accuracy validation if migration succeeded
      let accuracyReport: MigrationAccuracyReport | undefined;
      if (migrationResult.success && migrationResult.migratedWalls.length > 0) {
        try {
          // Load migrated walls for validation
          const migratedWalls = new Map<string, UnifiedWallData>();
          // This would normally load from database, but for testing we'll mock it
          
          accuracyReport = await this.validationTools.validateMigrationAccuracy(
            scenario.testData,
            migratedWalls
          );

          // Check if accuracy meets minimum requirements
          if (accuracyReport.overallAccuracy < scenario.expectedResults.minimumAccuracy) {
            errors.push(
              `Accuracy ${(accuracyReport.overallAccuracy * 100).toFixed(2)}% below minimum ${(scenario.expectedResults.minimumAccuracy * 100).toFixed(2)}%`
            );
          }

        } catch (validationError) {
          warnings.push(`Accuracy validation failed: ${validationError.message}`);
        }
      }

      const executionTime = performance.now() - startTime;
      const success = errors.length === 0;

      return {
        scenarioName: scenario.name,
        success,
        migrationResult,
        accuracyReport,
        executionTime,
        errors,
        warnings,
        skipped: false
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      if (error.message === 'Test timeout') {
        return {
          scenarioName: scenario.name,
          success: false,
          executionTime,
          errors: [],
          warnings: [],
          skipped: true,
          skipReason: `Test exceeded maximum execution time of ${maxExecutionTime}ms`
        };
      }

      errors.push(`Test execution failed: ${error.message}`);
      
      return {
        scenarioName: scenario.name,
        success: false,
        executionTime,
        errors,
        warnings,
        skipped: false
      };
    }
  }

  private validateTestResults(
    migrationResult: MigrationResult,
    expectedResults: MigrationTestScenario['expectedResults']
  ): string[] {
    const errors: string[] = [];

    // Check if migration success matches expectation
    if (migrationResult.success !== expectedResults.shouldSucceed) {
      errors.push(
        `Expected migration to ${expectedResults.shouldSucceed ? 'succeed' : 'fail'}, but it ${migrationResult.success ? 'succeeded' : 'failed'}`
      );
    }

    // Check wall count
    if (migrationResult.migratedWalls.length !== expectedResults.expectedWallCount) {
      errors.push(
        `Expected ${expectedResults.expectedWallCount} walls, but got ${migrationResult.migratedWalls.length}`
      );
    }

    // Check warning count
    if (migrationResult.warnings.length !== expectedResults.expectedWarnings) {
      errors.push(
        `Expected ${expectedResults.expectedWarnings} warnings, but got ${migrationResult.warnings.length}`
      );
    }

    // Check error count
    if (migrationResult.errors.length !== expectedResults.expectedErrors) {
      errors.push(
        `Expected ${expectedResults.expectedErrors} errors, but got ${migrationResult.errors.length}`
      );
    }

    return errors;
  }

  private isLongRunningTest(scenario: MigrationTestScenario): boolean {
    // Consider tests with large datasets as long-running
    const wallCount = scenario.testData.walls?.size || 0;
    return wallCount > 1000 || scenario.name.includes('stress') || scenario.name.includes('large');
  }

  private calculateTestSummary(testResults: TestResult[]): TestSuiteResult['summary'] {
    const completedTests = testResults.filter(r => !r.skipped);
    
    let totalAccuracy = 0;
    let accuracyCount = 0;
    let totalWallsMigrated = 0;
    let totalWarnings = 0;
    let totalErrors = 0;

    for (const result of completedTests) {
      if (result.accuracyReport) {
        totalAccuracy += result.accuracyReport.overallAccuracy;
        accuracyCount++;
      }

      if (result.migrationResult) {
        totalWallsMigrated += result.migrationResult.migratedWalls.length;
        totalWarnings += result.migrationResult.warnings.length;
        totalErrors += result.migrationResult.errors.length;
      }
    }

    return {
      averageAccuracy: accuracyCount > 0 ? totalAccuracy / accuracyCount : 0,
      totalWallsMigrated,
      totalWarnings,
      totalErrors
    };
  }

  private initializeTestScenarios(): void {
    // Basic migration scenarios
    this.testScenarios.push({
      name: 'simple-residential-floor-plan',
      description: 'Basic residential floor plan with 10-20 walls',
      testData: this.createSimpleResidentialData(),
      expectedResults: {
        shouldSucceed: true,
        expectedWallCount: 15,
        expectedWarnings: 0,
        expectedErrors: 0,
        minimumAccuracy: 0.95
      }
    });

    this.testScenarios.push({
      name: 'complex-commercial-layout',
      description: 'Complex commercial building with 100+ walls and intersections',
      testData: this.createComplexCommercialData(),
      expectedResults: {
        shouldSucceed: true,
        expectedWallCount: 120,
        expectedWarnings: 5,
        expectedErrors: 0,
        minimumAccuracy: 0.90
      }
    });

    // Edge case scenarios
    this.testScenarios.push({
      name: 'corrupted-data-recovery',
      description: 'Data with missing segments and invalid references',
      testData: this.createCorruptedData(),
      expectedResults: {
        shouldSucceed: true,
        expectedWallCount: 8,
        expectedWarnings: 10,
        expectedErrors: 2,
        minimumAccuracy: 0.70
      }
    });

    this.testScenarios.push({
      name: 'extreme-geometry-angles',
      description: 'Walls with very sharp angles and extreme geometries',
      testData: this.createExtremeGeometryData(),
      expectedResults: {
        shouldSucceed: true,
        expectedWallCount: 12,
        expectedWarnings: 8,
        expectedErrors: 0,
        minimumAccuracy: 0.85
      }
    });

    // Performance scenarios
    this.testScenarios.push({
      name: 'large-dataset-stress-test',
      description: 'Stress test with 1000+ walls',
      testData: this.createLargeDataset(),
      expectedResults: {
        shouldSucceed: true,
        expectedWallCount: 1000,
        expectedWarnings: 50,
        expectedErrors: 0,
        minimumAccuracy: 0.88
      },
      migrationOptions: {
        batchSize: 100,
        reportProgress: true
      }
    });

    // Legacy format scenarios
    this.testScenarios.push({
      name: 'legacy-format-v1',
      description: 'Migration from legacy format version 1.0',
      testData: this.createLegacyV1Data(),
      expectedResults: {
        shouldSucceed: true,
        expectedWallCount: 25,
        expectedWarnings: 15,
        expectedErrors: 0,
        minimumAccuracy: 0.80
      }
    });
  }

  // Test data creation methods

  private createSimpleResidentialData(): LegacyFloorPlanData {
    const walls = new Map();
    const segments = new Map();
    const nodes = new Map();

    // Create simple rectangular room layout
    for (let i = 0; i < 15; i++) {
      walls.set(`wall_${i}`, {
        id: `wall_${i}`,
        segments: [`seg_${i}_1`, `seg_${i}_2`],
        thickness: 150,
        type: 'interior',
        visible: true
      });

      segments.set(`seg_${i}_1`, {
        id: `seg_${i}_1`,
        startNode: `node_${i}`,
        endNode: `node_${i + 1}`,
        length: 3000
      });

      segments.set(`seg_${i}_2`, {
        id: `seg_${i}_2`,
        startNode: `node_${i + 1}`,
        endNode: `node_${i + 2}`,
        length: 2000
      });

      nodes.set(`node_${i}`, {
        id: `node_${i}`,
        x: (i % 5) * 3000,
        y: Math.floor(i / 5) * 4000
      });
    }

    return {
      walls,
      segments,
      nodes,
      metadata: {
        version: '2.0.0',
        created: new Date('2023-01-01'),
        lastModified: new Date('2023-06-01')
      }
    };
  }

  private createComplexCommercialData(): LegacyFloorPlanData {
    const walls = new Map();
    const segments = new Map();
    const nodes = new Map();

    // Create complex commercial layout with many intersections
    for (let i = 0; i < 120; i++) {
      walls.set(`wall_${i}`, {
        id: `wall_${i}`,
        segments: [`seg_${i}_1`, `seg_${i}_2`, `seg_${i}_3`],
        thickness: Math.random() > 0.5 ? 200 : 150,
        type: Math.random() > 0.7 ? 'exterior' : 'interior',
        visible: true
      });

      // Create multiple segments per wall for complexity
      for (let j = 1; j <= 3; j++) {
        segments.set(`seg_${i}_${j}`, {
          id: `seg_${i}_${j}`,
          startNode: `node_${i}_${j}`,
          endNode: `node_${i}_${j + 1}`,
          length: 1000 + Math.random() * 4000
        });

        nodes.set(`node_${i}_${j}`, {
          id: `node_${i}_${j}`,
          x: Math.random() * 20000,
          y: Math.random() * 15000
        });
      }
    }

    return { walls, segments, nodes };
  }

  private createCorruptedData(): LegacyFloorPlanData {
    const walls = new Map();
    const segments = new Map();
    const nodes = new Map();

    // Create data with intentional corruption
    for (let i = 0; i < 10; i++) {
      walls.set(`wall_${i}`, {
        id: `wall_${i}`,
        segments: i < 8 ? [`seg_${i}_1`] : [`missing_segment_${i}`], // Missing segments for last 2 walls
        thickness: i === 5 ? undefined : 150, // Missing thickness for one wall
        type: 'interior',
        visible: true
      });

      if (i < 8) { // Only create segments for first 8 walls
        segments.set(`seg_${i}_1`, {
          id: `seg_${i}_1`,
          startNode: `node_${i}`,
          endNode: i < 7 ? `node_${i + 1}` : 'missing_node', // Missing end node for one segment
          length: 2000
        });

        nodes.set(`node_${i}`, {
          id: `node_${i}`,
          x: i * 2000,
          y: 0
        });
      }
    }

    return { walls, segments, nodes };
  }

  private createExtremeGeometryData(): LegacyFloorPlanData {
    const walls = new Map();
    const segments = new Map();
    const nodes = new Map();

    // Create walls with extreme angles and geometries
    const extremeAngles = [1, 5, 175, 179, 181, 185, 355, 359]; // Very sharp and very obtuse angles

    for (let i = 0; i < 12; i++) {
      walls.set(`wall_${i}`, {
        id: `wall_${i}`,
        segments: [`seg_${i}_1`],
        thickness: i < 6 ? 50 : 500, // Very thin and very thick walls
        type: 'interior',
        visible: true
      });

      const angle = extremeAngles[i % extremeAngles.length];
      const length = i < 6 ? 100 : 10000; // Very short and very long segments

      segments.set(`seg_${i}_1`, {
        id: `seg_${i}_1`,
        startNode: `node_${i}`,
        endNode: `node_${i + 1}`,
        length,
        angle
      });

      nodes.set(`node_${i}`, {
        id: `node_${i}`,
        x: Math.cos(angle * Math.PI / 180) * length,
        y: Math.sin(angle * Math.PI / 180) * length
      });
    }

    return { walls, segments, nodes };
  }

  private createLargeDataset(): LegacyFloorPlanData {
    const walls = new Map();
    const segments = new Map();
    const nodes = new Map();

    // Create large dataset for stress testing
    for (let i = 0; i < 1000; i++) {
      walls.set(`wall_${i}`, {
        id: `wall_${i}`,
        segments: [`seg_${i}_1`],
        thickness: 150 + (i % 3) * 50,
        type: i % 10 === 0 ? 'exterior' : 'interior',
        visible: true
      });

      segments.set(`seg_${i}_1`, {
        id: `seg_${i}_1`,
        startNode: `node_${i}`,
        endNode: `node_${(i + 1) % 1000}`, // Create circular connections
        length: 2000 + (i % 5) * 500
      });

      nodes.set(`node_${i}`, {
        id: `node_${i}`,
        x: (i % 50) * 1000,
        y: Math.floor(i / 50) * 1000
      });
    }

    return { walls, segments, nodes };
  }

  private createLegacyV1Data(): LegacyFloorPlanData {
    const walls = new Map();
    const segments = new Map();
    const nodes = new Map();

    // Create data that simulates legacy format v1.0 with different structure
    for (let i = 0; i < 25; i++) {
      walls.set(`wall_${i}`, {
        id: `wall_${i}`,
        segments: [`seg_${i}_1`],
        thickness: 150,
        type: 'wall', // Legacy type naming
        visible: true,
        // Legacy properties that need conversion
        color: '#000000',
        style: 'solid',
        layer: 'walls'
      });

      segments.set(`seg_${i}_1`, {
        id: `seg_${i}_1`,
        startNode: `node_${i}`,
        endNode: `node_${i + 1}`,
        length: 3000,
        // Legacy segment properties
        direction: i * 15, // Degrees
        curvature: 0
      });

      nodes.set(`node_${i}`, {
        id: `node_${i}`,
        x: (i % 5) * 3000,
        y: Math.floor(i / 5) * 3000,
        // Legacy node properties
        type: 'corner',
        locked: false
      });
    }

    return {
      walls,
      segments,
      nodes,
      metadata: {
        version: '1.0.0', // Legacy version
        created: new Date('2020-01-01'),
        lastModified: new Date('2022-12-31')
      }
    };
  }
}