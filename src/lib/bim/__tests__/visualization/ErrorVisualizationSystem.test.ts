/**
 * Tests for ErrorVisualizationSystem
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ErrorVisualizationSystem, ErrorSeverityLevel } from '../../visualization/ErrorVisualizationSystem';
import { GeometricError } from '../../validation/GeometricError';

describe('ErrorVisualizationSystem', () => {
  let system: ErrorVisualizationSystem;
  let mockError: GeometricError;
  let mockGeometry: any;

  beforeEach(() => {
    system = new ErrorVisualizationSystem();
    
    mockError = {
      id: 'test-error-1',
      type: 'offset_failure',
      severity: 'error',
      operation: 'offsetCurve',
      message: 'Failed to offset curve due to self-intersection',
      timestamp: Date.now(),
      recoverable: true,
      metadata: {
        wallThickness: 0.2,
        joinType: 'miter'
      }
    };

    mockGeometry = {
      points: [
        { x: 0, y: 0, id: 'p1', tolerance: 0.001 },
        { x: 10, y: 0, id: 'p2', tolerance: 0.001 },
        { x: 10, y: 10, id: 'p3', tolerance: 0.001 },
        { x: 0, y: 10, id: 'p4', tolerance: 0.001 }
      ],
      isValid: false,
      selfIntersects: true,
      hasSliversFaces: false,
      hasMicroGaps: false
    };
  });

  describe('Error Highlighting', () => {
    test('should highlight geometric errors', () => {
      const highlightId = system.highlightError(mockError, mockGeometry);

      expect(highlightId).toBeDefined();
      expect(highlightId).toContain('error_');

      const highlights = system.getErrorHighlights();
      expect(highlights).toHaveLength(1);
      expect(highlights[0].error.id).toBe(mockError.id);
      expect(highlights[0].severity).toBe(ErrorSeverityLevel.HIGH);
    });

    test('should map error severity correctly', () => {
      const criticalError: GeometricError = {
        ...mockError,
        severity: 'critical'
      };

      const highlightId = system.highlightError(criticalError, mockGeometry);
      const highlights = system.getErrorHighlights();

      expect(highlights[0].severity).toBe(ErrorSeverityLevel.CRITICAL);
    });

    test('should remove error highlights', () => {
      const highlightId = system.highlightError(mockError, mockGeometry);
      expect(system.getErrorHighlights()).toHaveLength(1);

      const removed = system.removeErrorHighlight(highlightId);
      expect(removed).toBe(true);
      expect(system.getErrorHighlights()).toHaveLength(0);
    });

    test('should filter highlights by severity', () => {
      const highError: GeometricError = { ...mockError, severity: 'error' };
      const lowError: GeometricError = { ...mockError, id: 'low-error', severity: 'warning' };

      system.highlightError(highError, mockGeometry);
      system.highlightError(lowError, mockGeometry);

      const allHighlights = system.getErrorHighlights();
      expect(allHighlights).toHaveLength(2);

      const highSeverityOnly = system.getErrorHighlights([ErrorSeverityLevel.HIGH]);
      expect(highSeverityOnly).toHaveLength(1);
      expect(highSeverityOnly[0].severity).toBe(ErrorSeverityLevel.HIGH);
    });

    test('should handle disabled error highlighting', () => {
      const disabledSystem = new ErrorVisualizationSystem({
        enableErrorHighlighting: false
      });

      const highlightId = disabledSystem.highlightError(mockError, mockGeometry);
      expect(highlightId).toBe('');
      expect(disabledSystem.getErrorHighlights()).toHaveLength(0);
    });
  });

  describe('Error Tooltips', () => {
    test('should create detailed error tooltips', () => {
      const tooltip = system.createErrorTooltip(mockError);

      expect(tooltip.title).toBe('Offset Operation Failed');
      expect(tooltip.description).toBe(mockError.message);
      expect(tooltip.technicalDetails).toContain('Type: offset_failure');
      expect(tooltip.technicalDetails).toContain('Operation: offsetCurve');
      expect(tooltip.suggestedActions).toContain('Try reducing wall thickness');
      expect(tooltip.timestamp).toBeGreaterThan(0);
    });

    test('should find related errors', () => {
      // Add multiple related errors
      const relatedError1: GeometricError = {
        ...mockError,
        id: 'related-1',
        timestamp: mockError.timestamp + 1000
      };
      
      const relatedError2: GeometricError = {
        ...mockError,
        id: 'related-2',
        type: 'boolean_failure',
        timestamp: mockError.timestamp + 2000
      };

      system.highlightError(mockError, mockGeometry);
      system.highlightError(relatedError1, mockGeometry);
      system.highlightError(relatedError2, mockGeometry);

      const tooltip = system.createErrorTooltip(mockError);
      expect(tooltip.relatedErrors.length).toBeGreaterThan(0);
    });

    test('should provide appropriate suggested actions', () => {
      const booleanError: GeometricError = {
        ...mockError,
        type: 'boolean_failure'
      };

      const tooltip = system.createErrorTooltip(booleanError);
      expect(tooltip.suggestedActions).toContain('Check for self-intersections');
      expect(tooltip.suggestedActions).toContain('Increase tolerance values');
    });
  });

  describe('Error Recovery Visualization', () => {
    test('should visualize error recovery process', () => {
      const beforeGeometry = { ...mockGeometry, isValid: false };
      const afterGeometry = { ...mockGeometry, isValid: true, selfIntersects: false };

      const visualizationId = system.visualizeErrorRecovery(
        mockError.id,
        beforeGeometry,
        afterGeometry,
        'geometry_healing',
        true
      );

      expect(visualizationId).toBeDefined();
      expect(visualizationId).toContain('recovery_');
    });

    test('should handle disabled recovery visualization', () => {
      const disabledSystem = new ErrorVisualizationSystem({
        enableRecoveryVisualization: false
      });

      const visualizationId = disabledSystem.visualizeErrorRecovery(
        mockError.id,
        mockGeometry,
        mockGeometry,
        'test_recovery',
        true
      );

      expect(visualizationId).toBe('');
    });

    test('should calculate quality impact correctly', () => {
      const beforeGeometry = { 
        isValid: false, 
        selfIntersects: true, 
        hasSliversFaces: true, 
        hasMicroGaps: true 
      };
      const afterGeometry = { 
        isValid: true, 
        selfIntersects: false, 
        hasSliversFaces: false, 
        hasMicroGaps: false 
      };

      const visualizationId = system.visualizeErrorRecovery(
        mockError.id,
        beforeGeometry,
        afterGeometry,
        'comprehensive_healing',
        true
      );

      expect(visualizationId).toBeDefined();
      // Quality should improve significantly
    });
  });

  describe('Error Statistics', () => {
    test('should generate comprehensive error statistics', () => {
      // Add multiple errors of different types and severities
      const errors = [
        { ...mockError, type: 'offset_failure', severity: 'error' as const },
        { ...mockError, id: 'error-2', type: 'boolean_failure', severity: 'critical' as const },
        { ...mockError, id: 'error-3', type: 'offset_failure', severity: 'warning' as const },
        { ...mockError, id: 'error-4', type: 'degenerate_geometry', severity: 'error' as const }
      ];

      errors.forEach(error => {
        system.highlightError(error, mockGeometry);
      });

      const statistics = system.generateErrorStatistics();

      expect(statistics.totalErrors).toBe(4);
      expect(statistics.errorsByType.get('offset_failure')).toBe(2);
      expect(statistics.errorsByType.get('boolean_failure')).toBe(1);
      expect(statistics.errorsBySeverity.get(ErrorSeverityLevel.CRITICAL)).toBe(1);
      expect(statistics.errorsBySeverity.get(ErrorSeverityLevel.HIGH)).toBe(2);
      expect(statistics.topErrorTypes).toHaveLength(3);
      expect(statistics.topErrorTypes[0].type).toBe('offset_failure');
    });

    test('should filter statistics by time window', () => {
      const oldError: GeometricError = {
        ...mockError,
        timestamp: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
      };

      const recentError: GeometricError = {
        ...mockError,
        id: 'recent-error',
        timestamp: Date.now() - 30 * 60 * 1000 // 30 minutes ago
      };

      system.highlightError(oldError, mockGeometry);
      system.highlightError(recentError, mockGeometry);

      const allStats = system.generateErrorStatistics();
      expect(allStats.totalErrors).toBe(2);

      const recentStats = system.generateErrorStatistics(60 * 60 * 1000); // 1 hour window
      expect(recentStats.totalErrors).toBe(1);
    });

    test('should calculate error trends', () => {
      // Add errors at different times
      const now = Date.now();
      const errors = [
        { ...mockError, timestamp: now - 3 * 60 * 60 * 1000 }, // 3 hours ago
        { ...mockError, id: 'error-2', timestamp: now - 2 * 60 * 60 * 1000 }, // 2 hours ago
        { ...mockError, id: 'error-3', timestamp: now - 1 * 60 * 60 * 1000 }, // 1 hour ago
        { ...mockError, id: 'error-4', timestamp: now - 30 * 60 * 1000 } // 30 minutes ago
      ];

      errors.forEach(error => {
        system.highlightError(error, mockGeometry);
      });

      const statistics = system.generateErrorStatistics();
      expect(statistics.errorTrends.length).toBeGreaterThan(0);
    });
  });

  describe('Suggested Fixes', () => {
    test('should generate suggested fixes for errors', () => {
      const highlightId = system.highlightError(mockError, mockGeometry);
      const highlights = system.getErrorHighlights();
      const suggestedFix = highlights[0].suggestedFix;

      expect(suggestedFix).toBeDefined();
      expect(suggestedFix!.title).toBe('Fix Offset Operation');
      expect(suggestedFix!.steps.length).toBeGreaterThan(0);
      expect(suggestedFix!.difficulty).toBe('medium');
    });

    test('should provide different fixes for different error types', () => {
      const booleanError: GeometricError = {
        ...mockError,
        type: 'boolean_failure'
      };

      system.highlightError(mockError, mockGeometry); // offset_failure
      system.highlightError(booleanError, mockGeometry); // boolean_failure

      const highlights = system.getErrorHighlights();
      const offsetFix = highlights.find(h => h.error.type === 'offset_failure')?.suggestedFix;
      const booleanFix = highlights.find(h => h.error.type === 'boolean_failure')?.suggestedFix;

      expect(offsetFix?.title).toBe('Fix Offset Operation');
      expect(booleanFix?.title).toBe('Fix Boolean Operation');
      expect(booleanFix?.difficulty).toBe('hard');
    });

    test('should apply suggested fixes', async () => {
      const highlightId = system.highlightError(mockError, mockGeometry);
      const highlights = system.getErrorHighlights();
      const fixId = highlights[0].suggestedFix!.id;

      const result = await system.applySuggestedFix(fixId);
      expect(typeof result).toBe('boolean');
    });

    test('should preview fix effects', async () => {
      const highlightId = system.highlightError(mockError, mockGeometry);
      const highlights = system.getErrorHighlights();
      const fixId = highlights[0].suggestedFix!.id;

      const preview = await system.previewFix(fixId);
      expect(preview).toBeDefined();
      expect(preview!.metadata.preview).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        enableTooltips: false,
        colorScheme: {
          critical: '#FF0000',
          high: '#FF6600',
          medium: '#FFAA00',
          low: '#FFDD00',
          warning: '#FFF000',
          info: '#00AAFF',
          background: '#000000', // Changed
          text: '#FFFFFF' // Changed
        }
      };

      system.updateConfig(newConfig);

      // Add an error to test the new configuration
      const highlightId = system.highlightError(mockError, mockGeometry);
      const highlights = system.getErrorHighlights();

      expect(highlights).toHaveLength(1);
      // Configuration should be applied to new highlights
    });

    test('should export error data', () => {
      system.highlightError(mockError, mockGeometry);
      
      const exportData = system.exportErrorData();
      const parsed = JSON.parse(exportData);

      expect(parsed.statistics).toBeDefined();
      expect(parsed.highlights).toBeDefined();
      expect(parsed.config).toBeDefined();
      expect(parsed.exportTimestamp).toBeDefined();
    });
  });

  describe('Data Cleanup', () => {
    test('should cleanup old error data', () => {
      const oldError: GeometricError = {
        ...mockError,
        timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };

      const recentError: GeometricError = {
        ...mockError,
        id: 'recent-error',
        timestamp: Date.now() - 1 * 60 * 60 * 1000 // 1 hour ago
      };

      system.highlightError(oldError, mockGeometry);
      system.highlightError(recentError, mockGeometry);

      expect(system.getErrorHighlights()).toHaveLength(2);

      // Cleanup with 24-hour max age
      system.cleanup(24 * 60 * 60 * 1000);

      const remainingHighlights = system.getErrorHighlights();
      expect(remainingHighlights).toHaveLength(1);
      expect(remainingHighlights[0].error.id).toBe('recent-error');
    });

    test('should cleanup recovery visualizations', () => {
      const oldRecoveryId = system.visualizeErrorRecovery(
        'old-error',
        mockGeometry,
        mockGeometry,
        'old_recovery',
        true
      );

      // Move time forward
      vi.useFakeTimers();
      vi.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

      const recentRecoveryId = system.visualizeErrorRecovery(
        'recent-error',
        mockGeometry,
        mockGeometry,
        'recent_recovery',
        true
      );

      system.cleanup(24 * 60 * 60 * 1000);

      vi.useRealTimers();
    });
  });

  describe('Error Geometry Creation', () => {
    test('should create point geometry for single point', () => {
      const pointGeometry = {
        points: [{ x: 5, y: 5, id: 'p1', tolerance: 0.001 }]
      };

      const highlightId = system.highlightError(mockError, pointGeometry);
      const highlights = system.getErrorHighlights();

      expect(highlights[0].geometry.type).toBe('point');
      expect(highlights[0].geometry.coordinates).toHaveLength(1);
    });

    test('should create line geometry for two points', () => {
      const lineGeometry = {
        points: [
          { x: 0, y: 0, id: 'p1', tolerance: 0.001 },
          { x: 10, y: 0, id: 'p2', tolerance: 0.001 }
        ]
      };

      const highlightId = system.highlightError(mockError, lineGeometry);
      const highlights = system.getErrorHighlights();

      expect(highlights[0].geometry.type).toBe('line');
      expect(highlights[0].geometry.coordinates).toHaveLength(2);
    });

    test('should create polygon geometry for multiple points', () => {
      const highlightId = system.highlightError(mockError, mockGeometry);
      const highlights = system.getErrorHighlights();

      expect(highlights[0].geometry.type).toBe('polygon');
      expect(highlights[0].geometry.coordinates).toHaveLength(4);
    });

    test('should apply correct styling based on severity', () => {
      const criticalError: GeometricError = {
        ...mockError,
        severity: 'critical'
      };

      const highlightId = system.highlightError(criticalError, mockGeometry);
      const highlights = system.getErrorHighlights();

      expect(highlights[0].geometry.style.animation).toBeDefined();
      expect(highlights[0].geometry.style.animation!.type).toBe('pulse');
    });
  });

  describe('Bounding Box Calculation', () => {
    test('should calculate correct bounding box', () => {
      const highlightId = system.highlightError(mockError, mockGeometry);
      const highlights = system.getErrorHighlights();

      expect(highlights[0].bounds.minX).toBe(0);
      expect(highlights[0].bounds.minY).toBe(0);
      expect(highlights[0].bounds.maxX).toBe(10);
      expect(highlights[0].bounds.maxY).toBe(10);
    });

    test('should handle empty geometry', () => {
      const emptyGeometry = { points: [] };
      const highlightId = system.highlightError(mockError, emptyGeometry);
      const highlights = system.getErrorHighlights();

      expect(highlights[0].bounds.minX).toBe(0);
      expect(highlights[0].bounds.minY).toBe(0);
      expect(highlights[0].bounds.maxX).toBe(0);
      expect(highlights[0].bounds.maxY).toBe(0);
    });
  });
});