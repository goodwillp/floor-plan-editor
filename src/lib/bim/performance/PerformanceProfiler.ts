/**
 * Performance profiling tools for identifying bottlenecks in BIM operations
 */

import {
  PerformanceMetrics,
  PerformanceProfile,
  PerformanceBottleneck,
  PerformanceThresholds
} from '../types/PerformanceTypes';

export interface ProfilerSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  operations: ProfiledOperation[];
  callStack: CallStackFrame[];
  memorySnapshots: MemorySnapshot[];
  cpuProfile?: CPUProfile;
}

export interface ProfiledOperation {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryDelta: number;
  cpuTime: number;
  parentId?: string;
  children: string[];
  metadata: Record<string, any>;
}

export interface CallStackFrame {
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  timestamp: number;
  duration?: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  objects: ObjectCount[];
}

export interface ObjectCount {
  type: string;
  count: number;
  size: number;
}

export interface CPUProfile {
  startTime: number;
  endTime: number;
  samples: CPUSample[];
  nodes: CPUProfileNode[];
}

export interface CPUSample {
  timestamp: number;
  nodeId: number;
}

export interface CPUProfileNode {
  id: number;
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
  hitCount: number;
  children: number[];
}

export class PerformanceProfiler {
  private activeSessions: Map<string, ProfilerSession> = new Map();
  private completedSessions: ProfilerSession[] = [];
  private operationStack: ProfiledOperation[] = [];
  private isProfilingEnabled: boolean = false;
  private thresholds: PerformanceThresholds;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxOperationTime: 1000,
      maxMemoryUsage: 100 * 1024 * 1024,
      minCacheHitRate: 0.8,
      maxErrorRate: 0.05,
      minThroughput: 10,
      ...thresholds
    };
  }

  /**
   * Start a profiling session
   */
  startSession(name: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ProfilerSession = {
      id: sessionId,
      name,
      startTime: performance.now(),
      operations: [],
      callStack: [],
      memorySnapshots: [this.takeMemorySnapshot()]
    };

    this.activeSessions.set(sessionId, session);
    this.isProfilingEnabled = true;

    // Start CPU profiling if available
    if (this.isCPUProfilingAvailable()) {
      this.startCPUProfiling(sessionId);
    }

    return sessionId;
  }

  /**
   * End a profiling session
   */
  endSession(sessionId: string): ProfilerSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.endTime = performance.now();
    session.memorySnapshots.push(this.takeMemorySnapshot());

    // Stop CPU profiling if it was started
    if (this.isCPUProfilingAvailable()) {
      session.cpuProfile = this.stopCPUProfiling();
    }

    this.activeSessions.delete(sessionId);
    this.completedSessions.push(session);

    // Disable profiling if no active sessions
    if (this.activeSessions.size === 0) {
      this.isProfilingEnabled = false;
    }

    return session;
  }

  /**
   * Start profiling an operation
   */
  startOperation(name: string, metadata: Record<string, any> = {}): string {
    if (!this.isProfilingEnabled) return '';

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    const startMemory = this.getCurrentMemoryUsage();

    const operation: ProfiledOperation = {
      id: operationId,
      name,
      startTime,
      endTime: 0,
      duration: 0,
      memoryDelta: 0,
      cpuTime: 0,
      parentId: this.operationStack.length > 0 ? this.operationStack[this.operationStack.length - 1].id : undefined,
      children: [],
      metadata: {
        ...metadata,
        startMemory
      }
    };

    // Add to parent's children if there is a parent
    if (operation.parentId) {
      const parent = this.operationStack[this.operationStack.length - 1];
      parent.children.push(operationId);
    }

    this.operationStack.push(operation);

    // Add to all active sessions
    this.activeSessions.forEach(session => {
      session.operations.push(operation);
    });

    return operationId;
  }

  /**
   * End profiling an operation
   */
  endOperation(operationId: string): ProfiledOperation | null {
    if (!this.isProfilingEnabled || operationId === '') return null;

    const operationIndex = this.operationStack.findIndex(op => op.id === operationId);
    if (operationIndex === -1) return null;

    const operation = this.operationStack[operationIndex];
    const endTime = performance.now();
    const endMemory = this.getCurrentMemoryUsage();

    operation.endTime = endTime;
    operation.duration = endTime - operation.startTime;
    operation.memoryDelta = endMemory - (operation.metadata.startMemory || 0);
    operation.cpuTime = this.estimateCPUTime(operation.startTime, endTime);

    // Remove from operation stack
    this.operationStack.splice(operationIndex, 1);

    // Check for performance issues
    this.checkOperationPerformance(operation);

    return operation;
  }

  /**
   * Add a call stack frame
   */
  addCallStackFrame(frame: Omit<CallStackFrame, 'timestamp'>): void {
    if (!this.isProfilingEnabled) return;

    const callStackFrame: CallStackFrame = {
      ...frame,
      timestamp: performance.now()
    };

    this.activeSessions.forEach(session => {
      session.callStack.push(callStackFrame);
    });
  }

  /**
   * Take a memory snapshot
   */
  takeMemorySnapshot(): MemorySnapshot {
    const memoryUsage = this.getCurrentMemoryUsage();
    
    return {
      timestamp: performance.now(),
      heapUsed: memoryUsage,
      heapTotal: this.getTotalMemory(),
      external: this.getExternalMemory(),
      arrayBuffers: this.getArrayBufferMemory(),
      objects: this.getObjectCounts()
    };
  }

  /**
   * Analyze a completed session for bottlenecks
   */
  analyzeSession(sessionId: string): PerformanceProfile {
    const session = this.completedSessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const bottlenecks = this.identifyBottlenecks(session.operations);
    const operationBreakdown = this.calculateOperationBreakdown(session.operations);
    const overallScore = this.calculateSessionScore(session);

    return {
      sessionId,
      startTime: session.startTime,
      endTime: session.endTime || session.startTime,
      totalOperations: session.operations.length,
      operationBreakdown,
      bottlenecks,
      recommendations: [], // Will be populated by optimization engine
      overallScore
    };
  }

  /**
   * Get flame graph data for visualization
   */
  getFlameGraphData(sessionId: string): FlameGraphNode[] {
    const session = this.completedSessions.find(s => s.id === sessionId);
    if (!session) return [];

    return this.buildFlameGraph(session.operations);
  }

  /**
   * Get memory timeline for visualization
   */
  getMemoryTimeline(sessionId: string): MemoryTimelinePoint[] {
    const session = this.completedSessions.find(s => s.id === sessionId);
    if (!session) return [];

    return session.memorySnapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      heapUsed: snapshot.heapUsed,
      heapTotal: snapshot.heapTotal,
      external: snapshot.external,
      arrayBuffers: snapshot.arrayBuffers
    }));
  }

  /**
   * Get CPU profile data
   */
  getCPUProfile(sessionId: string): CPUProfile | null {
    const session = this.completedSessions.find(s => s.id === sessionId);
    return session?.cpuProfile || null;
  }

  /**
   * Export profiling data
   */
  exportSession(sessionId: string): string {
    const session = this.completedSessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return JSON.stringify({
      session,
      analysis: this.analyzeSession(sessionId),
      flameGraph: this.getFlameGraphData(sessionId),
      memoryTimeline: this.getMemoryTimeline(sessionId)
    }, null, 2);
  }

  /**
   * Import profiling data
   */
  importSession(data: string): string {
    const imported = JSON.parse(data);
    const session = imported.session as ProfilerSession;
    
    this.completedSessions.push(session);
    return session.id;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(operations: ProfiledOperation[]): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const operationGroups = new Map<string, ProfiledOperation[]>();

    // Group operations by name
    operations.forEach(op => {
      if (!operationGroups.has(op.name)) {
        operationGroups.set(op.name, []);
      }
      operationGroups.get(op.name)!.push(op);
    });

    // Analyze each operation group
    operationGroups.forEach((ops, operationType) => {
      const totalTime = ops.reduce((sum, op) => sum + op.duration, 0);
      const averageTime = totalTime / ops.length;
      const frequency = ops.length;
      const impact = totalTime;

      // Check if this is a bottleneck
      if (averageTime > this.thresholds.maxOperationTime || impact > 5000) {
        bottlenecks.push({
          operationType,
          averageTime,
          frequency,
          impact,
          cause: this.identifyBottleneckCause(ops),
          suggestedFix: this.suggestBottleneckFix(operationType, averageTime, frequency, ops)
        });
      }
    });

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Identify the cause of a bottleneck
   */
  private identifyBottleneckCause(operations: ProfiledOperation[]): string {
    const avgMemoryDelta = operations.reduce((sum, op) => sum + op.memoryDelta, 0) / operations.length;
    const maxDuration = Math.max(...operations.map(op => op.duration));
    const hasLongOperations = operations.some(op => op.duration > this.thresholds.maxOperationTime * 2);

    if (avgMemoryDelta > 10 * 1024 * 1024) return 'High memory allocation';
    if (hasLongOperations) return 'Occasional very slow operations';
    if (maxDuration > this.thresholds.maxOperationTime * 5) return 'Extreme outlier operations';
    return 'Consistently slow algorithm';
  }

  /**
   * Suggest fix for bottleneck
   */
  private suggestBottleneckFix(
    operationType: string,
    averageTime: number,
    frequency: number,
    operations: ProfiledOperation[]
  ): string {
    const hasChildren = operations.some(op => op.children.length > 0);
    const avgMemoryDelta = operations.reduce((sum, op) => sum + op.memoryDelta, 0) / operations.length;

    if (frequency > 100 && averageTime > 100) {
      return 'Implement caching or memoization';
    }
    if (avgMemoryDelta > 5 * 1024 * 1024) {
      return 'Optimize memory usage and object creation';
    }
    if (hasChildren) {
      return 'Profile child operations to identify specific bottleneck';
    }
    if (averageTime > 1000) {
      return 'Consider algorithm optimization or parallel processing';
    }
    return 'Profile with more detailed instrumentation';
  }

  /**
   * Calculate operation breakdown
   */
  private calculateOperationBreakdown(operations: ProfiledOperation[]): Map<string, number> {
    const breakdown = new Map<string, number>();
    
    operations.forEach(op => {
      breakdown.set(op.name, (breakdown.get(op.name) || 0) + 1);
    });

    return breakdown;
  }

  /**
   * Calculate overall session score
   */
  private calculateSessionScore(session: ProfilerSession): number {
    if (session.operations.length === 0) return 100;

    const avgDuration = session.operations.reduce((sum, op) => sum + op.duration, 0) / session.operations.length;
    const maxMemoryDelta = Math.max(...session.operations.map(op => op.memoryDelta));
    const longOperations = session.operations.filter(op => op.duration > this.thresholds.maxOperationTime).length;

    const timeScore = Math.max(0, 100 - (avgDuration / this.thresholds.maxOperationTime) * 50);
    const memoryScore = Math.max(0, 100 - (maxMemoryDelta / this.thresholds.maxMemoryUsage) * 50);
    const reliabilityScore = Math.max(0, 100 - (longOperations / session.operations.length) * 100);

    return (timeScore + memoryScore + reliabilityScore) / 3;
  }

  /**
   * Build flame graph data structure
   */
  private buildFlameGraph(operations: ProfiledOperation[]): FlameGraphNode[] {
    const rootOperations = operations.filter(op => !op.parentId);
    return rootOperations.map(op => this.buildFlameGraphNode(op, operations));
  }

  /**
   * Build a single flame graph node
   */
  private buildFlameGraphNode(operation: ProfiledOperation, allOperations: ProfiledOperation[]): FlameGraphNode {
    const children = operation.children
      .map(childId => allOperations.find(op => op.id === childId))
      .filter(child => child !== undefined)
      .map(child => this.buildFlameGraphNode(child!, allOperations));

    return {
      name: operation.name,
      value: operation.duration,
      children: children.length > 0 ? children : undefined,
      metadata: {
        id: operation.id,
        startTime: operation.startTime,
        endTime: operation.endTime,
        memoryDelta: operation.memoryDelta,
        cpuTime: operation.cpuTime
      }
    };
  }

  /**
   * Check operation performance and log warnings
   */
  private checkOperationPerformance(operation: ProfiledOperation): void {
    if (operation.duration > this.thresholds.maxOperationTime) {
      console.warn(`Slow operation detected: ${operation.name} took ${operation.duration.toFixed(1)}ms`);
    }

    if (operation.memoryDelta > this.thresholds.maxMemoryUsage * 0.1) {
      console.warn(`High memory usage: ${operation.name} allocated ${(operation.memoryDelta / 1024 / 1024).toFixed(1)}MB`);
    }
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return (performance as any).memory?.usedJSHeapSize || 0;
  }

  /**
   * Get total memory
   */
  private getTotalMemory(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapTotal;
    }
    return (performance as any).memory?.totalJSHeapSize || 0;
  }

  /**
   * Get external memory
   */
  private getExternalMemory(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().external;
    }
    return 0;
  }

  /**
   * Get array buffer memory
   */
  private getArrayBufferMemory(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().arrayBuffers;
    }
    return 0;
  }

  /**
   * Get object counts (simplified implementation)
   */
  private getObjectCounts(): ObjectCount[] {
    // This is a simplified implementation
    // In a real scenario, you might use heap snapshots or other profiling tools
    return [
      { type: 'Object', count: 0, size: 0 },
      { type: 'Array', count: 0, size: 0 },
      { type: 'Function', count: 0, size: 0 }
    ];
  }

  /**
   * Estimate CPU time for an operation
   */
  private estimateCPUTime(startTime: number, endTime: number): number {
    // Simplified estimation - in reality, you'd use more sophisticated profiling
    return endTime - startTime;
  }

  /**
   * Check if CPU profiling is available
   */
  private isCPUProfilingAvailable(): boolean {
    return typeof (console as any).profile === 'function';
  }

  /**
   * Start CPU profiling
   */
  private startCPUProfiling(sessionId: string): void {
    if (this.isCPUProfilingAvailable()) {
      (console as any).profile(sessionId);
    }
  }

  /**
   * Stop CPU profiling
   */
  private stopCPUProfiling(): CPUProfile | undefined {
    if (this.isCPUProfilingAvailable()) {
      (console as any).profileEnd();
      // In a real implementation, you'd capture the actual CPU profile data
      return {
        startTime: 0,
        endTime: 0,
        samples: [],
        nodes: []
      };
    }
    return undefined;
  }

  /**
   * Get completed sessions
   */
  getCompletedSessions(): ProfilerSession[] {
    return [...this.completedSessions];
  }

  /**
   * Clear old sessions
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAge;
    this.completedSessions = this.completedSessions.filter(
      session => session.startTime >= cutoffTime
    );
  }
}

interface FlameGraphNode {
  name: string;
  value: number;
  children?: FlameGraphNode[];
  metadata?: Record<string, any>;
}

interface MemoryTimelinePoint {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}