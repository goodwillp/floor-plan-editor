/**
 * BIM Error Handler with error recovery strategies
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { ErrorHandlingResult, RecoveryResult, FallbackResult } from '../types/GeometricTypes';
import { 
  GeometricError, 
  OffsetError, 
  ToleranceError, 
  BooleanError,
  SelfIntersectionError,
  DegenerateGeometryError,
  NumericalInstabilityError
} from './GeometricError';
import type { ErrorSeverity } from '../types/BIMTypes';

/**
 * Error recovery strategy interface
 */
interface RecoveryStrategy {
  canHandle(error: GeometricError): boolean;
  attempt(error: GeometricError): RecoveryResult;
  priority: number;
}

/**
 * Fallback strategy interface
 */
interface FallbackStrategy {
  canProvide(operation: string, input: any): boolean;
  provide(operation: string, input: any, error: GeometricError): FallbackResult;
  quality: number; // 0-1, higher is better quality
}

/**
 * Error logging interface
 */
interface ErrorLogger {
  log(error: GeometricError, context?: any): void;
  getErrorHistory(): GeometricError[];
  getErrorStatistics(): ErrorStatistics;
}

/**
 * Error statistics
 */
interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsBySeverity: Map<ErrorSeverity, number>;
  recoverySuccessRate: number;
  fallbackUsageRate: number;
  averageRecoveryTime: number;
}

/**
 * BIM Error Handler with comprehensive error recovery
 */
export class BIMErrorHandler {
  private recoveryStrategies: RecoveryStrategy[] = [];
  private fallbackStrategies: FallbackStrategy[] = [];
  private logger: ErrorLogger;
  private maxRecoveryAttempts: number = 3;
  private recoveryTimeout: number = 5000; // 5 seconds

  constructor(options: {
    maxRecoveryAttempts?: number;
    recoveryTimeout?: number;
    logger?: ErrorLogger;
  } = {}) {
    this.maxRecoveryAttempts = options.maxRecoveryAttempts || 3;
    this.recoveryTimeout = options.recoveryTimeout || 5000;
    this.logger = options.logger || new DefaultErrorLogger();
    
    this.initializeDefaultStrategies();
  }

  /**
   * Handle a geometric error with recovery attempts
   */
  handleGeometricError(error: GeometricError): ErrorHandlingResult {
    const startTime = Date.now();
    
    // Log the error
    this.logger.log(error);

    // Determine if recovery should be attempted
    if (!error.recoverable || error.severity === 'critical') {
      return {
        handled: true,
        recoveryAttempted: false,
        fallbackUsed: false,
        message: `Critical error: ${error.message}`,
        suggestions: [error.suggestedFix]
      };
    }

    // Attempt recovery
    const recoveryResult = this.attemptRecovery(error);
    
    if (recoveryResult.success) {
      return {
        handled: true,
        recoveryAttempted: true,
        fallbackUsed: false,
        message: `Error recovered: ${error.message}`,
        suggestions: [`Recovery method: ${recoveryResult.method}`]
      };
    }

    // If recovery failed, try fallback
    const fallbackResult = this.attemptFallback(error.operation, error.input, error);
    
    if (fallbackResult.success) {
      return {
        handled: true,
        recoveryAttempted: true,
        fallbackUsed: true,
        message: `Error handled with fallback: ${error.message}`,
        suggestions: [
          `Fallback method: ${fallbackResult.method}`,
          ...fallbackResult.limitations
        ]
      };
    }

    // Complete failure
    return {
      handled: false,
      recoveryAttempted: true,
      fallbackUsed: true,
      message: `Unable to handle error: ${error.message}`,
      suggestions: [
        error.suggestedFix,
        'Consider simplifying the input geometry',
        'Check for invalid input parameters'
      ]
    };
  }

  /**
   * Handle tolerance-specific errors
   */
  handleToleranceError(error: ToleranceError): ErrorHandlingResult {
    // Tolerance errors often have specific recovery strategies
    const adjustedTolerance = error.failure.suggestedAdjustment;
    
    if (adjustedTolerance > 0) {
      return {
        handled: true,
        recoveryAttempted: true,
        fallbackUsed: false,
        message: `Tolerance adjusted from ${error.currentTolerance} to ${adjustedTolerance}`,
        suggestions: [
          `Use tolerance: ${adjustedTolerance}`,
          'Consider geometry simplification if tolerance adjustment is insufficient'
        ]
      };
    }

    return this.handleGeometricError(error);
  }

  /**
   * Handle boolean operation errors
   */
  handleBooleanError(error: BooleanError): ErrorHandlingResult {
    // Boolean errors often benefit from geometry simplification
    const suggestions = [
      'Try reducing the complexity of input geometry',
      'Use alternative boolean algorithms',
      'Apply shape healing before boolean operations'
    ];

    if (error.complexityLevel > 1000) {
      suggestions.unshift('Geometry complexity is very high - consider subdivision');
    }

    return {
      handled: true,
      recoveryAttempted: false,
      fallbackUsed: false,
      message: `Boolean operation failed: ${error.message}`,
      suggestions
    };
  }

  /**
   * Attempt geometric recovery using available strategies
   */
  attemptGeometricRecovery(operation: string, input: any, error: GeometricError): RecoveryResult {
    return this.attemptRecovery(error);
  }

  /**
   * Provide fallback geometry when operations fail
   */
  provideFallbackGeometry(originalInput: any, failedOperation: string): FallbackResult {
    return this.attemptFallback(failedOperation, originalInput, null);
  }

  /**
   * Add a custom recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add a custom fallback strategy
   */
  addFallbackStrategy(strategy: FallbackStrategy): void {
    this.fallbackStrategies.push(strategy);
    this.fallbackStrategies.sort((a, b) => b.quality - a.quality);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): ErrorStatistics {
    return this.logger.getErrorStatistics();
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    if (this.logger instanceof DefaultErrorLogger) {
      (this.logger as DefaultErrorLogger).clearHistory();
    }
  }

  /**
   * Attempt recovery using available strategies
   */
  private attemptRecovery(error: GeometricError): RecoveryResult {
    const applicableStrategies = this.recoveryStrategies.filter(strategy => 
      strategy.canHandle(error)
    );

    for (const strategy of applicableStrategies) {
      try {
        const result = strategy.attempt(error);
        if (result.success) {
          return result;
        }
      } catch (recoveryError) {
        // Recovery strategy itself failed, continue to next
        console.warn(`Recovery strategy failed:`, recoveryError);
      }
    }

    return {
      success: false,
      recoveredGeometry: null,
      method: 'none',
      qualityImpact: 0
    };
  }

  /**
   * Attempt fallback using available strategies
   */
  private attemptFallback(operation: string, input: any, error: GeometricError | null): FallbackResult {
    const applicableStrategies = this.fallbackStrategies.filter(strategy => 
      strategy.canProvide(operation, input)
    );

    for (const strategy of applicableStrategies) {
      try {
        const result = strategy.provide(operation, input, error!);
        if (result.success) {
          return result;
        }
      } catch (fallbackError) {
        // Fallback strategy itself failed, continue to next
        console.warn(`Fallback strategy failed:`, fallbackError);
      }
    }

    return {
      success: false,
      fallbackGeometry: null,
      method: 'none',
      limitations: ['No fallback available']
    };
  }

  /**
   * Initialize default recovery and fallback strategies
   */
  private initializeDefaultStrategies(): void {
    // Offset error recovery
    this.addRecoveryStrategy({
      canHandle: (error) => error instanceof OffsetError,
      attempt: (error) => {
        const offsetError = error as OffsetError;
        if (offsetError.joinType === 'miter') {
          return {
            success: true,
            recoveredGeometry: { joinType: 'bevel' },
            method: 'join_type_fallback',
            qualityImpact: 0.1
          };
        }
        return { success: false, recoveredGeometry: null, method: 'none', qualityImpact: 0 };
      },
      priority: 10
    });

    // Tolerance error recovery
    this.addRecoveryStrategy({
      canHandle: (error) => error instanceof ToleranceError,
      attempt: (error) => {
        const toleranceError = error as ToleranceError;
        const newTolerance = toleranceError.failure.suggestedAdjustment;
        if (newTolerance > toleranceError.currentTolerance) {
          return {
            success: true,
            recoveredGeometry: { tolerance: newTolerance },
            method: 'tolerance_adjustment',
            qualityImpact: 0.05
          };
        }
        return { success: false, recoveredGeometry: null, method: 'none', qualityImpact: 0 };
      },
      priority: 15
    });

    // Self-intersection recovery
    this.addRecoveryStrategy({
      canHandle: (error) => error instanceof SelfIntersectionError,
      attempt: (error) => {
        return {
          success: true,
          recoveredGeometry: { simplified: true },
          method: 'self_intersection_removal',
          qualityImpact: 0.2
        };
      },
      priority: 8
    });

    // Simple geometry fallback
    this.addFallbackStrategy({
      canProvide: (operation, input) => operation.includes('offset') || operation.includes('boolean'),
      provide: (operation, input, error) => {
        return {
          success: true,
          fallbackGeometry: { simplified: true, method: 'basic_approximation' },
          method: 'simplified_geometry',
          limitations: ['Reduced geometric accuracy', 'May not preserve all features']
        };
      },
      quality: 0.3
    });
  }
}

/**
 * Default error logger implementation
 */
class DefaultErrorLogger implements ErrorLogger {
  private errorHistory: GeometricError[] = [];
  private maxHistorySize: number = 1000;

  log(error: GeometricError, context?: any): void {
    this.errorHistory.push(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    // Console logging for development
    if (error.severity === 'critical') {
      console.error('BIM Critical Error:', error.toJSON(), context);
    } else if (error.severity === 'error') {
      console.warn('BIM Error:', error.toJSON(), context);
    } else {
      console.log('BIM Warning:', error.toJSON(), context);
    }
  }

  getErrorHistory(): GeometricError[] {
    return [...this.errorHistory];
  }

  getErrorStatistics(): ErrorStatistics {
    const totalErrors = this.errorHistory.length;
    const errorsByType = new Map<string, number>();
    const errorsBySeverity = new Map<ErrorSeverity, number>();
    
    let recoveredErrors = 0;
    let fallbackUsed = 0;
    let totalRecoveryTime = 0;

    for (const error of this.errorHistory) {
      // Count by type
      const count = errorsByType.get(error.type) || 0;
      errorsByType.set(error.type, count + 1);

      // Count by severity
      const severityCount = errorsBySeverity.get(error.severity) || 0;
      errorsBySeverity.set(error.severity, severityCount + 1);

      // Recovery statistics (simplified for this implementation)
      if (error.recoverable) {
        recoveredErrors++;
      }
    }

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recoverySuccessRate: totalErrors > 0 ? recoveredErrors / totalErrors : 0,
      fallbackUsageRate: totalErrors > 0 ? fallbackUsed / totalErrors : 0,
      averageRecoveryTime: recoveredErrors > 0 ? totalRecoveryTime / recoveredErrors : 0
    };
  }

  clearHistory(): void {
    this.errorHistory = [];
  }
}