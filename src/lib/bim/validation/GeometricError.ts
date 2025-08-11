/**
 * Geometric error classes with proper error classification
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { GeometricErrorType, ErrorSeverity, ToleranceFailure } from '../types/BIMTypes';

/**
 * Base geometric error class
 */
export class GeometricError extends Error {
  public readonly type: GeometricErrorType;
  public readonly severity: ErrorSeverity;
  public readonly operation: string;
  public readonly input: any;
  public readonly suggestedFix: string;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;

  constructor(
    type: GeometricErrorType,
    message: string,
    options: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      suggestedFix?: string;
      recoverable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'GeometricError';
    this.type = type;
    this.severity = options.severity || ErrorSeverity.ERROR;
    this.operation = options.operation || 'unknown';
    this.input = options.input;
    this.suggestedFix = options.suggestedFix || 'No suggestion available';
    this.recoverable = options.recoverable !== false; // Default to recoverable
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GeometricError);
    }
  }

  /**
   * Convert error to a serializable object
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      severity: this.severity,
      message: this.message,
      operation: this.operation,
      suggestedFix: this.suggestedFix,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }

  /**
   * Create a copy with updated properties
   */
  withUpdates(updates: Partial<{
    severity: ErrorSeverity;
    suggestedFix: string;
    recoverable: boolean;
  }>): GeometricError {
    return new GeometricError(this.type, this.message, {
      severity: updates.severity || this.severity,
      operation: this.operation,
      input: this.input,
      suggestedFix: updates.suggestedFix || this.suggestedFix,
      recoverable: updates.recoverable !== undefined ? updates.recoverable : this.recoverable
    });
  }
}

/**
 * Offset operation specific error
 */
export class OffsetError extends GeometricError {
  public readonly offsetDistance: number;
  public readonly joinType: string;
  public readonly curveType: string;

  constructor(
    message: string,
    offsetDistance: number,
    options: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      suggestedFix?: string;
      recoverable?: boolean;
      joinType?: string;
      curveType?: string;
    } = {}
  ) {
    super(GeometricErrorType.OFFSET_FAILURE, message, options);
    this.name = 'OffsetError';
    this.offsetDistance = offsetDistance;
    this.joinType = options.joinType || 'unknown';
    this.curveType = options.curveType || 'unknown';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      offsetDistance: this.offsetDistance,
      joinType: this.joinType,
      curveType: this.curveType
    };
  }
}

/**
 * Tolerance-related error
 */
export class ToleranceError extends GeometricError {
  public readonly currentTolerance: number;
  public readonly requiredTolerance: number;
  public readonly toleranceContext: string;
  public readonly failure: ToleranceFailure;

  constructor(
    message: string,
    currentTolerance: number,
    requiredTolerance: number,
    failure: ToleranceFailure,
    options: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      suggestedFix?: string;
      recoverable?: boolean;
      toleranceContext?: string;
    } = {}
  ) {
    super(GeometricErrorType.TOLERANCE_EXCEEDED, message, options);
    this.name = 'ToleranceError';
    this.currentTolerance = currentTolerance;
    this.requiredTolerance = requiredTolerance;
    this.toleranceContext = options.toleranceContext || 'unknown';
    this.failure = failure;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      currentTolerance: this.currentTolerance,
      requiredTolerance: this.requiredTolerance,
      toleranceContext: this.toleranceContext,
      failure: this.failure
    };
  }
}

/**
 * Boolean operation specific error
 */
export class BooleanError extends GeometricError {
  public readonly operationType: string;
  public readonly inputCount: number;
  public readonly complexityLevel: number;

  constructor(
    message: string,
    operationType: string,
    options: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      suggestedFix?: string;
      recoverable?: boolean;
      inputCount?: number;
      complexityLevel?: number;
    } = {}
  ) {
    super(GeometricErrorType.BOOLEAN_FAILURE, message, options);
    this.name = 'BooleanError';
    this.operationType = operationType;
    this.inputCount = options.inputCount || 0;
    this.complexityLevel = options.complexityLevel || 0;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      operationType: this.operationType,
      inputCount: this.inputCount,
      complexityLevel: this.complexityLevel
    };
  }
}

/**
 * Self-intersection error
 */
export class SelfIntersectionError extends GeometricError {
  public readonly intersectionPoints: { x: number; y: number }[];
  public readonly segmentIndices: number[];

  constructor(
    message: string,
    intersectionPoints: { x: number; y: number }[],
    segmentIndices: number[],
    options: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      suggestedFix?: string;
      recoverable?: boolean;
    } = {}
  ) {
    super(GeometricErrorType.SELF_INTERSECTION, message, options);
    this.name = 'SelfIntersectionError';
    this.intersectionPoints = intersectionPoints;
    this.segmentIndices = segmentIndices;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      intersectionPoints: this.intersectionPoints,
      segmentIndices: this.segmentIndices
    };
  }
}

/**
 * Degenerate geometry error
 */
export class DegenerateGeometryError extends GeometricError {
  public readonly geometryType: string;
  public readonly degenerateElements: string[];

  constructor(
    message: string,
    geometryType: string,
    degenerateElements: string[],
    options: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      suggestedFix?: string;
      recoverable?: boolean;
    } = {}
  ) {
    super(GeometricErrorType.DEGENERATE_GEOMETRY, message, options);
    this.name = 'DegenerateGeometryError';
    this.geometryType = geometryType;
    this.degenerateElements = degenerateElements;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      geometryType: this.geometryType,
      degenerateElements: this.degenerateElements
    };
  }
}

/**
 * Numerical instability error
 */
export class NumericalInstabilityError extends GeometricError {
  public readonly calculationType: string;
  public readonly inputValues: number[];
  public readonly expectedRange: { min: number; max: number };

  constructor(
    message: string,
    calculationType: string,
    inputValues: number[],
    expectedRange: { min: number; max: number },
    options: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      suggestedFix?: string;
      recoverable?: boolean;
    } = {}
  ) {
    super(GeometricErrorType.NUMERICAL_INSTABILITY, message, options);
    this.name = 'NumericalInstabilityError';
    this.calculationType = calculationType;
    this.inputValues = inputValues;
    this.expectedRange = expectedRange;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      calculationType: this.calculationType,
      inputValues: this.inputValues,
      expectedRange: this.expectedRange
    };
  }
}

/**
 * Error factory for creating specific error types
 */
export class GeometricErrorFactory {
  /**
   * Create an offset error
   */
  static createOffsetError(
    message: string,
    offsetDistance: number,
    options?: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      joinType?: string;
      curveType?: string;
    }
  ): OffsetError {
    return new OffsetError(message, offsetDistance, {
      ...options,
      suggestedFix: options?.joinType === 'miter' 
        ? 'Try using bevel or round join type for sharp angles'
        : 'Check curve geometry and reduce offset distance if necessary'
    });
  }

  /**
   * Create a tolerance error
   */
  static createToleranceError(
    message: string,
    currentTolerance: number,
    requiredTolerance: number,
    failure: ToleranceFailure,
    options?: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      toleranceContext?: string;
    }
  ): ToleranceError {
    return new ToleranceError(message, currentTolerance, requiredTolerance, failure, {
      ...options,
      suggestedFix: `Increase tolerance to at least ${requiredTolerance.toExponential(2)} or simplify geometry`
    });
  }

  /**
   * Create a boolean operation error
   */
  static createBooleanError(
    message: string,
    operationType: string,
    options?: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
      inputCount?: number;
      complexityLevel?: number;
    }
  ): BooleanError {
    return new BooleanError(message, operationType, {
      ...options,
      suggestedFix: 'Try simplifying input geometry or using alternative boolean algorithms'
    });
  }

  /**
   * Create a self-intersection error
   */
  static createSelfIntersectionError(
    message: string,
    intersectionPoints: { x: number; y: number }[],
    segmentIndices: number[],
    options?: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
    }
  ): SelfIntersectionError {
    return new SelfIntersectionError(message, intersectionPoints, segmentIndices, {
      ...options,
      suggestedFix: 'Remove self-intersecting segments or apply geometry healing algorithms'
    });
  }

  /**
   * Create a degenerate geometry error
   */
  static createDegenerateGeometryError(
    message: string,
    geometryType: string,
    degenerateElements: string[],
    options?: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
    }
  ): DegenerateGeometryError {
    return new DegenerateGeometryError(message, geometryType, degenerateElements, {
      ...options,
      suggestedFix: 'Remove degenerate elements or increase geometric precision'
    });
  }

  /**
   * Create a numerical instability error
   */
  static createNumericalInstabilityError(
    message: string,
    calculationType: string,
    inputValues: number[],
    expectedRange: { min: number; max: number },
    options?: {
      severity?: ErrorSeverity;
      operation?: string;
      input?: any;
    }
  ): NumericalInstabilityError {
    return new NumericalInstabilityError(message, calculationType, inputValues, expectedRange, {
      ...options,
      suggestedFix: 'Use higher precision arithmetic or normalize input values'
    });
  }
}