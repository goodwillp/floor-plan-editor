/**
 * BIM Geometric Engine - Main exports
 * 
 * This module provides the core BIM geometric processing capabilities
 * for robust wall generation and intersection handling.
 */

// Core geometric data structures
export * from './geometry/BIMPoint';
export * from './geometry/Vector2D';
export * from './geometry/BIMPolygon';
export * from './geometry/Curve';
export * from './geometry/WallSolid';
export * from './geometry/IntersectionData';
export * from './geometry/MiterCalculation';

// Geometric engines
export * from './engines/RobustOffsetEngine';
export * from './engines/AdaptiveToleranceManager';
export * from './engines/BooleanOperationsEngine';
export * from './engines/IntersectionCache';
export * from './engines/IntersectionManager';

// Error handling and validation
export * from './validation/GeometricError';
export * from './validation/BIMErrorHandler';
export * from './validation/GeometryValidator';
export * from './validation/EdgeCaseDetector';
export * from './validation/EdgeCaseHandler';
export * from './validation/FallbackMechanisms';
export * from './validation/FallbackNotificationSystem';

// Visualization components
export * from './visualization/BIMVisualizationEngine';
export * from './visualization/PixiJSBIMRenderer';
export * from './visualization/QualityColorCoding';
export * from './visualization/ToleranceZoneVisualizer';
export * from './visualization/GeometricDebuggingTools';
export * from './visualization/ErrorVisualizationSystem';
export * from './visualization/ErrorStatisticsDashboard';

// Performance monitoring
export * from './performance/PerformanceMonitoringSystem';
export * from './performance/PerformanceMetricsCollector';
export * from './performance/OptimizationRecommendationEngine';
export * from './performance/CacheEffectivenessMonitor';
export * from './performance/PerformanceProfiler';

// Types and interfaces
export * from './types/PerformanceTypes';
export * from './types/VisualizationTypes';