/**
 * User Notification System for Fallback Usage
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { FallbackNotification } from './FallbackMechanisms';

/**
 * Notification severity levels
 */
export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Notification display options
 */
export interface NotificationDisplayOptions {
  duration?: number; // milliseconds, 0 for persistent
  showRetryButton?: boolean;
  showDetailsButton?: boolean;
  allowDismiss?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

/**
 * Enhanced notification with UI metadata
 */
export interface EnhancedFallbackNotification extends FallbackNotification {
  id: string;
  timestamp: Date;
  severity: NotificationSeverity;
  displayOptions: NotificationDisplayOptions;
  dismissed: boolean;
  userResponse?: 'retry' | 'accept' | 'manual' | 'ignore';
}

/**
 * Notification callback interface
 */
export interface NotificationCallbacks {
  onRetry?: (notification: EnhancedFallbackNotification) => void;
  onAccept?: (notification: EnhancedFallbackNotification) => void;
  onManualFix?: (notification: EnhancedFallbackNotification) => void;
  onDismiss?: (notification: EnhancedFallbackNotification) => void;
  onShowDetails?: (notification: EnhancedFallbackNotification) => void;
}

/**
 * Notification statistics
 */
export interface NotificationStatistics {
  totalNotifications: number;
  notificationsByOperation: Map<string, number>;
  notificationsBySeverity: Map<NotificationSeverity, number>;
  averageQualityImpact: number;
  userResponseRates: Map<string, number>;
  mostCommonFallbacks: Array<{ method: string; count: number }>;
}

/**
 * User notification system for fallback usage with quality impact warnings
 */
export class FallbackNotificationSystem {
  private notifications: Map<string, EnhancedFallbackNotification> = new Map();
  private callbacks: NotificationCallbacks = {};
  private maxNotifications: number = 50;
  private defaultDuration: number = 10000; // 10 seconds
  private qualityThresholds = {
    critical: 0.3,
    warning: 0.7,
    info: 0.9
  };

  constructor(options: {
    maxNotifications?: number;
    defaultDuration?: number;
    callbacks?: NotificationCallbacks;
  } = {}) {
    this.maxNotifications = options.maxNotifications || 50;
    this.defaultDuration = options.defaultDuration || 10000;
    this.callbacks = options.callbacks || {};
  }

  /**
   * Show fallback notification to user
   */
  showFallbackNotification(notification: FallbackNotification): string {
    const enhanced = this.enhanceNotification(notification);
    
    // Store notification
    this.notifications.set(enhanced.id, enhanced);
    
    // Maintain notification limit
    this.maintainNotificationLimit();
    
    // Display notification based on severity
    this.displayNotification(enhanced);
    
    // Auto-dismiss if configured
    if (enhanced.displayOptions.duration && enhanced.displayOptions.duration > 0) {
      setTimeout(() => {
        this.dismissNotification(enhanced.id);
      }, enhanced.displayOptions.duration);
    }
    
    return enhanced.id;
  }

  /**
   * Show quality impact warning
   */
  showQualityImpactWarning(
    operation: string,
    qualityImpact: number,
    details: string[]
  ): string {
    const severity = this.determineQualityImpactSeverity(qualityImpact);
    
    const notification: FallbackNotification = {
      operation,
      originalError: 'Quality impact detected',
      fallbackMethod: 'quality_warning',
      qualityImpact,
      userGuidance: [
        `Quality impact: ${(1 - qualityImpact) * 100}% reduction`,
        ...details
      ],
      canRetry: false,
      alternativeApproaches: this.getQualityImprovementSuggestions(operation, qualityImpact)
    };

    return this.showFallbackNotification(notification);
  }

  /**
   * Show batch fallback summary
   */
  showBatchFallbackSummary(
    operations: Array<{
      operation: string;
      fallbackMethod: string;
      qualityImpact: number;
    }>
  ): string {
    const averageQualityImpact = operations.reduce((sum, op) => sum + op.qualityImpact, 0) / operations.length;
    const uniqueMethods = [...new Set(operations.map(op => op.fallbackMethod))];
    
    const notification: FallbackNotification = {
      operation: 'batch_operations',
      originalError: `${operations.length} operations used fallback methods`,
      fallbackMethod: 'batch_summary',
      qualityImpact: averageQualityImpact,
      userGuidance: [
        `${operations.length} operations completed with fallback methods`,
        `Average quality impact: ${(1 - averageQualityImpact) * 100}%`,
        `Methods used: ${uniqueMethods.join(', ')}`,
        'Review results for accuracy'
      ],
      canRetry: true,
      alternativeApproaches: [
        'Review and optimize input geometry',
        'Adjust tolerance settings',
        'Consider manual corrections'
      ]
    };

    return this.showFallbackNotification(notification);
  }

  /**
   * Update notification callbacks
   */
  setCallbacks(callbacks: NotificationCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Dismiss notification
   */
  dismissNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.dismissed = true;
      this.callbacks.onDismiss?.(notification);
      return true;
    }
    return false;
  }

  /**
   * Handle user response to notification
   */
  handleUserResponse(
    notificationId: string, 
    response: 'retry' | 'accept' | 'manual' | 'ignore'
  ): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.userResponse = response;
    
    switch (response) {
      case 'retry':
        this.callbacks.onRetry?.(notification);
        break;
      case 'accept':
        this.callbacks.onAccept?.(notification);
        break;
      case 'manual':
        this.callbacks.onManualFix?.(notification);
        break;
      case 'ignore':
        notification.dismissed = true;
        break;
    }

    return true;
  }

  /**
   * Get active notifications
   */
  getActiveNotifications(): EnhancedFallbackNotification[] {
    return Array.from(this.notifications.values())
      .filter(n => !n.dismissed)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get notification statistics
   */
  getStatistics(): NotificationStatistics {
    const notifications = Array.from(this.notifications.values());
    const totalNotifications = notifications.length;
    
    const notificationsByOperation = new Map<string, number>();
    const notificationsBySeverity = new Map<NotificationSeverity, number>();
    const userResponseRates = new Map<string, number>();
    const fallbackMethods = new Map<string, number>();
    
    let totalQualityImpact = 0;

    for (const notification of notifications) {
      // Count by operation
      const opCount = notificationsByOperation.get(notification.operation) || 0;
      notificationsByOperation.set(notification.operation, opCount + 1);
      
      // Count by severity
      const sevCount = notificationsBySeverity.get(notification.severity) || 0;
      notificationsBySeverity.set(notification.severity, sevCount + 1);
      
      // Count user responses
      if (notification.userResponse) {
        const respCount = userResponseRates.get(notification.userResponse) || 0;
        userResponseRates.set(notification.userResponse, respCount + 1);
      }
      
      // Count fallback methods
      const methodCount = fallbackMethods.get(notification.fallbackMethod) || 0;
      fallbackMethods.set(notification.fallbackMethod, methodCount + 1);
      
      totalQualityImpact += notification.qualityImpact;
    }

    const mostCommonFallbacks = Array.from(fallbackMethods.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalNotifications,
      notificationsByOperation,
      notificationsBySeverity,
      averageQualityImpact: totalNotifications > 0 ? totalQualityImpact / totalNotifications : 0,
      userResponseRates,
      mostCommonFallbacks
    };
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications.clear();
  }

  /**
   * Clear dismissed notifications
   */
  clearDismissedNotifications(): void {
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.dismissed) {
        this.notifications.delete(id);
      }
    }
  }

  /**
   * Export notifications for analysis
   */
  exportNotifications(): EnhancedFallbackNotification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Import notifications (for testing or restoration)
   */
  importNotifications(notifications: EnhancedFallbackNotification[]): void {
    this.notifications.clear();
    for (const notification of notifications) {
      this.notifications.set(notification.id, notification);
    }
  }

  /**
   * Enhance basic notification with UI metadata
   */
  private enhanceNotification(notification: FallbackNotification): EnhancedFallbackNotification {
    const severity = this.determineSeverity(notification);
    const displayOptions = this.getDisplayOptions(severity, notification);

    return {
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date(),
      severity,
      displayOptions,
      dismissed: false
    };
  }

  /**
   * Determine notification severity based on quality impact and operation
   */
  private determineSeverity(notification: FallbackNotification): NotificationSeverity {
    // Critical quality impact
    if (notification.qualityImpact < this.qualityThresholds.critical) {
      return NotificationSeverity.CRITICAL;
    }
    
    // High quality impact or failed operations
    if (notification.qualityImpact < this.qualityThresholds.warning || 
        notification.fallbackMethod === 'none_successful') {
      return NotificationSeverity.ERROR;
    }
    
    // Moderate quality impact
    if (notification.qualityImpact < this.qualityThresholds.info) {
      return NotificationSeverity.WARNING;
    }
    
    // Low quality impact
    return NotificationSeverity.INFO;
  }

  /**
   * Determine quality impact severity
   */
  private determineQualityImpactSeverity(qualityImpact: number): NotificationSeverity {
    if (qualityImpact < this.qualityThresholds.critical) {
      return NotificationSeverity.CRITICAL;
    } else if (qualityImpact < this.qualityThresholds.warning) {
      return NotificationSeverity.ERROR;
    } else if (qualityImpact < this.qualityThresholds.info) {
      return NotificationSeverity.WARNING;
    } else {
      return NotificationSeverity.INFO;
    }
  }

  /**
   * Get display options based on severity and notification type
   */
  private getDisplayOptions(
    severity: NotificationSeverity, 
    notification: FallbackNotification
  ): NotificationDisplayOptions {
    const baseOptions: NotificationDisplayOptions = {
      allowDismiss: true,
      showDetailsButton: true,
      position: 'top-right'
    };

    switch (severity) {
      case NotificationSeverity.CRITICAL:
        return {
          ...baseOptions,
          duration: 0, // Persistent
          showRetryButton: notification.canRetry,
          position: 'center'
        };
        
      case NotificationSeverity.ERROR:
        return {
          ...baseOptions,
          duration: 0, // Persistent
          showRetryButton: notification.canRetry
        };
        
      case NotificationSeverity.WARNING:
        return {
          ...baseOptions,
          duration: 15000, // 15 seconds
          showRetryButton: notification.canRetry
        };
        
      case NotificationSeverity.INFO:
        return {
          ...baseOptions,
          duration: this.defaultDuration,
          showRetryButton: false
        };
        
      default:
        return baseOptions;
    }
  }

  /**
   * Display notification using appropriate method
   */
  private displayNotification(notification: EnhancedFallbackNotification): void {
    // This would integrate with the actual UI notification system
    // For now, we'll use console output with different levels
    
    const message = this.formatNotificationMessage(notification);
    
    switch (notification.severity) {
      case NotificationSeverity.CRITICAL:
        console.error('🚨 CRITICAL BIM Fallback:', message);
        break;
      case NotificationSeverity.ERROR:
        console.error('❌ BIM Fallback Error:', message);
        break;
      case NotificationSeverity.WARNING:
        console.warn('⚠️ BIM Fallback Warning:', message);
        break;
      case NotificationSeverity.INFO:
        console.info('ℹ️ BIM Fallback Info:', message);
        break;
    }

    // In a real implementation, this would trigger UI notifications
    // such as toast messages, modal dialogs, or status bar updates
  }

  /**
   * Format notification message for display
   */
  private formatNotificationMessage(notification: EnhancedFallbackNotification): string {
    const qualityLoss = (1 - notification.qualityImpact) * 100;
    
    let message = `${notification.operation} operation used fallback method: ${notification.fallbackMethod}`;
    
    if (qualityLoss > 0) {
      message += ` (${qualityLoss.toFixed(1)}% quality reduction)`;
    }
    
    if (notification.userGuidance.length > 0) {
      message += `\nGuidance: ${notification.userGuidance[0]}`;
    }
    
    return message;
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Maintain notification limit by removing oldest dismissed notifications
   */
  private maintainNotificationLimit(): void {
    if (this.notifications.size <= this.maxNotifications) {
      return;
    }

    // Get dismissed notifications sorted by timestamp (oldest first)
    const dismissedNotifications = Array.from(this.notifications.entries())
      .filter(([_, notification]) => notification.dismissed)
      .sort(([_, a], [__, b]) => a.timestamp.getTime() - b.timestamp.getTime());

    // Remove oldest dismissed notifications
    const toRemove = this.notifications.size - this.maxNotifications;
    for (let i = 0; i < Math.min(toRemove, dismissedNotifications.length); i++) {
      this.notifications.delete(dismissedNotifications[i][0]);
    }

    // If still over limit, remove oldest notifications regardless of status
    if (this.notifications.size > this.maxNotifications) {
      const allNotifications = Array.from(this.notifications.entries())
        .sort(([_, a], [__, b]) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const stillToRemove = this.notifications.size - this.maxNotifications;
      for (let i = 0; i < stillToRemove; i++) {
        this.notifications.delete(allNotifications[i][0]);
      }
    }
  }

  /**
   * Get quality improvement suggestions based on operation and impact
   */
  private getQualityImprovementSuggestions(operation: string, qualityImpact: number): string[] {
    const suggestions: string[] = [];
    
    if (qualityImpact < 0.5) {
      suggestions.push('Consider manual geometry correction');
      suggestions.push('Review input parameters for optimization');
    }
    
    if (qualityImpact < 0.7) {
      suggestions.push('Try adjusting tolerance settings');
      suggestions.push('Simplify input geometry if possible');
    }
    
    switch (operation) {
      case 'offset':
        suggestions.push('Consider different join types');
        suggestions.push('Adjust wall thickness if feasible');
        break;
      case 'boolean':
        suggestions.push('Apply shape healing before operation');
        suggestions.push('Break complex operations into simpler steps');
        break;
      case 'intersection':
        suggestions.push('Simplify intersection geometry');
        suggestions.push('Consider alternative intersection methods');
        break;
    }
    
    return suggestions;
  }
}

/**
 * Global notification system instance
 */
export const globalFallbackNotificationSystem = new FallbackNotificationSystem();

/**
 * Convenience function to show fallback notification
 */
export function showFallbackNotification(notification: FallbackNotification): string {
  return globalFallbackNotificationSystem.showFallbackNotification(notification);
}

/**
 * Convenience function to show quality impact warning
 */
export function showQualityImpactWarning(
  operation: string,
  qualityImpact: number,
  details: string[]
): string {
  return globalFallbackNotificationSystem.showQualityImpactWarning(operation, qualityImpact, details);
}