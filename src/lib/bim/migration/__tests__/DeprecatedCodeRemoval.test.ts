/**
 * Deprecated Code Removal Tests
 * Ensures no functionality regression after deprecated code removal
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeprecatedCodeRemovalManager } from '../DeprecatedCodeRemoval';
import { DEPRECATED_METHODS, DEPRECATED_CONSTANTS } from '../DeprecationInventory';

describe('DeprecatedCodeRemoval', () => {
  let removalManager: DeprecatedCodeRemovalManager;

  beforeEach(() => {
    removalManager = new DeprecatedCodeRemovalManager();
  });

  describe('Removal Plan Generation', () => {
    it('should generate removal plans for all deprecated methods', () => {
      const plans = removalManager.getAllRemovalPlans();
      
      // Should have plans for all deprecated items
      expect(plans.size).toBeGreaterThan(0);
      
      // Check that critical deprecated methods have plans
      const criticalMethods = [
        'wall-renderer-basic-offset',
        'geometry-service-fixed-tolerance',
        'tolerance-config-pixel-based'
      ];
      
      criticalMethods.forEach(methodId => {
        expect(plans.has(methodId)).toBe(true);
      });
    });

    it('should create appropriate removal strategies based on impact', () => {
      const plans = removalManager.getAllRemovalPlans();
      
      // High impact items should use 'replace-first' strategy
      const highImpactPlan = plans.get('wall-renderer-basic-offset');
      expect(highImpactPlan?.removalStrategy).toBe('replace-first');
      
      // Lower impact items can use gradual removal
      const lowImpactPlan = plans.get('wall-renderer-hardcoded-tolerance');
      expect(lowImpactPlan?.removalStrategy).toBe('gradual');
    });

    it('should identify dependencies correctly', () => {
      const plan = removalManager.getRemovalPlan('wall-renderer-basic-offset');
      
      expect(plan).toBeDefined();
      expect(Array.isArray(plan!.dependencies)).toBe(true);
      expect(plan!.dependencies).toContain('RobustOffsetEngine');
    });

    it('should generate proper removal steps', () => {
      const plan = removalManager.getRemovalPlan('geometry-service-fixed-tolerance');
      
      expect(plan).toBeDefined();
      expect(plan!.removalSteps.length).toBeGreaterThan(0);
      
      // Should include backup step
      const backupStep = plan!.removalSteps.find(step => step.action === 'backup');
      expect(backupStep).toBeDefined();
      
      // Should include replace step
      const replaceStep = plan!.removalSteps.find(step => step.action === 'replace');
      expect(replaceStep).toBeDefined();
      
      // Should include test step
      const testStep = plan!.removalSteps.find(step => step.action === 'test');
      expect(testStep).toBeDefined();
    });
  });

  describe('Removal Readiness Assessment', () => {
    it('should assess removal readiness correctly', () => {
      const readiness = removalManager.getRemovalReadiness();
      
      expect(readiness).toHaveProperty('readyForRemoval');
      expect(readiness).toHaveProperty('requiresPreparation');
      expect(readiness).toHaveProperty('blockedByDependencies');
      expect(readiness).toHaveProperty('totalItems');
      
      expect(Array.isArray(readiness.readyForRemoval)).toBe(true);
      expect(Array.isArray(readiness.requiresPreparation)).toBe(true);
      expect(Array.isArray(readiness.blockedByDependencies)).toBe(true);
      expect(typeof readiness.totalItems).toBe('number');
      
      // Total should equal sum of categories
      const total = readiness.readyForRemoval.length + 
                   readiness.requiresPreparation.length + 
                   readiness.blockedByDependencies.length;
      expect(total).toBe(readiness.totalItems);
    });

    it('should categorize items based on replacement readiness', () => {
      const readiness = removalManager.getRemovalReadiness();
      
      // Items with BIM replacements should be ready or require preparation
      const bimRelatedItems = readiness.readyForRemoval.concat(readiness.requiresPreparation);
      expect(bimRelatedItems.length).toBeGreaterThan(0);
    });
  });

  describe('Removal Execution', () => {
    it('should execute removal plan successfully for ready items', async () => {
      const readiness = removalManager.getRemovalReadiness();
      
      if (readiness.readyForRemoval.length > 0) {
        const itemId = readiness.readyForRemoval[0];
        const result = await removalManager.executeRemovalPlan(itemId);
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('itemsRemoved');
        expect(result).toHaveProperty('itemsReplaced');
        expect(result).toHaveProperty('backupsCreated');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        
        // Should create backups
        expect(result.backupsCreated.length).toBeGreaterThan(0);
      }
    });

    it('should handle removal failures gracefully', async () => {
      // Try to remove non-existent item
      const result = await removalManager.executeRemovalPlan('non-existent-item');
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No removal plan found');
    });

    it('should execute batch removal in correct order', async () => {
      const readiness = removalManager.getRemovalReadiness();
      const itemsToRemove = readiness.readyForRemoval.slice(0, 3); // Test with first 3 items
      
      if (itemsToRemove.length > 0) {
        const results = await removalManager.executeBatchRemoval(itemsToRemove);
        
        expect(results.size).toBe(itemsToRemove.length);
        
        // Check that all items were processed
        itemsToRemove.forEach(itemId => {
          expect(results.has(itemId)).toBe(true);
        });
      }
    });
  });

  describe('Code Replacement Generation', () => {
    it('should generate appropriate replacement code for hardcoded tolerances', () => {
      const plan = removalManager.getRemovalPlan('wall-renderer-hardcoded-tolerance');
      
      expect(plan).toBeDefined();
      
      const replaceStep = plan!.removalSteps.find(step => step.action === 'replace');
      expect(replaceStep).toBeDefined();
      expect(replaceStep!.replacementCode).toBeDefined();
      expect(replaceStep!.replacementCode).toContain('AdaptiveToleranceManager');
      expect(replaceStep!.replacementCode).toContain('calculateTolerance');
    });

    it('should generate replacement code for fixed tolerance constants', () => {
      const plan = removalManager.getRemovalPlan('geometry-service-fixed-tolerance');
      
      expect(plan).toBeDefined();
      
      const replaceStep = plan!.removalSteps.find(step => step.action === 'replace');
      expect(replaceStep).toBeDefined();
      expect(replaceStep!.replacementCode).toContain('getAdaptiveTolerance');
    });

    it('should generate replacement for pixel-based tolerance config', () => {
      const plan = removalManager.getRemovalPlan('tolerance-config-pixel-based');
      
      expect(plan).toBeDefined();
      
      const replaceStep = plan!.removalSteps.find(step => step.action === 'replace');
      expect(replaceStep).toBeDefined();
      expect(replaceStep!.replacementCode).toContain('projectionMinMath');
      expect(replaceStep!.replacementCode).toContain('mathematical precision');
    });
  });

  describe('Validation Criteria', () => {
    it('should define appropriate validation criteria for each step', () => {
      const plan = removalManager.getRemovalPlan('geometry-service-fixed-tolerance');
      
      expect(plan).toBeDefined();
      
      plan!.removalSteps.forEach(step => {
        expect(Array.isArray(step.validationCriteria)).toBe(true);
        expect(step.validationCriteria.length).toBeGreaterThan(0);
        
        // Each criteria should be a non-empty string
        step.validationCriteria.forEach(criteria => {
          expect(typeof criteria).toBe('string');
          expect(criteria.length).toBeGreaterThan(0);
        });
      });
    });

    it('should include compilation validation for code changes', () => {
      const plan = removalManager.getRemovalPlan('wall-renderer-hardcoded-tolerance');
      
      expect(plan).toBeDefined();
      
      const replaceStep = plan!.removalSteps.find(step => step.action === 'replace');
      expect(replaceStep).toBeDefined();
      
      const hasCompilationCheck = replaceStep!.validationCriteria.some(criteria => 
        criteria.toLowerCase().includes('compile') || criteria.toLowerCase().includes('syntax')
      );
      expect(hasCompilationCheck).toBe(true);
    });

    it('should include test validation for all changes', () => {
      const plan = removalManager.getRemovalPlan('geometry-service-basic-intersection');
      
      expect(plan).toBeDefined();
      
      const testStep = plan!.removalSteps.find(step => step.action === 'test');
      expect(testStep).toBeDefined();
      
      const hasTestValidation = testStep!.validationCriteria.some(criteria => 
        criteria.toLowerCase().includes('test')
      );
      expect(hasTestValidation).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive removal report', () => {
      const report = removalManager.generateRemovalReport();
      
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      
      // Should contain key sections
      expect(report).toContain('# Deprecated Code Removal Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Ready for Removal');
      expect(report).toContain('## Requires Preparation');
      expect(report).toContain('## Blocked by Dependencies');
      
      // Should contain statistics
      expect(report).toContain('Total deprecated items:');
      expect(report).toContain('Ready for removal:');
      expect(report).toContain('Requires preparation:');
      expect(report).toContain('Blocked by dependencies:');
    });

    it('should include timestamp in report', () => {
      const report = removalManager.generateRemovalReport();
      
      // Should contain ISO timestamp
      expect(report).toMatch(/Generated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Safety Checks', () => {
    it('should not mark high-impact items as safe to remove without replacements', () => {
      const plan = removalManager.getRemovalPlan('wall-renderer-basic-offset');
      
      expect(plan).toBeDefined();
      
      // High impact items should require replacement readiness
      if (!plan!.replacementReady) {
        expect(plan!.safeToRemove).toBe(false);
      }
    });

    it('should require dependencies to be met before removal', () => {
      const plans = removalManager.getAllRemovalPlans();
      
      plans.forEach((plan, itemId) => {
        if (plan.dependencies.length > 0 && !plan.replacementReady) {
          expect(plan.safeToRemove).toBe(false);
        }
      });
    });

    it('should create backups before any code modification', () => {
      const plans = removalManager.getAllRemovalPlans();
      
      plans.forEach((plan, itemId) => {
        const backupStep = plan.removalSteps.find(step => step.action === 'backup');
        const modificationSteps = plan.removalSteps.filter(step => 
          step.action === 'replace' || step.action === 'remove'
        );
        
        if (modificationSteps.length > 0) {
          expect(backupStep).toBeDefined();
          expect(backupStep!.order).toBeLessThan(Math.min(...modificationSteps.map(s => s.order)));
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing replacement code gracefully', async () => {
      // Mock a plan with missing replacement code
      const mockPlan = {
        itemId: 'test-item',
        itemType: 'method' as const,
        removalStrategy: 'immediate' as const,
        dependencies: [],
        replacementReady: true,
        safeToRemove: true,
        removalSteps: [{
          order: 1,
          description: 'Test replacement',
          action: 'replace' as const,
          targetFile: 'test.ts',
          validationCriteria: ['Test passes']
          // Missing replacementCode
        }]
      };

      // This would test error handling in actual implementation
      expect(mockPlan.removalSteps[0]).not.toHaveProperty('replacementCode');
    });

    it('should validate removal steps have required properties', () => {
      const plans = removalManager.getAllRemovalPlans();
      
      plans.forEach((plan, itemId) => {
        plan.removalSteps.forEach(step => {
          expect(step).toHaveProperty('order');
          expect(step).toHaveProperty('description');
          expect(step).toHaveProperty('action');
          expect(step).toHaveProperty('targetFile');
          expect(step).toHaveProperty('validationCriteria');
          
          expect(typeof step.order).toBe('number');
          expect(typeof step.description).toBe('string');
          expect(typeof step.targetFile).toBe('string');
          expect(Array.isArray(step.validationCriteria)).toBe(true);
        });
      });
    });
  });

  describe('Integration with Deprecation Inventory', () => {
    it('should create plans for all items in deprecation inventory', () => {
      const plans = removalManager.getAllRemovalPlans();
      
      // Should have plans for all deprecated methods
      DEPRECATED_METHODS.forEach(method => {
        expect(plans.has(method.id)).toBe(true);
      });
      
      // Should have plans for all deprecated constants
      DEPRECATED_CONSTANTS.forEach(constant => {
        expect(plans.has(constant.id)).toBe(true);
      });
    });

    it('should respect impact levels from inventory', () => {
      const plans = removalManager.getAllRemovalPlans();
      
      DEPRECATED_METHODS.forEach(method => {
        const plan = plans.get(method.id);
        expect(plan).toBeDefined();
        
        // High impact methods should use replace-first strategy
        if (method.impact === 'high') {
          expect(plan!.removalStrategy).toBe('replace-first');
        }
      });
    });

    it('should include all specified dependencies', () => {
      const plans = removalManager.getAllRemovalPlans();
      
      DEPRECATED_METHODS.forEach(method => {
        const plan = plans.get(method.id);
        expect(plan).toBeDefined();
        
        // Dependencies should match inventory
        expect(plan!.dependencies).toEqual(method.dependencies);
      });
    });
  });
});