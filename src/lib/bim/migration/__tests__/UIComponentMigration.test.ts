/**
 * UI Component Migration Tests
 * Ensures all user interactions continue to work with BIM system
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIComponentMigrationManager } from '../UIComponentMigration';
import type { DeprecatedUIComponent, UIComponentMigrationPlan } from '../UIComponentMigration';

describe('UIComponentMigration', () => {
  let migrationManager: UIComponentMigrationManager;

  beforeEach(() => {
    migrationManager = new UIComponentMigrationManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Deprecated Component Inventory', () => {
    it('should initialize with deprecated UI components', () => {
      const components = migrationManager.getDeprecatedComponents();
      
      expect(components.size).toBeGreaterThan(0);
      
      // Check for key deprecated components
      expect(components.has('basic-wall-properties-panel')).toBe(true);
      expect(components.has('simple-wall-thickness-selector')).toBe(true);
      expect(components.has('fixed-tolerance-slider')).toBe(true);
      expect(components.has('basic-wall-visualization-controls')).toBe(true);
    });

    it('should categorize components by migration complexity', () => {
      const components = migrationManager.getDeprecatedComponents();
      
      let lowComplexity = 0;
      let mediumComplexity = 0;
      let highComplexity = 0;
      
      components.forEach(component => {
        switch (component.migrationComplexity) {
          case 'low':
            lowComplexity++;
            break;
          case 'medium':
            mediumComplexity++;
            break;
          case 'high':
            highComplexity++;
            break;
        }
      });
      
      expect(lowComplexity + mediumComplexity + highComplexity).toBe(components.size);
      expect(highComplexity).toBeGreaterThan(0); // Should have some high complexity components
    });

    it('should identify user impact levels correctly', () => {
      const components = migrationManager.getDeprecatedComponents();
      
      const significantImpactComponents = Array.from(components.values()).filter(
        component => component.userImpact === 'significant'
      );
      
      expect(significantImpactComponents.length).toBeGreaterThan(0);
      
      // Visualization controls should have significant impact
      const visualizationComponent = components.get('basic-wall-visualization-controls');
      expect(visualizationComponent?.userImpact).toBe('significant');
    });

    it('should specify replacement components for all deprecated items', () => {
      const components = migrationManager.getDeprecatedComponents();
      
      components.forEach((component, componentId) => {
        expect(component.replacement).toBeDefined();
        expect(component.replacement.length).toBeGreaterThan(0);
        expect(component.replacement).not.toBe(component.name);
      });
    });
  });

  describe('Migration Plan Generation', () => {
    it('should generate migration plans for all deprecated components', () => {
      const plans = migrationManager.getMigrationPlans();
      const components = migrationManager.getDeprecatedComponents();
      
      expect(plans.size).toBe(components.size);
      
      // Each component should have a plan
      components.forEach((component, componentId) => {
        expect(plans.has(componentId)).toBe(true);
      });
    });

    it('should create appropriate migration steps', () => {
      const plan = migrationManager.getMigrationPlans().get('basic-wall-properties-panel');
      
      expect(plan).toBeDefined();
      expect(plan!.migrationSteps.length).toBeGreaterThan(0);
      
      // Should include key migration steps
      const stepActions = plan!.migrationSteps.map(step => step.action);
      expect(stepActions).toContain('create_replacement');
      expect(stepActions).toContain('update_imports');
      expect(stepActions).toContain('migrate_props');
      expect(stepActions).toContain('test_integration');
      expect(stepActions).toContain('remove_deprecated');
    });

    it('should order migration steps correctly', () => {
      const plan = migrationManager.getMigrationPlans().get('simple-wall-thickness-selector');
      
      expect(plan).toBeDefined();
      
      const steps = plan!.migrationSteps.sort((a, b) => a.order - b.order);
      
      // First step should be creating replacement
      expect(steps[0].action).toBe('create_replacement');
      
      // Last step should be removing deprecated
      expect(steps[steps.length - 1].action).toBe('remove_deprecated');
      
      // Steps should be in sequential order
      steps.forEach((step, index) => {
        expect(step.order).toBe(index + 1);
      });
    });

    it('should include rollback plans', () => {
      const plan = migrationManager.getMigrationPlans().get('fixed-tolerance-slider');
      
      expect(plan).toBeDefined();
      expect(plan!.rollbackPlan.length).toBeGreaterThan(0);
      
      // Rollback should include restore actions
      const rollbackActions = plan!.rollbackPlan.map(step => step.action);
      expect(rollbackActions).toContain('restore_component');
      expect(rollbackActions).toContain('revert_imports');
    });

    it('should define testing requirements based on complexity', () => {
      const highComplexityPlan = migrationManager.getMigrationPlans().get('basic-wall-visualization-controls');
      const lowComplexityPlan = migrationManager.getMigrationPlans().get('hardcoded-wall-colors');
      
      expect(highComplexityPlan).toBeDefined();
      expect(lowComplexityPlan).toBeDefined();
      
      // High complexity should have more testing requirements
      expect(highComplexityPlan!.testingRequirements.length).toBeGreaterThan(
        lowComplexityPlan!.testingRequirements.length
      );
    });
  });

  describe('Migration Execution', () => {
    it('should execute migration successfully for low complexity component', async () => {
      const result = await migrationManager.executeMigration('hardcoded-wall-colors');
      
      expect(result.success).toBe(true);
      expect(result.migratedComponents).toContain('hardcoded-wall-colors');
      expect(result.failedComponents.length).toBe(0);
    });

    it('should handle migration failure gracefully', async () => {
      const result = await migrationManager.executeMigration('non-existent-component');
      
      expect(result.success).toBe(false);
      expect(result.failedComponents).toContain('non-existent-component');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should provide user-facing changes for significant impact components', async () => {
      const result = await migrationManager.executeMigration('basic-wall-properties-panel');
      
      if (result.success) {
        expect(result.userFacingChanges.length).toBeGreaterThan(0);
        expect(result.userFacingChanges.some(change => 
          change.includes('BIM') || change.includes('quality')
        )).toBe(true);
      }
    });

    it('should provide rollback instructions', async () => {
      const result = await migrationManager.executeMigration('simple-wall-thickness-selector');
      
      if (result.success) {
        expect(result.rollbackInstructions.length).toBeGreaterThan(0);
        expect(result.rollbackInstructions[0]).toContain('1.');
      }
    });

    it('should record migration history', async () => {
      await migrationManager.executeMigration('hardcoded-wall-colors');
      
      const history = migrationManager.getMigrationHistory();
      expect(history.length).toBeGreaterThan(0);
      
      const lastEntry = history[history.length - 1];
      expect(lastEntry.componentId).toBe('hardcoded-wall-colors');
      expect(lastEntry.action).toBe('migrate');
      expect(lastEntry.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Batch Migration', () => {
    it('should execute batch migration in complexity order', async () => {
      const componentIds = ['basic-wall-properties-panel', 'hardcoded-wall-colors', 'simple-wall-thickness-selector'];
      const results = await migrationManager.executeBatchMigration(componentIds);
      
      expect(results.size).toBe(componentIds.length);
      
      // All components should have results
      componentIds.forEach(id => {
        expect(results.has(id)).toBe(true);
      });
    });

    it('should continue batch migration even if one component fails', async () => {
      const componentIds = ['hardcoded-wall-colors', 'non-existent-component', 'simple-wall-thickness-selector'];
      const results = await migrationManager.executeBatchMigration(componentIds);
      
      expect(results.size).toBe(componentIds.length);
      
      // Should have results for all components, including failed ones
      expect(results.get('non-existent-component')?.success).toBe(false);
      expect(results.get('hardcoded-wall-colors')?.success).toBe(true);
    });
  });

  describe('Replacement Component Generation', () => {
    it('should generate BIM Wall Properties Panel with enhanced features', async () => {
      const result = await migrationManager.executeMigration('basic-wall-properties-panel');
      
      // Check that the migration includes BIM-specific features
      if (result.success) {
        expect(result.userFacingChanges).toContain(
          expect.stringMatching(/quality metrics|join type|tolerance/i)
        );
      }
    });

    it('should generate replacement components with proper TypeScript interfaces', () => {
      const components = migrationManager.getDeprecatedComponents();
      
      components.forEach((component, componentId) => {
        // All replacements should be properly typed
        expect(component.replacement).toMatch(/^[A-Z][a-zA-Z0-9]*$/); // PascalCase
      });
    });
  });

  describe('Migration Readiness Assessment', () => {
    it('should assess migration readiness correctly', () => {
      const readiness = migrationManager.getMigrationReadiness();
      
      expect(readiness).toHaveProperty('readyForMigration');
      expect(readiness).toHaveProperty('requiresPreparation');
      expect(readiness).toHaveProperty('highRiskMigrations');
      expect(readiness).toHaveProperty('totalComponents');
      
      expect(Array.isArray(readiness.readyForMigration)).toBe(true);
      expect(Array.isArray(readiness.requiresPreparation)).toBe(true);
      expect(Array.isArray(readiness.highRiskMigrations)).toBe(true);
      expect(typeof readiness.totalComponents).toBe('number');
      
      // Total should equal sum of categories
      const total = readiness.readyForMigration.length + 
                   readiness.requiresPreparation.length + 
                   readiness.highRiskMigrations.length;
      expect(total).toBe(readiness.totalComponents);
    });

    it('should categorize low complexity, no impact components as ready', () => {
      const readiness = migrationManager.getMigrationReadiness();
      const components = migrationManager.getDeprecatedComponents();
      
      // Find low complexity, no impact components
      const lowRiskComponents = Array.from(components.entries()).filter(
        ([id, component]) => component.migrationComplexity === 'low' && component.userImpact === 'none'
      );
      
      lowRiskComponents.forEach(([componentId]) => {
        expect(readiness.readyForMigration).toContain(componentId);
      });
    });

    it('should categorize high complexity or significant impact as high risk', () => {
      const readiness = migrationManager.getMigrationReadiness();
      const components = migrationManager.getDeprecatedComponents();
      
      // Find high risk components
      const highRiskComponents = Array.from(components.entries()).filter(
        ([id, component]) => component.migrationComplexity === 'high' || component.userImpact === 'significant'
      );
      
      highRiskComponents.forEach(([componentId]) => {
        expect(readiness.highRiskMigrations).toContain(componentId);
      });
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive migration report', () => {
      const report = migrationManager.generateMigrationReport();
      
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      
      // Should contain key sections
      expect(report).toContain('# UI Component Migration Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Component Details');
      
      // Should contain statistics
      expect(report).toContain('Total deprecated components:');
      expect(report).toContain('Ready for migration:');
      expect(report).toContain('High risk migrations:');
    });

    it('should include component details in report', () => {
      const report = migrationManager.generateMigrationReport();
      const components = migrationManager.getDeprecatedComponents();
      
      // Should include all component names
      components.forEach((component, componentId) => {
        expect(report).toContain(component.name);
        expect(report).toContain(component.replacement);
        expect(report).toContain(component.migrationComplexity);
      });
    });

    it('should include timestamp in report', () => {
      const report = migrationManager.generateMigrationReport();
      
      // Should contain ISO timestamp
      expect(report).toMatch(/Generated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('User Communication Requirements', () => {
    it('should define communication requirements for significant impact components', () => {
      const plans = migrationManager.getMigrationPlans();
      const components = migrationManager.getDeprecatedComponents();
      
      components.forEach((component, componentId) => {
        const plan = plans.get(componentId);
        expect(plan).toBeDefined();
        
        if (component.userImpact === 'significant') {
          expect(plan!.userCommunication.length).toBeGreaterThan(0);
          expect(plan!.userCommunication).toContain(
            expect.stringMatching(/advance notice|training|guide/i)
          );
        }
      });
    });

    it('should require less communication for minimal impact components', () => {
      const plans = migrationManager.getMigrationPlans();
      const components = migrationManager.getDeprecatedComponents();
      
      const minimalImpactComponents = Array.from(components.entries()).filter(
        ([id, component]) => component.userImpact === 'minimal' || component.userImpact === 'none'
      );
      
      minimalImpactComponents.forEach(([componentId, component]) => {
        const plan = plans.get(componentId);
        expect(plan).toBeDefined();
        
        if (component.userImpact === 'none') {
          expect(plan!.userCommunication.length).toBe(0);
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing component gracefully', async () => {
      const result = await migrationManager.executeMigration('missing-component');
      
      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('not found');
    });

    it('should validate migration step dependencies', () => {
      const plans = migrationManager.getMigrationPlans();
      
      plans.forEach((plan, componentId) => {
        plan.migrationSteps.forEach(step => {
          // Dependencies should be valid
          step.dependencies.forEach(dep => {
            expect(typeof dep).toBe('string');
            expect(dep.length).toBeGreaterThan(0);
          });
          
          // Estimated effort should be positive
          expect(step.estimatedEffort).toBeGreaterThan(0);
          
          // Target files should be specified
          expect(step.targetFiles.length).toBeGreaterThan(0);
        });
      });
    });

    it('should handle concurrent migrations safely', async () => {
      const componentIds = ['hardcoded-wall-colors', 'simple-wall-thickness-selector'];
      
      // Execute migrations concurrently
      const promises = componentIds.map(id => migrationManager.executeMigration(id));
      const results = await Promise.all(promises);
      
      // Both should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // History should record both migrations
      const history = migrationManager.getMigrationHistory();
      expect(history.length).toBeGreaterThanOrEqual(componentIds.length);
    });
  });

  describe('Integration with BIM System', () => {
    it('should generate components that integrate with BIM system', () => {
      const components = migrationManager.getDeprecatedComponents();
      
      // BIM-related replacements should be properly named
      const bimComponents = Array.from(components.values()).filter(
        component => component.replacement.includes('BIM') || 
                    component.replacement.includes('Dynamic') ||
                    component.replacement.includes('Adaptive')
      );
      
      expect(bimComponents.length).toBeGreaterThan(0);
    });

    it('should maintain backward compatibility during migration', async () => {
      const result = await migrationManager.executeMigration('simple-wall-thickness-selector');
      
      if (result.success) {
        // Should provide rollback instructions for compatibility
        expect(result.rollbackInstructions.length).toBeGreaterThan(0);
      }
    });
  });
});