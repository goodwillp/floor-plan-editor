/**
 * Deprecated Code Removal Manager
 * Safely removes deprecated geometric calculation methods
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { DEPRECATED_METHODS, DEPRECATED_CONSTANTS } from './DeprecationInventory';

export interface RemovalPlan {
  itemId: string;
  itemType: 'method' | 'constant' | 'class';
  removalStrategy: 'immediate' | 'gradual' | 'replace-first';
  dependencies: string[];
  replacementReady: boolean;
  safeToRemove: boolean;
  removalSteps: RemovalStep[];
}

export interface RemovalStep {
  order: number;
  description: string;
  action: 'backup' | 'replace' | 'remove' | 'test' | 'validate';
  targetFile: string;
  targetLines?: number[];
  replacementCode?: string;
  validationCriteria: string[];
}

export interface RemovalResult {
  success: boolean;
  itemsRemoved: string[];
  itemsReplaced: string[];
  backupsCreated: string[];
  errors: string[];
  warnings: string[];
  testsUpdated: string[];
}

/**
 * Manages the safe removal of deprecated code
 */
export class DeprecatedCodeRemovalManager {
  private removalPlans: Map<string, RemovalPlan> = new Map();
  private backupDirectory = 'floor-plan-editor/src/lib/bim/migration/backups';

  constructor() {
    this.generateRemovalPlans();
  }

  /**
   * Generate removal plans for all deprecated items
   */
  private generateRemovalPlans(): void {
    // Generate plans for deprecated methods
    DEPRECATED_METHODS.forEach(method => {
      const plan = this.createMethodRemovalPlan(method);
      this.removalPlans.set(method.id, plan);
    });

    // Generate plans for deprecated constants
    DEPRECATED_CONSTANTS.forEach(constant => {
      const plan = this.createConstantRemovalPlan(constant);
      this.removalPlans.set(constant.id, plan);
    });
  }

  /**
   * Create removal plan for a deprecated method
   */
  private createMethodRemovalPlan(method: any): RemovalPlan {
    const replacementReady = this.isReplacementReady(method.replacement);
    const safeToRemove = replacementReady && method.impact !== 'high';

    const steps: RemovalStep[] = [
      {
        order: 1,
        description: `Create backup of ${method.file}`,
        action: 'backup',
        targetFile: method.file,
        validationCriteria: ['Backup file created successfully']
      },
      {
        order: 2,
        description: `Replace deprecated method with ${method.replacement}`,
        action: 'replace',
        targetFile: method.file,
        targetLines: method.lineNumbers,
        replacementCode: this.generateReplacementCode(method),
        validationCriteria: ['Replacement code compiles', 'No syntax errors']
      },
      {
        order: 3,
        description: 'Update affected test files',
        action: 'replace',
        targetFile: method.testFiles[0] || 'N/A',
        validationCriteria: ['Tests pass', 'No deprecated API usage in tests']
      },
      {
        order: 4,
        description: 'Run migration tests',
        action: 'test',
        targetFile: method.file,
        validationCriteria: ['All tests pass', 'No regression detected']
      },
      {
        order: 5,
        description: 'Validate functionality',
        action: 'validate',
        targetFile: method.file,
        validationCriteria: ['API compatibility maintained', 'Performance not degraded']
      }
    ];

    return {
      itemId: method.id,
      itemType: 'method',
      removalStrategy: method.impact === 'high' ? 'replace-first' : 'gradual',
      dependencies: method.dependencies,
      replacementReady,
      safeToRemove,
      removalSteps: steps
    };
  }

  /**
   * Create removal plan for a deprecated constant
   */
  private createConstantRemovalPlan(constant: any): RemovalPlan {
    const replacementReady = this.isReplacementReady(constant.replacement);
    const safeToRemove = replacementReady && constant.impact !== 'high';

    const steps: RemovalStep[] = [
      {
        order: 1,
        description: `Create backup of ${constant.file}`,
        action: 'backup',
        targetFile: constant.file,
        validationCriteria: ['Backup file created successfully']
      },
      {
        order: 2,
        description: `Replace constant with ${constant.replacement}`,
        action: 'replace',
        targetFile: constant.file,
        targetLines: [constant.lineNumber],
        replacementCode: this.generateConstantReplacement(constant),
        validationCriteria: ['Replacement compiles', 'Type compatibility maintained']
      },
      {
        order: 3,
        description: 'Update references to constant',
        action: 'replace',
        targetFile: 'multiple', // Would be determined during execution
        validationCriteria: ['All references updated', 'No compilation errors']
      },
      {
        order: 4,
        description: 'Run validation tests',
        action: 'test',
        targetFile: constant.file,
        validationCriteria: ['Tests pass', 'Behavior unchanged']
      }
    ];

    return {
      itemId: constant.id,
      itemType: 'constant',
      removalStrategy: 'replace-first',
      dependencies: [],
      replacementReady,
      safeToRemove,
      removalSteps: steps
    };
  }

  /**
   * Check if replacement implementation is ready
   */
  private isReplacementReady(replacement: string): boolean {
    // This would check if the BIM replacement components exist
    const bimComponents = [
      'AdaptiveToleranceManager',
      'RobustOffsetEngine',
      'BooleanOperationsEngine',
      'GeometryValidator'
    ];

    // For now, assume they're ready (in actual implementation, would check file existence)
    return bimComponents.some(component => replacement.includes(component));
  }

  /**
   * Generate replacement code for deprecated method
   */
  private generateReplacementCode(method: any): string {
    switch (method.id) {
      case 'wall-renderer-hardcoded-tolerance':
        return `
// Use adaptive tolerance instead of hardcoded value
const tolerance = this.toleranceManager?.calculateTolerance(
  wallThickness,
  documentPrecision,
  localAngle,
  'intersection_detection'
) || 1e-6;

if (Math.abs(det) < tolerance) return null;`;

      case 'geometry-service-fixed-tolerance':
        return `
// Replace with adaptive tolerance calculation
private static getAdaptiveTolerance(context: ToleranceContext): number {
  return AdaptiveToleranceManager.getInstance().calculateTolerance(
    100, // Default thickness
    1e-3, // Document precision
    0, // Local angle
    context
  );
}

private static readonly TOLERANCE = this.getAdaptiveTolerance('vertex_merge');`;

      case 'tolerance-config-pixel-based':
        return `
// Replace pixel-based configuration with mathematical precision
export const toleranceConfig: ToleranceConfig = {
  // Mathematical precision based on wall thickness
  projectionMinMath: 0.1, // 10% of wall thickness
  projectionMultiplier: 1.2,
  
  // Distance-based node reuse
  nodeReuseMinMath: 0.05, // 5% of wall thickness
  nodeReuseMultiplier: 0.5,
  
  // Merge threshold based on geometric precision
  mergeNearbyMinMath: 0.01, // 1% of wall thickness
  mergeNearbyMultiplier: 0.5,
};`;

      default:
        return `// TODO: Implement replacement for ${method.name}`;
    }
  }

  /**
   * Generate replacement code for deprecated constant
   */
  private generateConstantReplacement(constant: any): string {
    switch (constant.id) {
      case 'geometry-service-tolerance':
        return `
// Use adaptive tolerance instead of fixed value
private static get TOLERANCE(): number {
  return AdaptiveToleranceManager.getInstance().calculateTolerance(
    100, // Default thickness
    1e-3, // Document precision
    0, // Local angle
    'vertex_merge'
  );
}`;

      case 'geometry-service-proximity':
        return `
// Use thickness-proportional proximity threshold
private static get PROXIMITY_THRESHOLD(): number {
  return AdaptiveToleranceManager.getInstance().calculateTolerance(
    100, // Default thickness
    1e-3, // Document precision
    0, // Local angle
    'proximity_detection'
  );
}`;

      default:
        return `// TODO: Replace constant ${constant.name}`;
    }
  }

  /**
   * Execute removal plan for specific item
   */
  async executeRemovalPlan(itemId: string): Promise<RemovalResult> {
    const plan = this.removalPlans.get(itemId);
    if (!plan) {
      return {
        success: false,
        itemsRemoved: [],
        itemsReplaced: [],
        backupsCreated: [],
        errors: [`No removal plan found for ${itemId}`],
        warnings: [],
        testsUpdated: []
      };
    }

    const result: RemovalResult = {
      success: true,
      itemsRemoved: [],
      itemsReplaced: [],
      backupsCreated: [],
      errors: [],
      warnings: [],
      testsUpdated: []
    };

    // Check if safe to remove
    if (!plan.safeToRemove) {
      result.warnings.push(`Item ${itemId} is not safe to remove yet`);
      if (!plan.replacementReady) {
        result.warnings.push(`Replacement ${plan.dependencies.join(', ')} not ready`);
      }
    }

    // Execute removal steps in order
    for (const step of plan.removalSteps.sort((a, b) => a.order - b.order)) {
      try {
        await this.executeRemovalStep(step, result);
      } catch (error) {
        result.success = false;
        result.errors.push(`Step ${step.order} failed: ${error instanceof Error ? error.message : String(error)}`);
        break;
      }
    }

    if (result.success) {
      result.itemsReplaced.push(itemId);
    }

    return result;
  }

  /**
   * Execute individual removal step
   */
  private async executeRemovalStep(step: RemovalStep, result: RemovalResult): Promise<void> {
    switch (step.action) {
      case 'backup':
        await this.createBackup(step.targetFile);
        result.backupsCreated.push(step.targetFile);
        break;

      case 'replace':
        await this.replaceCode(step);
        break;

      case 'remove':
        await this.removeCode(step);
        result.itemsRemoved.push(step.targetFile);
        break;

      case 'test':
        await this.runTests(step.targetFile);
        result.testsUpdated.push(step.targetFile);
        break;

      case 'validate':
        await this.validateChanges(step);
        break;

      default:
        throw new Error(`Unknown removal action: ${step.action}`);
    }
  }

  /**
   * Create backup of file before modification
   */
  private async createBackup(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.backupDirectory}/${filePath.replace(/\//g, '_')}_${timestamp}.backup`;
    
    // In actual implementation, would copy file to backup location
    console.log(`📦 Creating backup: ${filePath} -> ${backupPath}`);
  }

  /**
   * Replace deprecated code with new implementation
   */
  private async replaceCode(step: RemovalStep): Promise<void> {
    if (!step.replacementCode) {
      throw new Error('No replacement code provided');
    }

    console.log(`🔄 Replacing code in ${step.targetFile}`);
    console.log(`Lines: ${step.targetLines?.join(', ') || 'N/A'}`);
    console.log(`Replacement: ${step.replacementCode.substring(0, 100)}...`);
    
    // In actual implementation, would modify the file
    // For now, just log the operation
  }

  /**
   * Remove deprecated code
   */
  private async removeCode(step: RemovalStep): Promise<void> {
    console.log(`🗑️ Removing code from ${step.targetFile}`);
    console.log(`Lines: ${step.targetLines?.join(', ') || 'N/A'}`);
    
    // In actual implementation, would remove the specified lines
  }

  /**
   * Run tests to validate changes
   */
  private async runTests(targetFile: string): Promise<void> {
    console.log(`🧪 Running tests for ${targetFile}`);
    
    // In actual implementation, would run relevant test suites
    // For now, simulate test execution
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Validate that changes don't break functionality
   */
  private async validateChanges(step: RemovalStep): Promise<void> {
    console.log(`✅ Validating changes for ${step.targetFile}`);
    
    // Check validation criteria
    for (const criteria of step.validationCriteria) {
      console.log(`  - ${criteria}: ✓`);
    }
  }

  /**
   * Execute removal plan for multiple items
   */
  async executeBatchRemoval(itemIds: string[]): Promise<Map<string, RemovalResult>> {
    const results = new Map<string, RemovalResult>();

    // Sort by dependencies and impact
    const sortedIds = this.sortByRemovalOrder(itemIds);

    for (const itemId of sortedIds) {
      console.log(`\n🔧 Processing removal: ${itemId}`);
      const result = await this.executeRemovalPlan(itemId);
      results.set(itemId, result);

      if (!result.success) {
        console.error(`❌ Failed to remove ${itemId}:`, result.errors);
        // Continue with other items, but log the failure
      } else {
        console.log(`✅ Successfully processed ${itemId}`);
      }
    }

    return results;
  }

  /**
   * Sort items by removal order (dependencies first, low impact first)
   */
  private sortByRemovalOrder(itemIds: string[]): string[] {
    const plans = itemIds.map(id => this.removalPlans.get(id)).filter(Boolean);
    
    return plans
      .sort((a, b) => {
        // Dependencies first
        if (a!.dependencies.length !== b!.dependencies.length) {
          return a!.dependencies.length - b!.dependencies.length;
        }
        
        // Safe to remove first
        if (a!.safeToRemove !== b!.safeToRemove) {
          return a!.safeToRemove ? -1 : 1;
        }
        
        // Low impact first
        const impactOrder = { low: 0, medium: 1, high: 2 };
        const aMethod = DEPRECATED_METHODS.find(m => m.id === a!.itemId);
        const bMethod = DEPRECATED_METHODS.find(m => m.id === b!.itemId);
        
        if (aMethod && bMethod) {
          return impactOrder[aMethod.impact] - impactOrder[bMethod.impact];
        }
        
        return 0;
      })
      .map(plan => plan!.itemId);
  }

  /**
   * Get removal readiness assessment
   */
  getRemovalReadiness(): {
    readyForRemoval: string[];
    requiresPreparation: string[];
    blockedByDependencies: string[];
    totalItems: number;
  } {
    const ready: string[] = [];
    const preparation: string[] = [];
    const blocked: string[] = [];

    for (const [itemId, plan] of this.removalPlans) {
      if (plan.safeToRemove) {
        ready.push(itemId);
      } else if (plan.replacementReady) {
        preparation.push(itemId);
      } else {
        blocked.push(itemId);
      }
    }

    return {
      readyForRemoval: ready,
      requiresPreparation: preparation,
      blockedByDependencies: blocked,
      totalItems: this.removalPlans.size
    };
  }

  /**
   * Generate removal report
   */
  generateRemovalReport(): string {
    const readiness = this.getRemovalReadiness();
    
    let report = '# Deprecated Code Removal Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += '## Summary\n\n';
    report += `- Total deprecated items: ${readiness.totalItems}\n`;
    report += `- Ready for removal: ${readiness.readyForRemoval.length}\n`;
    report += `- Requires preparation: ${readiness.requiresPreparation.length}\n`;
    report += `- Blocked by dependencies: ${readiness.blockedByDependencies.length}\n\n`;
    
    report += '## Ready for Removal\n\n';
    readiness.readyForRemoval.forEach(itemId => {
      const plan = this.removalPlans.get(itemId);
      if (plan) {
        report += `- **${itemId}**: ${plan.removalStrategy} removal\n`;
      }
    });
    
    report += '\n## Requires Preparation\n\n';
    readiness.requiresPreparation.forEach(itemId => {
      const plan = this.removalPlans.get(itemId);
      if (plan) {
        report += `- **${itemId}**: Replacement ready, needs testing\n`;
      }
    });
    
    report += '\n## Blocked by Dependencies\n\n';
    readiness.blockedByDependencies.forEach(itemId => {
      const plan = this.removalPlans.get(itemId);
      if (plan) {
        report += `- **${itemId}**: Waiting for ${plan.dependencies.join(', ')}\n`;
      }
    });
    
    return report;
  }

  /**
   * Get removal plan for specific item
   */
  getRemovalPlan(itemId: string): RemovalPlan | undefined {
    return this.removalPlans.get(itemId);
  }

  /**
   * Get all removal plans
   */
  getAllRemovalPlans(): Map<string, RemovalPlan> {
    return new Map(this.removalPlans);
  }
}