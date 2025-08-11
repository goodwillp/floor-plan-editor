/**
 * Tests for Fallback Notification System
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  FallbackNotificationSystem, 
  NotificationSeverity,
  showFallbackNotification,
  showQualityImpactWarning
} from '../../validation/FallbackNotificationSystem';
import { FallbackNotification } from '../../validation/FallbackMechanisms';

describe('FallbackNotificationSystem', () => {
  let notificationSystem: FallbackNotificationSystem;
  let mockCallbacks: any;

  beforeEach(() => {
    mockCallbacks = {
      onRetry: vi.fn(),
      onAccept: vi.fn(),
      onManualFix: vi.fn(),
      onDismiss: vi.fn(),
      onShowDetails: vi.fn()
    };

    notificationSystem = new FallbackNotificationSystem({
      maxNotifications: 10,
      defaultDuration: 5000,
      callbacks: mockCallbacks
    });
  });

  describe('Basic Notification Functionality', () => {
    it('should show fallback notification with correct severity', () => {
      const notification: FallbackNotification = {
        operation: 'offset',
        originalError: 'Offset operation failed',
        fallbackMethod: 'simplified_geometry',
        qualityImpact: 0.8,
        userGuidance: ['Geometry simplified for calculation'],
        canRetry: true,
        alternativeApproaches: ['Adjust tolerance', 'Simplify input']
      };

      const notificationId = notificationSystem.showFallbackNotification(notification);

      expect(notificationId).toBeTruthy();
      expect(notificationId.startsWith('fallback_')).toBe(true);

      const activeNotifications = notificationSystem.getActiveNotifications();
      expect(activeNotifications).toHaveLength(1);
      expect(activeNotifications[0].operation).toBe('offset');
      expect(activeNotifications[0].severity).toBe(NotificationSeverity.WARNING);
    });

    it('should determine correct severity based on quality impact', () => {
      const criticalNotification: FallbackNotification = {
        operation: 'boolean',
        originalError: 'Critical failure',
        fallbackMethod: 'basic_approximation',
        qualityImpact: 0.2, // Critical quality impact
        userGuidance: ['Critical quality loss'],
        canRetry: false,
        alternativeApproaches: []
      };

      const notificationId = notificationSystem.showFallbackNotification(criticalNotification);
      const notifications = notificationSystem.getActiveNotifications();
      const notification = notifications.find(n => n.id === notificationId);

      expect(notification?.severity).toBe(NotificationSeverity.CRITICAL);
      expect(notification?.displayOptions.duration).toBe(0); // Persistent
      expect(notification?.displayOptions.position).toBe('center');
    });

    it('should handle quality impact warnings', () => {
      const notificationId = showQualityImpactWarning(
        'intersection',
        0.6,
        ['Intersection precision reduced', 'Manual review recommended']
      );

      expect(notificationId).toBeTruthy();

      const notifications = notificationSystem.getActiveNotifications();
      const notification = notifications.find(n => n.id === notificationId);

      expect(notification?.operation).toBe('intersection');
      expect(notification?.qualityImpact).toBe(0.6);
      expect(notification?.severity).toBe(NotificationSeverity.WARNING);
    });

    it('should show batch fallback summary', () => {
      const operations = [
        { operation: 'offset', fallbackMethod: 'simplified', qualityImpact: 0.8 },
        { operation: 'boolean', fallbackMethod: 'approximate', qualityImpact: 0.7 },
        { operation: 'intersection', fallbackMethod: 'basic', qualityImpact: 0.6 }
      ];

      const notificationId = notificationSystem.showBatchFallbackSummary(operations);

      const notifications = notificationSystem.getActiveNotifications();
      const notification = notifications.find(n => n.id === notificationId);

      expect(notification?.operation).toBe('batch_operations');
      expect(notification?.qualityImpact).toBeCloseTo(0.7); // Average
      expect(notification?.userGuidance.some(g => g.includes('3 operations'))).toBe(true);
    });
  });

  describe('User Response Handling', () => {
    it('should handle retry response', () => {
      const notification: FallbackNotification = {
        operation: 'offset',
        originalError: 'Test error',
        fallbackMethod: 'test_method',
        qualityImpact: 0.8,
        userGuidance: [],
        canRetry: true,
        alternativeApproaches: []
      };

      const notificationId = notificationSystem.showFallbackNotification(notification);
      const handled = notificationSystem.handleUserResponse(notificationId, 'retry');

      expect(handled).toBe(true);
      expect(mockCallbacks.onRetry).toHaveBeenCalled();

      const notifications = notificationSystem.getActiveNotifications();
      const updatedNotification = notifications.find(n => n.id === notificationId);
      expect(updatedNotification?.userResponse).toBe('retry');
    });

    it('should handle accept response', () => {
      const notification: FallbackNotification = {
        operation: 'boolean',
        originalError: 'Test error',
        fallbackMethod: 'test_method',
        qualityImpact: 0.7,
        userGuidance: [],
        canRetry: false,
        alternativeApproaches: []
      };

      const notificationId = notificationSystem.showFallbackNotification(notification);
      const handled = notificationSystem.handleUserResponse(notificationId, 'accept');

      expect(handled).toBe(true);
      expect(mockCallbacks.onAccept).toHaveBeenCalled();
    });

    it('should handle manual fix response', () => {
      const notification: FallbackNotification = {
        operation: 'intersection',
        originalError: 'Complex intersection failed',
        fallbackMethod: 'approximate',
        qualityImpact: 0.5,
        userGuidance: ['Manual adjustment recommended'],
        canRetry: true,
        alternativeApproaches: ['Manual editing']
      };

      const notificationId = notificationSystem.showFallbackNotification(notification);
      const handled = notificationSystem.handleUserResponse(notificationId, 'manual');

      expect(handled).toBe(true);
      expect(mockCallbacks.onManualFix).toHaveBeenCalled();
    });

    it('should handle ignore response by dismissing notification', () => {
      const notification: FallbackNotification = {
        operation: 'offset',
        originalError: 'Minor issue',
        fallbackMethod: 'simple_fix',
        qualityImpact: 0.9,
        userGuidance: [],
        canRetry: false,
        alternativeApproaches: []
      };

      const notificationId = notificationSystem.showFallbackNotification(notification);
      const handled = notificationSystem.handleUserResponse(notificationId, 'ignore');

      expect(handled).toBe(true);

      const activeNotifications = notificationSystem.getActiveNotifications();
      const notification_found = activeNotifications.find(n => n.id === notificationId);
      expect(notification_found?.dismissed).toBe(true);
    });

    it('should return false for invalid notification ID', () => {
      const handled = notificationSystem.handleUserResponse('invalid_id', 'retry');
      expect(handled).toBe(false);
    });
  });

  describe('Notification Management', () => {
    it('should dismiss notifications', () => {
      const notification: FallbackNotification = {
        operation: 'test',
        originalError: 'Test error',
        fallbackMethod: 'test_method',
        qualityImpact: 0.8,
        userGuidance: [],
        canRetry: false,
        alternativeApproaches: []
      };

      const notificationId = notificationSystem.showFallbackNotification(notification);
      const dismissed = notificationSystem.dismissNotification(notificationId);

      expect(dismissed).toBe(true);
      expect(mockCallbacks.onDismiss).toHaveBeenCalled();

      const activeNotifications = notificationSystem.getActiveNotifications();
      expect(activeNotifications).toHaveLength(0);
    });

    it('should maintain notification limit', () => {
      // Create more notifications than the limit
      for (let i = 0; i < 15; i++) {
        const notification: FallbackNotification = {
          operation: `test_${i}`,
          originalError: `Error ${i}`,
          fallbackMethod: 'test_method',
          qualityImpact: 0.8,
          userGuidance: [],
          canRetry: false,
          alternativeApproaches: []
        };

        notificationSystem.showFallbackNotification(notification);
      }

      const allNotifications = notificationSystem.exportNotifications();
      expect(allNotifications.length).toBeLessThanOrEqual(10); // Max limit
    });

    it('should clear dismissed notifications', () => {
      // Add several notifications
      const notificationIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const notification: FallbackNotification = {
          operation: `test_${i}`,
          originalError: `Error ${i}`,
          fallbackMethod: 'test_method',
          qualityImpact: 0.8,
          userGuidance: [],
          canRetry: false,
          alternativeApproaches: []
        };

        const id = notificationSystem.showFallbackNotification(notification);
        notificationIds.push(id);
      }

      // Dismiss some notifications
      notificationSystem.dismissNotification(notificationIds[0]);
      notificationSystem.dismissNotification(notificationIds[2]);

      // Clear dismissed notifications
      notificationSystem.clearDismissedNotifications();

      const remainingNotifications = notificationSystem.exportNotifications();
      expect(remainingNotifications.length).toBe(3);
      expect(remainingNotifications.every(n => !n.dismissed)).toBe(true);
    });

    it('should clear all notifications', () => {
      // Add notifications
      for (let i = 0; i < 3; i++) {
        const notification: FallbackNotification = {
          operation: `test_${i}`,
          originalError: `Error ${i}`,
          fallbackMethod: 'test_method',
          qualityImpact: 0.8,
          userGuidance: [],
          canRetry: false,
          alternativeApproaches: []
        };

        notificationSystem.showFallbackNotification(notification);
      }

      notificationSystem.clearNotifications();

      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Statistics and Analytics', () => {
    it('should generate notification statistics', () => {
      // Add various notifications
      const notifications: FallbackNotification[] = [
        {
          operation: 'offset',
          originalError: 'Offset error 1',
          fallbackMethod: 'simplified',
          qualityImpact: 0.8,
          userGuidance: [],
          canRetry: true,
          alternativeApproaches: []
        },
        {
          operation: 'offset',
          originalError: 'Offset error 2',
          fallbackMethod: 'reduced_precision',
          qualityImpact: 0.7,
          userGuidance: [],
          canRetry: true,
          alternativeApproaches: []
        },
        {
          operation: 'boolean',
          originalError: 'Boolean error',
          fallbackMethod: 'simplified',
          qualityImpact: 0.6,
          userGuidance: [],
          canRetry: false,
          alternativeApproaches: []
        }
      ];

      const notificationIds = notifications.map(n => 
        notificationSystem.showFallbackNotification(n)
      );

      // Add user responses
      notificationSystem.handleUserResponse(notificationIds[0], 'retry');
      notificationSystem.handleUserResponse(notificationIds[1], 'accept');

      const stats = notificationSystem.getStatistics();

      expect(stats.totalNotifications).toBe(3);
      expect(stats.notificationsByOperation.get('offset')).toBe(2);
      expect(stats.notificationsByOperation.get('boolean')).toBe(1);
      expect(stats.averageQualityImpact).toBeCloseTo(0.7);
      expect(stats.userResponseRates.get('retry')).toBe(1);
      expect(stats.userResponseRates.get('accept')).toBe(1);
      expect(stats.mostCommonFallbacks[0].method).toBe('simplified');
      expect(stats.mostCommonFallbacks[0].count).toBe(2);
    });

    it('should track notification severity distribution', () => {
      const notifications: FallbackNotification[] = [
        {
          operation: 'test',
          originalError: 'Critical error',
          fallbackMethod: 'basic',
          qualityImpact: 0.2, // Critical
          userGuidance: [],
          canRetry: false,
          alternativeApproaches: []
        },
        {
          operation: 'test',
          originalError: 'Warning error',
          fallbackMethod: 'moderate',
          qualityImpact: 0.6, // Warning
          userGuidance: [],
          canRetry: true,
          alternativeApproaches: []
        },
        {
          operation: 'test',
          originalError: 'Info error',
          fallbackMethod: 'good',
          qualityImpact: 0.95, // Info
          userGuidance: [],
          canRetry: false,
          alternativeApproaches: []
        }
      ];

      notifications.forEach(n => notificationSystem.showFallbackNotification(n));

      const stats = notificationSystem.getStatistics();

      expect(stats.notificationsBySeverity.get(NotificationSeverity.CRITICAL)).toBe(1);
      expect(stats.notificationsBySeverity.get(NotificationSeverity.WARNING)).toBe(1);
      expect(stats.notificationsBySeverity.get(NotificationSeverity.INFO)).toBe(1);
    });
  });

  describe('Import/Export Functionality', () => {
    it('should export and import notifications', () => {
      // Add notifications
      const originalNotifications: FallbackNotification[] = [
        {
          operation: 'export_test',
          originalError: 'Export test error',
          fallbackMethod: 'export_method',
          qualityImpact: 0.8,
          userGuidance: ['Export guidance'],
          canRetry: true,
          alternativeApproaches: ['Export alternative']
        }
      ];

      const notificationIds = originalNotifications.map(n => 
        notificationSystem.showFallbackNotification(n)
      );

      // Export notifications
      const exported = notificationSystem.exportNotifications();
      expect(exported.length).toBe(1);
      expect(exported[0].operation).toBe('export_test');

      // Clear and import
      notificationSystem.clearNotifications();
      expect(notificationSystem.getActiveNotifications()).toHaveLength(0);

      notificationSystem.importNotifications(exported);
      const imported = notificationSystem.getActiveNotifications();
      expect(imported.length).toBe(1);
      expect(imported[0].operation).toBe('export_test');
    });
  });

  describe('Display Options and Behavior', () => {
    it('should set appropriate display options for critical notifications', () => {
      const criticalNotification: FallbackNotification = {
        operation: 'critical_test',
        originalError: 'Critical system failure',
        fallbackMethod: 'emergency_fallback',
        qualityImpact: 0.1,
        userGuidance: ['Immediate attention required'],
        canRetry: true,
        alternativeApproaches: []
      };

      const notificationId = notificationSystem.showFallbackNotification(criticalNotification);
      const notifications = notificationSystem.getActiveNotifications();
      const notification = notifications.find(n => n.id === notificationId);

      expect(notification?.severity).toBe(NotificationSeverity.CRITICAL);
      expect(notification?.displayOptions.duration).toBe(0); // Persistent
      expect(notification?.displayOptions.showRetryButton).toBe(true);
      expect(notification?.displayOptions.position).toBe('center');
    });

    it('should set appropriate display options for info notifications', () => {
      const infoNotification: FallbackNotification = {
        operation: 'info_test',
        originalError: 'Minor adjustment',
        fallbackMethod: 'minor_fallback',
        qualityImpact: 0.95,
        userGuidance: ['Minor quality impact'],
        canRetry: false,
        alternativeApproaches: []
      };

      const notificationId = notificationSystem.showFallbackNotification(infoNotification);
      const notifications = notificationSystem.getActiveNotifications();
      const notification = notifications.find(n => n.id === notificationId);

      expect(notification?.severity).toBe(NotificationSeverity.INFO);
      expect(notification?.displayOptions.duration).toBe(5000); // Auto-dismiss
      expect(notification?.displayOptions.showRetryButton).toBe(false);
      expect(notification?.displayOptions.position).toBe('top-right');
    });
  });

  describe('Global Convenience Functions', () => {
    it('should work with global notification function', () => {
      const notification: FallbackNotification = {
        operation: 'global_test',
        originalError: 'Global test error',
        fallbackMethod: 'global_method',
        qualityImpact: 0.8,
        userGuidance: [],
        canRetry: false,
        alternativeApproaches: []
      };

      const notificationId = showFallbackNotification(notification);
      expect(notificationId).toBeTruthy();
    });

    it('should work with global quality impact warning function', () => {
      const notificationId = showQualityImpactWarning(
        'global_quality_test',
        0.5,
        ['Global quality warning test']
      );

      expect(notificationId).toBeTruthy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle notifications with missing optional fields', () => {
      const minimalNotification: FallbackNotification = {
        operation: 'minimal',
        originalError: 'Minimal error',
        fallbackMethod: 'minimal_method',
        qualityImpact: 0.8,
        userGuidance: [],
        canRetry: false,
        alternativeApproaches: []
      };

      const notificationId = notificationSystem.showFallbackNotification(minimalNotification);
      expect(notificationId).toBeTruthy();

      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications).toHaveLength(1);
    });

    it('should handle extreme quality impact values', () => {
      const extremeNotifications: FallbackNotification[] = [
        {
          operation: 'extreme_low',
          originalError: 'Extreme low quality',
          fallbackMethod: 'extreme_method',
          qualityImpact: 0.0, // Minimum
          userGuidance: [],
          canRetry: false,
          alternativeApproaches: []
        },
        {
          operation: 'extreme_high',
          originalError: 'Extreme high quality',
          fallbackMethod: 'perfect_method',
          qualityImpact: 1.0, // Maximum
          userGuidance: [],
          canRetry: false,
          alternativeApproaches: []
        }
      ];

      extremeNotifications.forEach(n => {
        const notificationId = notificationSystem.showFallbackNotification(n);
        expect(notificationId).toBeTruthy();
      });

      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications).toHaveLength(2);
    });

    it('should handle very long user guidance and alternative approaches', () => {
      const longGuidance = Array(100).fill('Very long guidance text').join(' ');
      const longAlternatives = Array(50).fill('Very long alternative approach').map((text, i) => `${text} ${i}`);

      const notification: FallbackNotification = {
        operation: 'long_content',
        originalError: 'Error with long content',
        fallbackMethod: 'long_method',
        qualityImpact: 0.7,
        userGuidance: [longGuidance],
        canRetry: true,
        alternativeApproaches: longAlternatives
      };

      const notificationId = notificationSystem.showFallbackNotification(notification);
      expect(notificationId).toBeTruthy();

      const notifications = notificationSystem.getActiveNotifications();
      const storedNotification = notifications.find(n => n.id === notificationId);
      expect(storedNotification?.userGuidance[0]).toBe(longGuidance);
      expect(storedNotification?.alternativeApproaches.length).toBe(50);
    });
  });
});