import type { WallSolid } from '../geometry/WallSolid';
import { ValidationPipeline } from './ValidationPipeline';
import { AutomaticRecoverySystem } from './AutomaticRecoverySystem';
import { GeometricError, GeometricErrorType, ErrorSeverity } from './GeometricError';

export interface BenchmarkConfiguration {
  testSizes: number[];
  iterations: number;
  warmupIterations: number;
  memoryMonitoring: boolean;
  performanceThresholds: PerformanceThresholds;
  outputFormat: 'console' | 'json' | 'csv';
}

export interface PerformanceThresholds {
  maxValidationTimePerWall: number; // milliseconds
  maxRecoveryTimePerError: number; // milliseconds
  maxMemoryUsageIncrease: number; // percentage
  minThroughput: number; // walls per second
  maxMemoryLeakRate: number; // MB per 1000 operations
}

export interface BenchmarkResult {
  testName: string;
  configuration: BenchmarkConfiguration;
  results: OperationBenchmark[];
  memoryProfile: MemoryProfile;
  scalabilityAnalysis: ScalabilityAnalysis;
  regressionAnalysis: RegressionAnalysis;
  timestamp: Date;
  environment: EnvironmentInfo;
}

export interface OperationBenchmark {
  operationType: string;
  inputSize: number;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  throughput: number;
  memoryUsage: number;
  successRate: number;
  errorRate: number;
}

export interface MemoryProfile {
  initialMemory: number;
  peakMemory: number;
  finalMemory: number;
  memoryIncrease: number;
  memoryLeakDetected: boolean;
  gcCollections: number;
  memoryTimeline: MemorySnapshot[];
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface ScalabilityAnalysis {
  linearScaling: boolean;
  scalingFactor: number;
  performanceDegradation: number;
  recommendedMaxSize: number;
  bottleneckIdentified: string | null;
}

export interface RegressionAnalysis {
  baselineResults: OperationBenchmark[];
  currentResults: OperationBenchmark[];
  regressionDetected: boolean;
  performanceChange: number;
  significantChanges: PerformanceChange[];
}

export interface PerformanceChange {
  operation: string;
  inputSize: number;
  changePercent: number;
  significance: 'minor' | 'moderate' | 'major' | 'critical';
  threshold: number;
}

export interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuModel: string;
  totalMemory: number;
  freeMemory: number;
  timestamp: Date;
}

/**
 * Comprehensive performance benchmarking suite for BIM validation and recovery systems
 */
export class PerformanceBenchmarkSuite {
  private validationPipeline: ValidationPipeline;
  private recoverySystem: AutomaticRecoverySystem;
  private baselineResults: Map<string, OperationBenchmark[]> = new Map();

  constructor(
    validationPipeline: ValidationPipeline,
    recoverySystem: AutomaticRecoverySystem
  ) {
    this.validationPipeline = validationPipeline;
    this.recoverySystem = recoverySystem;
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runBenchmarkSuite(config: BenchmarkConfiguration): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const environment = this.captureEnvironmentInfo();
    
    console.log('Starting Performance Benchmark Suite...');
    console.log(`Test sizes: ${config.testSizes.join(', ')}`);
    console.log(`Iterations per test: ${config.iterations}`);
    
    // Initialize memory monitoring
    const memoryProfile = this.initializeMemoryMonitoring();
    
    // Run benchmarks
    const results: OperationBenchmark[] = [];
    
    // Validation benchmarks
    for (const size of config.testSizes) {
      const validationBenchmark = await this.benchmarkValidation(size, config);
      results.push(validationBenchmark);
      
      const recoveryBenchmark = await this.benchmarkRecovery(size, config);
      results.push(recoveryBenchmark);
      
      const concurrentBenchmark = await this.benchmarkConcurrentOperations(size, config);
      results.push(concurrentBenchmark);
      
      // Memory cleanup between tests
      if (global.gc) {
        global.gc();
      }
      
      this.updateMemoryProfile(memoryProfile);
    }
    
    // Finalize memory monitoring
    this.finalizeMemoryProfile(memoryProfile);
    
    // Analyze results
    const scalabilityAnalysis = this.analyzeScalability(results);
    const regressionAnalysis = this.analyzeRegression(results);
    
    const totalTime = Date.now() - startTime;
    console.log(`Benchmark suite completed in ${totalTime}ms`);
    
    return {
      testName: 'BIM Validation Performance Benchmark',
      configuration: config,
      results,
      memoryProfile,
      scalabilityAnalysis,
      regressionAnalysis,
      timestamp: new Date(),
      environment
    };
  }

  /**
   * Benchmark validation operations
   */
  private async benchmarkValidation(
    wallCount: number, 
    config: BenchmarkConfiguration
  ): Promise<OperationBenchmark> {
    const operationType = `validation_${wallCount}_walls`;
    const times: number[] = [];
    const memoryUsages: number[] = [];
    let successCount = 0;
    let errorCount = 0;

    console.log(`Benchmarking validation with ${wallCount} walls...`);

    // Warmup
    for (let i = 0; i < config.warmupIterations; i++) {
      const walls = this.generateTestWalls(wallCount);
      await Promise.all(walls.map(wall => 
        this.validationPipeline.executeValidation(wall, 'benchmark', 'post')
      ));
    }

    // Actual benchmark
    for (let iteration = 0; iteration < config.iterations; iteration++) {
      const walls = this.generateTestWalls(wallCount);
      const memoryBefore = process.memoryUsage().heapUsed;
      
      const startTime = performance.now();
      
      try {
        const results = await Promise.all(walls.map(wall => 
          this.validationPipeline.executeValidation(wall, 'benchmark', 'post')
        ));
        
        const endTime = performance.now();
        const memoryAfter = process.memoryUsage().heapUsed;
        
        times.push(endTime - startTime);
        memoryUsages.push(memoryAfter - memoryBefore);
        
        successCount += results.filter(r => r.success).length;
        errorCount += results.filter(r => !r.success).length;
        
      } catch (error) {
        errorCount += wallCount;
        times.push(config.performanceThresholds.maxValidationTimePerWall * wallCount);
      }
      
      // Progress indicator
      if ((iteration + 1) % Math.max(1, Math.floor(config.iterations / 10)) === 0) {
        console.log(`  Progress: ${iteration + 1}/${config.iterations} iterations`);
      }
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);
    const throughput = (wallCount * config.iterations * 1000) / (averageTime * config.iterations);
    const averageMemoryUsage = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
    const successRate = successCount / (wallCount * config.iterations);
    const errorRate = errorCount / (wallCount * config.iterations);

    return {
      operationType,
      inputSize: wallCount,
      iterations: config.iterations,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      throughput,
      memoryUsage: averageMemoryUsage,
      successRate,
      errorRate
    };
  }

  /**
   * Benchmark recovery operations
   */
  private async benchmarkRecovery(
    errorCount: number, 
    config: BenchmarkConfiguration
  ): Promise<OperationBenchmark> {
    const operationType = `recovery_${errorCount}_errors`;
    const times: number[] = [];
    const memoryUsages: number[] = [];
    let successCount = 0;
    let failureCount = 0;

    console.log(`Benchmarking recovery with ${errorCount} errors...`);

    // Warmup
    for (let i = 0; i < config.warmupIterations; i++) {
      const { walls, errors } = this.generateTestWallsWithErrors(errorCount);
      await Promise.all(walls.map((wall, index) => 
        this.recoverySystem.attemptRecovery(wall, errors[index])
      ));
    }

    // Actual benchmark
    for (let iteration = 0; iteration < config.iterations; iteration++) {
      const { walls, errors } = this.generateTestWallsWithErrors(errorCount);
      const memoryBefore = process.memoryUsage().heapUsed;
      
      const startTime = performance.now();
      
      try {
        const sessions = await Promise.all(walls.map((wall, index) => 
          this.recoverySystem.attemptRecovery(wall, errors[index])
        ));
        
        const endTime = performance.now();
        const memoryAfter = process.memoryUsage().heapUsed;
        
        times.push(endTime - startTime);
        memoryUsages.push(memoryAfter - memoryBefore);
        
        successCount += sessions.filter(s => s.appliedStrategies.length > 0).length;
        failureCount += sessions.filter(s => s.requiresUserIntervention).length;
        
      } catch (error) {
        failureCount += errorCount;
        times.push(config.performanceThresholds.maxRecoveryTimePerError * errorCount);
      }
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);
    const throughput = (errorCount * config.iterations * 1000) / (averageTime * config.iterations);
    const averageMemoryUsage = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
    const successRate = successCount / (errorCount * config.iterations);
    const errorRate = failureCount / (errorCount * config.iterations);

    return {
      operationType,
      inputSize: errorCount,
      iterations: config.iterations,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      throughput,
      memoryUsage: averageMemoryUsage,
      successRate,
      errorRate
    };
  }

  /**
   * Benchmark concurrent operations
   */
  private async benchmarkConcurrentOperations(
    operationCount: number, 
    config: BenchmarkConfiguration
  ): Promise<OperationBenchmark> {
    const operationType = `concurrent_${operationCount}_operations`;
    const times: number[] = [];
    const memoryUsages: number[] = [];
    let successCount = 0;
    let errorCount = 0;

    console.log(`Benchmarking concurrent operations with ${operationCount} operations...`);

    for (let iteration = 0; iteration < config.iterations; iteration++) {
      const memoryBefore = process.memoryUsage().heapUsed;
      
      const startTime = performance.now();
      
      try {
        // Create concurrent validation and recovery operations
        const validationPromises = Array(Math.floor(operationCount / 2)).fill(null).map(() => {
          const wall = this.generateTestWall();
          return this.validationPipeline.executeValidation(wall, 'concurrent_benchmark', 'post');
        });
        
        const recoveryPromises = Array(Math.ceil(operationCount / 2)).fill(null).map(() => {
          const wall = this.generateTestWallWithErrors();
          const errors = [this.generateTestError()];
          return this.recoverySystem.attemptRecovery(wall, errors);
        });
        
        const [validationResults, recoveryResults] = await Promise.all([
          Promise.all(validationPromises),
          Promise.all(recoveryPromises)
        ]);
        
        const endTime = performance.now();
        const memoryAfter = process.memoryUsage().heapUsed;
        
        times.push(endTime - startTime);
        memoryUsages.push(memoryAfter - memoryBefore);
        
        successCount += validationResults.filter(r => r.success).length;
        successCount += recoveryResults.filter(r => r.appliedStrategies.length > 0).length;
        errorCount += validationResults.filter(r => !r.success).length;
        errorCount += recoveryResults.filter(r => r.requiresUserIntervention).length;
        
      } catch (error) {
        errorCount += operationCount;
        times.push(config.performanceThresholds.maxValidationTimePerWall * operationCount);
      }
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);
    const throughput = (operationCount * config.iterations * 1000) / (averageTime * config.iterations);
    const averageMemoryUsage = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
    const successRate = successCount / (operationCount * config.iterations);
    const errorRate = errorCount / (operationCount * config.iterations);

    return {
      operationType,
      inputSize: operationCount,
      iterations: config.iterations,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      throughput,
      memoryUsage: averageMemoryUsage,
      successRate,
      errorRate
    };
  }

  /**
   * Analyze scalability characteristics
   */
  private analyzeScalability(results: OperationBenchmark[]): ScalabilityAnalysis {
    // Group results by operation type
    const operationGroups = new Map<string, OperationBenchmark[]>();
    for (const result of results) {
      const baseType = result.operationType.split('_')[0];
      if (!operationGroups.has(baseType)) {
        operationGroups.set(baseType, []);
      }
      operationGroups.get(baseType)!.push(result);
    }

    let overallLinearScaling = true;
    let averageScalingFactor = 0;
    let maxPerformanceDegradation = 0;
    let recommendedMaxSize = Infinity;
    let bottleneckIdentified: string | null = null;

    for (const [operationType, operationResults] of operationGroups) {
      // Sort by input size
      operationResults.sort((a, b) => a.inputSize - b.inputSize);
      
      // Calculate scaling factor
      if (operationResults.length >= 2) {
        const first = operationResults[0];
        const last = operationResults[operationResults.length - 1];
        
        const expectedTime = (first.averageTime / first.inputSize) * last.inputSize;
        const actualTime = last.averageTime;
        const scalingFactor = actualTime / expectedTime;
        
        averageScalingFactor += scalingFactor;
        
        // Check if scaling is roughly linear (within 50% tolerance)
        if (scalingFactor > 1.5) {
          overallLinearScaling = false;
          
          // Identify bottleneck
          if (scalingFactor > maxPerformanceDegradation) {
            maxPerformanceDegradation = scalingFactor;
            bottleneckIdentified = operationType;
          }
        }
        
        // Find recommended max size (where performance degrades significantly)
        for (let i = 1; i < operationResults.length; i++) {
          const prev = operationResults[i - 1];
          const curr = operationResults[i];
          
          const expectedCurrTime = (prev.averageTime / prev.inputSize) * curr.inputSize;
          const actualCurrTime = curr.averageTime;
          
          if (actualCurrTime > expectedCurrTime * 2) {
            recommendedMaxSize = Math.min(recommendedMaxSize, prev.inputSize);
            break;
          }
        }
      }
    }

    averageScalingFactor /= operationGroups.size;

    return {
      linearScaling: overallLinearScaling,
      scalingFactor: averageScalingFactor,
      performanceDegradation: maxPerformanceDegradation,
      recommendedMaxSize: recommendedMaxSize === Infinity ? 10000 : recommendedMaxSize,
      bottleneckIdentified
    };
  }

  /**
   * Analyze performance regression
   */
  private analyzeRegression(currentResults: OperationBenchmark[]): RegressionAnalysis {
    const baselineKey = 'performance_baseline';
    const baselineResults = this.baselineResults.get(baselineKey) || [];
    
    if (baselineResults.length === 0) {
      // Store current results as baseline
      this.baselineResults.set(baselineKey, [...currentResults]);
      
      return {
        baselineResults: [],
        currentResults,
        regressionDetected: false,
        performanceChange: 0,
        significantChanges: []
      };
    }

    const significantChanges: PerformanceChange[] = [];
    let totalPerformanceChange = 0;
    let changeCount = 0;

    // Compare current results with baseline
    for (const currentResult of currentResults) {
      const baselineResult = baselineResults.find(b => 
        b.operationType === currentResult.operationType && 
        b.inputSize === currentResult.inputSize
      );

      if (baselineResult) {
        const changePercent = ((currentResult.averageTime - baselineResult.averageTime) / baselineResult.averageTime) * 100;
        totalPerformanceChange += Math.abs(changePercent);
        changeCount++;

        // Determine significance
        let significance: PerformanceChange['significance'] = 'minor';
        let threshold = 5; // 5% threshold for minor changes

        if (Math.abs(changePercent) > 50) {
          significance = 'critical';
          threshold = 50;
        } else if (Math.abs(changePercent) > 25) {
          significance = 'major';
          threshold = 25;
        } else if (Math.abs(changePercent) > 10) {
          significance = 'moderate';
          threshold = 10;
        }

        if (Math.abs(changePercent) > threshold) {
          significantChanges.push({
            operation: currentResult.operationType,
            inputSize: currentResult.inputSize,
            changePercent,
            significance,
            threshold
          });
        }
      }
    }

    const averagePerformanceChange = changeCount > 0 ? totalPerformanceChange / changeCount : 0;
    const regressionDetected = significantChanges.some(c => c.significance === 'major' || c.significance === 'critical');

    return {
      baselineResults,
      currentResults,
      regressionDetected,
      performanceChange: averagePerformanceChange,
      significantChanges
    };
  }

  /**
   * Initialize memory monitoring
   */
  private initializeMemoryMonitoring(): MemoryProfile {
    const initialMemory = process.memoryUsage().heapUsed;
    
    return {
      initialMemory,
      peakMemory: initialMemory,
      finalMemory: 0,
      memoryIncrease: 0,
      memoryLeakDetected: false,
      gcCollections: 0,
      memoryTimeline: [{
        timestamp: Date.now(),
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      }]
    };
  }

  /**
   * Update memory profile during benchmarking
   */
  private updateMemoryProfile(profile: MemoryProfile): void {
    const currentMemory = process.memoryUsage();
    
    profile.peakMemory = Math.max(profile.peakMemory, currentMemory.heapUsed);
    
    profile.memoryTimeline.push({
      timestamp: Date.now(),
      heapUsed: currentMemory.heapUsed,
      heapTotal: currentMemory.heapTotal,
      external: currentMemory.external,
      rss: currentMemory.rss
    });
  }

  /**
   * Finalize memory profile
   */
  private finalizeMemoryProfile(profile: MemoryProfile): void {
    profile.finalMemory = process.memoryUsage().heapUsed;
    profile.memoryIncrease = profile.finalMemory - profile.initialMemory;
    
    // Simple leak detection: if final memory is significantly higher than initial
    const memoryIncreasePercent = (profile.memoryIncrease / profile.initialMemory) * 100;
    profile.memoryLeakDetected = memoryIncreasePercent > 20; // 20% increase threshold
  }

  /**
   * Capture environment information
   */
  private captureEnvironmentInfo(): EnvironmentInfo {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuModel: require('os').cpus()[0]?.model || 'Unknown',
      totalMemory: require('os').totalmem(),
      freeMemory: require('os').freemem(),
      timestamp: new Date()
    };
  }

  /**
   * Generate test walls for benchmarking
   */
  private generateTestWalls(count: number): WallSolid[] {
    const walls: WallSolid[] = [];
    
    for (let i = 0; i < count; i++) {
      walls.push(this.generateTestWall());
    }
    
    return walls;
  }

  /**
   * Generate a single test wall
   */
  private generateTestWall(): WallSolid {
    const points = [
      { x: Math.random() * 1000, y: Math.random() * 1000, id: 'p1', tolerance: 0.001, creationMethod: 'benchmark', accuracy: 1.0, validated: true },
      { x: Math.random() * 1000, y: Math.random() * 1000, id: 'p2', tolerance: 0.001, creationMethod: 'benchmark', accuracy: 1.0, validated: true }
    ];

    return {
      id: `benchmark_wall_${Math.random()}`,
      baseline: {
        id: 'baseline',
        points,
        type: 'polyline' as any,
        isClosed: false,
        length: 100,
        boundingBox: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
        curvature: [0, 0],
        tangents: [{ x: 1, y: 0 }, { x: 1, y: 0 }]
      },
      thickness: 100,
      wallType: 'Layout' as any,
      leftOffset: null as any,
      rightOffset: null as any,
      solidGeometry: [],
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: [],
      geometricQuality: {
        geometricAccuracy: 1.0,
        topologicalConsistency: 1.0,
        manufacturability: 1.0,
        architecturalCompliance: 1.0,
        sliverFaceCount: 0,
        microGapCount: 0,
        selfIntersectionCount: 0,
        degenerateElementCount: 0,
        complexity: 1,
        processingEfficiency: 1.0,
        memoryUsage: 1024
      },
      lastValidated: new Date(),
      processingTime: 0,
      complexity: 1
    };
  }

  /**
   * Generate test walls with errors
   */
  private generateTestWallsWithErrors(count: number): { walls: WallSolid[], errors: GeometricError[][] } {
    const walls: WallSolid[] = [];
    const errors: GeometricError[][] = [];
    
    for (let i = 0; i < count; i++) {
      const wall = this.generateTestWallWithErrors();
      walls.push(wall);
      errors.push([this.generateTestError()]);
    }
    
    return { walls, errors };
  }

  /**
   * Generate a test wall with errors
   */
  private generateTestWallWithErrors(): WallSolid {
    const wall = this.generateTestWall();
    
    // Introduce some issues
    wall.thickness = Math.random() > 0.5 ? -10 : 0; // Invalid thickness
    
    if (Math.random() > 0.7) {
      // Add duplicate points
      wall.baseline.points.push(wall.baseline.points[0]);
    }
    
    return wall;
  }

  /**
   * Generate a test error
   */
  private generateTestError(): GeometricError {
    const errorTypes = [
      GeometricErrorType.DEGENERATE_GEOMETRY,
      GeometricErrorType.DUPLICATE_VERTICES,
      GeometricErrorType.NUMERICAL_INSTABILITY,
      GeometricErrorType.SELF_INTERSECTION
    ];
    
    const randomType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    return new GeometricError(
      randomType,
      ErrorSeverity.ERROR,
      'benchmark_test',
      {},
      'Benchmark test error',
      'Test fix',
      true
    );
  }

  /**
   * Export benchmark results
   */
  exportResults(result: BenchmarkResult, format: 'console' | 'json' | 'csv'): string {
    switch (format) {
      case 'console':
        return this.formatConsoleOutput(result);
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'csv':
        return this.formatCSVOutput(result);
      default:
        return this.formatConsoleOutput(result);
    }
  }

  private formatConsoleOutput(result: BenchmarkResult): string {
    let output = '\n=== BIM Performance Benchmark Results ===\n';
    output += `Timestamp: ${result.timestamp.toISOString()}\n`;
    output += `Environment: ${result.environment.platform} ${result.environment.arch}, Node ${result.environment.nodeVersion}\n`;
    output += `CPU: ${result.environment.cpuModel}\n`;
    output += `Memory: ${(result.environment.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB total\n\n`;

    output += '=== Operation Benchmarks ===\n';
    for (const benchmark of result.results) {
      output += `${benchmark.operationType}:\n`;
      output += `  Input Size: ${benchmark.inputSize}\n`;
      output += `  Average Time: ${benchmark.averageTime.toFixed(2)}ms\n`;
      output += `  Throughput: ${benchmark.throughput.toFixed(2)} ops/sec\n`;
      output += `  Success Rate: ${(benchmark.successRate * 100).toFixed(1)}%\n`;
      output += `  Memory Usage: ${(benchmark.memoryUsage / 1024 / 1024).toFixed(2)} MB\n\n`;
    }

    output += '=== Memory Profile ===\n';
    output += `Initial Memory: ${(result.memoryProfile.initialMemory / 1024 / 1024).toFixed(2)} MB\n`;
    output += `Peak Memory: ${(result.memoryProfile.peakMemory / 1024 / 1024).toFixed(2)} MB\n`;
    output += `Final Memory: ${(result.memoryProfile.finalMemory / 1024 / 1024).toFixed(2)} MB\n`;
    output += `Memory Increase: ${(result.memoryProfile.memoryIncrease / 1024 / 1024).toFixed(2)} MB\n`;
    output += `Memory Leak Detected: ${result.memoryProfile.memoryLeakDetected ? 'Yes' : 'No'}\n\n`;

    output += '=== Scalability Analysis ===\n';
    output += `Linear Scaling: ${result.scalabilityAnalysis.linearScaling ? 'Yes' : 'No'}\n`;
    output += `Scaling Factor: ${result.scalabilityAnalysis.scalingFactor.toFixed(2)}\n`;
    output += `Performance Degradation: ${result.scalabilityAnalysis.performanceDegradation.toFixed(2)}x\n`;
    output += `Recommended Max Size: ${result.scalabilityAnalysis.recommendedMaxSize}\n`;
    if (result.scalabilityAnalysis.bottleneckIdentified) {
      output += `Bottleneck: ${result.scalabilityAnalysis.bottleneckIdentified}\n`;
    }

    if (result.regressionAnalysis.regressionDetected) {
      output += '\n=== Regression Analysis ===\n';
      output += `Performance Change: ${result.regressionAnalysis.performanceChange.toFixed(2)}%\n`;
      output += 'Significant Changes:\n';
      for (const change of result.regressionAnalysis.significantChanges) {
        output += `  ${change.operation} (size ${change.inputSize}): ${change.changePercent.toFixed(2)}% (${change.significance})\n`;
      }
    }

    return output;
  }

  private formatCSVOutput(result: BenchmarkResult): string {
    const headers = [
      'Operation Type',
      'Input Size',
      'Iterations',
      'Average Time (ms)',
      'Min Time (ms)',
      'Max Time (ms)',
      'Standard Deviation',
      'Throughput (ops/sec)',
      'Memory Usage (MB)',
      'Success Rate (%)',
      'Error Rate (%)'
    ];

    const rows = result.results.map(benchmark => [
      benchmark.operationType,
      benchmark.inputSize.toString(),
      benchmark.iterations.toString(),
      benchmark.averageTime.toFixed(2),
      benchmark.minTime.toFixed(2),
      benchmark.maxTime.toFixed(2),
      benchmark.standardDeviation.toFixed(2),
      benchmark.throughput.toFixed(2),
      (benchmark.memoryUsage / 1024 / 1024).toFixed(2),
      (benchmark.successRate * 100).toFixed(1),
      (benchmark.errorRate * 100).toFixed(1)
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}