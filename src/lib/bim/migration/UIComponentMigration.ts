/**
 * UI Component Migration Manager
 * Handles cleanup of deprecated UI components and migration to BIM interfaces
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

export interface DeprecatedUIComponent {
  id: string;
  name: string;
  componentPath: string;
  deprecationReason: string;
  replacement: string;
  migrationComplexity: 'low' | 'medium' | 'high';
  userImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  dependencies: string[];
  usageLocations: string[];
}

export interface UIComponentMigrationPlan {
  componentId: string;
  migrationSteps: UIMigrationStep[];
  rollbackPlan: UIRollbackStep[];
  testingRequirements: string[];
  userCommunication: string[];
}

export interface UIMigrationStep {
  order: number;
  description: string;
  action: 'create_replacement' | 'update_imports' | 'migrate_props' | 'remove_deprecated' | 'test_integration';
  targetFiles: string[];
  estimatedEffort: number; // hours
  dependencies: string[];
}

export interface UIRollbackStep {
  order: number;
  description: string;
  action: 'restore_component' | 'revert_imports' | 'restore_props';
  targetFiles: string[];
}

export interface MigrationResult {
  success: boolean;
  migratedComponents: string[];
  failedComponents: string[];
  warnings: string[];
  userFacingChanges: string[];
  rollbackInstructions: string[];
}

/**
 * Manages migration of deprecated UI components to BIM-compatible versions
 */
export class UIComponentMigrationManager {
  private deprecatedComponents: Map<string, DeprecatedUIComponent> = new Map();
  private migrationPlans: Map<string, UIComponentMigrationPlan> = new Map();
  private migrationHistory: Array<{
    timestamp: Date;
    componentId: string;
    action: string;
    success: boolean;
    details: any;
  }> = [];

  constructor() {
    this.initializeDeprecatedComponents();
    this.generateMigrationPlans();
  }

  /**
   * Initialize inventory of deprecated UI components
   */
  private initializeDeprecatedComponents(): void {
    const deprecatedComponents: DeprecatedUIComponent[] = [
      {
        id: 'basic-wall-properties-panel',
        name: 'BasicWallPropertiesPanel',
        componentPath: 'src/components/properties/BasicWallPropertiesPanel.tsx',
        deprecationReason: 'Lacks BIM-specific controls and quality metrics',
        replacement: 'BIMWallPropertiesPanel',
        migrationComplexity: 'high',
        userImpact: 'moderate',
        dependencies: ['WallTypeSelector', 'ThicknessSlider'],
        usageLocations: [
          'src/components/panels/PropertiesPanel.tsx',
          'src/components/editor/WallEditor.tsx'
        ]
      },
      {
        id: 'simple-wall-thickness-selector',
        name: 'SimpleWallThicknessSelector',
        componentPath: 'src/components/controls/SimpleWallThicknessSelector.tsx',
        deprecationReason: 'Fixed thickness values without BIM customization',
        replacement: 'DynamicThicknessControl',
        migrationComplexity: 'medium',
        userImpact: 'minimal',
        dependencies: [],
        usageLocations: [
          'src/components/properties/BasicWallPropertiesPanel.tsx',
          'src/components/toolbar/WallToolbar.tsx'
        ]
      },
      {
        id: 'fixed-tolerance-slider',
        name: 'FixedToleranceSlider',
        componentPath: 'src/components/settings/FixedToleranceSlider.tsx',
        deprecationReason: 'Uses pixel-based tolerances instead of mathematical precision',
        replacement: 'AdaptiveToleranceControl',
        migrationComplexity: 'medium',
        userImpact: 'minimal',
        dependencies: ['ToleranceConfig'],
        usageLocations: [
          'src/components/settings/SettingsPanel.tsx'
        ]
      },
      {
        id: 'basic-wall-visualization-controls',
        name: 'BasicWallVisualizationControls',
        componentPath: 'src/components/visualization/BasicWallVisualizationControls.tsx',
        deprecationReason: 'Limited to simple filled polygons without BIM visualization modes',
        replacement: 'BIMVisualizationControls',
        migrationComplexity: 'high',
        userImpact: 'significant',
        dependencies: ['VisualizationModeSelector', 'QualityIndicators'],
        usageLocations: [
          'src/components/panels/VisualizationPanel.tsx',
          'src/components/toolbar/ViewToolbar.tsx'
        ]
      },
      {
        id: 'simple-wall-context-menu',
        name: 'SimpleWallContextMenu',
        componentPath: 'src/components/menus/SimpleWallContextMenu.tsx',
        deprecationReason: 'Missing BIM-specific operations and quality analysis',
        replacement: 'BIMWallContextMenu',
        migrationComplexity: 'medium',
        userImpact: 'moderate',
        dependencies: ['WallOperations', 'QualityAnalysis'],
        usageLocations: [
          'src/components/editor/FloorPlanEditor.tsx'
        ]
      },
      {
        id: 'hardcoded-wall-colors',
        name: 'HardcodedWallColors',
        componentPath: 'src/styles/wallColors.ts',
        deprecationReason: 'Fixed color scheme without quality-based visualization',
        replacement: 'DynamicWallColorSystem',
        migrationComplexity: 'low',
        userImpact: 'none',
        dependencies: [],
        usageLocations: [
          'src/components/renderer/WallRenderer.tsx',
          'src/components/visualization/WallVisualization.tsx'
        ]
      }
    ];

    deprecatedComponents.forEach(component => {
      this.deprecatedComponents.set(component.id, component);
    });
  }

  /**
   * Generate migration plans for all deprecated components
   */
  private generateMigrationPlans(): void {
    this.deprecatedComponents.forEach((component, componentId) => {
      const plan = this.createMigrationPlan(component);
      this.migrationPlans.set(componentId, plan);
    });
  }

  /**
   * Create migration plan for a specific component
   */
  private createMigrationPlan(component: DeprecatedUIComponent): UIComponentMigrationPlan {
    const steps: UIMigrationStep[] = [];
    const rollbackSteps: UIRollbackStep[] = [];

    // Step 1: Create replacement component
    steps.push({
      order: 1,
      description: `Create ${component.replacement} component`,
      action: 'create_replacement',
      targetFiles: [this.getReplacementPath(component.replacement)],
      estimatedEffort: this.getCreationEffort(component.migrationComplexity),
      dependencies: []
    });

    // Step 2: Update imports in usage locations
    steps.push({
      order: 2,
      description: 'Update import statements in usage locations',
      action: 'update_imports',
      targetFiles: component.usageLocations,
      estimatedEffort: 1,
      dependencies: [component.replacement]
    });

    // Step 3: Migrate props and interfaces
    steps.push({
      order: 3,
      description: 'Migrate component props and interfaces',
      action: 'migrate_props',
      targetFiles: component.usageLocations,
      estimatedEffort: this.getPropsMigrationEffort(component.migrationComplexity),
      dependencies: [component.replacement]
    });

    // Step 4: Integration testing
    steps.push({
      order: 4,
      description: 'Test component integration',
      action: 'test_integration',
      targetFiles: [`${component.componentPath}.test.tsx`],
      estimatedEffort: 2,
      dependencies: [component.replacement]
    });

    // Step 5: Remove deprecated component
    steps.push({
      order: 5,
      description: `Remove deprecated ${component.name} component`,
      action: 'remove_deprecated',
      targetFiles: [component.componentPath],
      estimatedEffort: 0.5,
      dependencies: [component.replacement]
    });

    // Rollback steps (reverse order)
    rollbackSteps.push(
      {
        order: 1,
        description: `Restore ${component.name} component`,
        action: 'restore_component',
        targetFiles: [component.componentPath]
      },
      {
        order: 2,
        description: 'Revert import statements',
        action: 'revert_imports',
        targetFiles: component.usageLocations
      },
      {
        order: 3,
        description: 'Restore original props',
        action: 'restore_props',
        targetFiles: component.usageLocations
      }
    );

    return {
      componentId: component.id,
      migrationSteps: steps,
      rollbackPlan: rollbackSteps,
      testingRequirements: this.getTestingRequirements(component),
      userCommunication: this.getUserCommunication(component)
    };
  }

  /**
   * Get replacement component path
   */
  private getReplacementPath(replacementName: string): string {
    const pathMap: Record<string, string> = {
      'BIMWallPropertiesPanel': 'src/components/bim/properties/BIMWallPropertiesPanel.tsx',
      'DynamicThicknessControl': 'src/components/bim/controls/DynamicThicknessControl.tsx',
      'AdaptiveToleranceControl': 'src/components/bim/settings/AdaptiveToleranceControl.tsx',
      'BIMVisualizationControls': 'src/components/bim/visualization/BIMVisualizationControls.tsx',
      'BIMWallContextMenu': 'src/components/bim/menus/BIMWallContextMenu.tsx',
      'DynamicWallColorSystem': 'src/components/bim/styles/DynamicWallColorSystem.ts'
    };

    return pathMap[replacementName] || `src/components/bim/${replacementName}.tsx`;
  }

  /**
   * Get creation effort based on complexity
   */
  private getCreationEffort(complexity: string): number {
    const effortMap: Record<'low'|'medium'|'high', number> = {
      'low': 2,
      'medium': 8,
      'high': 16
    };
    return effortMap[(complexity as 'low'|'medium'|'high')] || 8;
  }

  /**
   * Get props migration effort
   */
  private getPropsMigrationEffort(complexity: string): number {
    const effortMap: any = {
      'low': 1,
      'medium': 4,
      'high': 8
    };
    return effortMap[complexity] || 4;
  }

  /**
   * Get testing requirements for component
   */
  private getTestingRequirements(component: DeprecatedUIComponent): string[] {
    const baseRequirements = [
      'Unit tests for new component',
      'Integration tests with parent components',
      'Visual regression tests'
    ];

    if (component.userImpact === 'significant') {
      baseRequirements.push(
        'User acceptance testing',
        'Accessibility testing',
        'Performance testing'
      );
    }

    if (component.migrationComplexity === 'high') {
      baseRequirements.push(
        'End-to-end testing',
        'Cross-browser testing'
      );
    }

    return baseRequirements;
  }

  /**
   * Get user communication requirements
   */
  private getUserCommunication(component: DeprecatedUIComponent): string[] {
    const communications: string[] = [];

    if (component.userImpact === 'significant') {
      communications.push(
        'Advance notice to users about UI changes',
        'Migration guide for new features',
        'Training materials for new interface'
      );
    }

    if (component.userImpact === 'moderate') {
      communications.push(
        'Release notes highlighting changes',
        'Quick start guide for new features'
      );
    }

    return communications;
  }

  /**
   * Execute migration for a specific component
   */
  async executeMigration(componentId: string): Promise<MigrationResult> {
    const component = this.deprecatedComponents.get(componentId);
    const plan = this.migrationPlans.get(componentId);

    if (!component || !plan) {
      return {
        success: false,
        migratedComponents: [],
        failedComponents: [componentId],
        warnings: [`Component or migration plan not found: ${componentId}`],
        userFacingChanges: [],
        rollbackInstructions: []
      };
    }

    const result: MigrationResult = {
      success: true,
      migratedComponents: [],
      failedComponents: [],
      warnings: [],
      userFacingChanges: [],
      rollbackInstructions: []
    };

    console.log(`🔄 Starting migration for ${component.name}`);

    // Execute migration steps in order
    for (const step of plan.migrationSteps.sort((a, b) => a.order - b.order)) {
      try {
        await this.executeMigrationStep(component, step, result);
        console.log(`✅ Completed step ${step.order}: ${step.description}`);
      } catch (error) {
        console.error(`❌ Failed step ${step.order}: ${step.description}`, error);
        result.success = false;
        result.failedComponents.push(componentId);
        result.warnings.push(`Step ${step.order} failed: ${error instanceof Error ? error.message : String(error)}`);
        break;
      }
    }

    if (result.success) {
      result.migratedComponents.push(componentId);
      result.userFacingChanges = this.getUserFacingChanges(component);
      result.rollbackInstructions = this.getRollbackInstructions(plan);
    }

    // Record migration attempt
    this.migrationHistory.push({
      timestamp: new Date(),
      componentId,
      action: 'migrate',
      success: result.success,
      details: {
        stepsCompleted: plan.migrationSteps.length,
        warnings: result.warnings.length
      }
    });

    return result;
  }

  /**
   * Execute individual migration step
   */
  private async executeMigrationStep(
    component: DeprecatedUIComponent,
    step: UIMigrationStep,
    result: MigrationResult
  ): Promise<void> {
    switch (step.action) {
      case 'create_replacement':
        await this.createReplacementComponent(component, step);
        break;

      case 'update_imports':
        await this.updateImports(component, step);
        break;

      case 'migrate_props':
        await this.migrateProps(component, step);
        break;

      case 'test_integration':
        await this.testIntegration(component, step);
        break;

      case 'remove_deprecated':
        await this.removeDeprecatedComponent(component, step);
        break;

      default:
        throw new Error(`Unknown migration action: ${step.action}`);
    }
  }

  /**
   * Create replacement component
   */
  private async createReplacementComponent(
    component: DeprecatedUIComponent,
    step: UIMigrationStep
  ): Promise<void> {
    console.log(`📝 Creating replacement component: ${component.replacement}`);
    
    const replacementCode = this.generateReplacementComponent(component);
    
    // In actual implementation, would write to file system
    console.log(`Generated ${replacementCode.length} characters of replacement code`);
    
    // Simulate file creation time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Generate replacement component code
   */
  private generateReplacementComponent(component: DeprecatedUIComponent): string {
    switch (component.id) {
      case 'basic-wall-properties-panel':
        return this.generateBIMWallPropertiesPanel();
      
      case 'simple-wall-thickness-selector':
        return this.generateDynamicThicknessControl();
      
      case 'fixed-tolerance-slider':
        return this.generateAdaptiveToleranceControl();
      
      case 'basic-wall-visualization-controls':
        return this.generateBIMVisualizationControls();
      
      case 'simple-wall-context-menu':
        return this.generateBIMWallContextMenu();
      
      case 'hardcoded-wall-colors':
        return this.generateDynamicWallColorSystem();
      
      default:
        return `// TODO: Implement ${component.replacement}`;
    }
  }

  /**
   * Generate BIM Wall Properties Panel
   */
  private generateBIMWallPropertiesPanel(): string {
    return `
import React, { useState, useEffect } from 'react';
import { WallTypeString, Wall } from '../../../lib/types';
import { BIMWallSystem } from '../../../lib/bim/BIMWallSystem';
import { QualityMetrics } from '../../../lib/bim/types/BIMTypes';

interface BIMWallPropertiesPanelProps {
  wall: Wall;
  onWallUpdate: (wall: Wall) => void;
  bimSystem: BIMWallSystem;
}

export const BIMWallPropertiesPanel: React.FC<BIMWallPropertiesPanelProps> = ({
  wall,
  onWallUpdate,
  bimSystem
}) => {
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [joinType, setJoinType] = useState<'miter' | 'bevel' | 'round'>('miter');
  const [customTolerance, setCustomTolerance] = useState<number | null>(null);

  useEffect(() => {
    // Load quality metrics for wall
    const metrics = bimSystem.getWallQualityMetrics(wall.id);
    setQualityMetrics(metrics);
  }, [wall.id, bimSystem]);

  const handleThicknessChange = (thickness: number) => {
    const updatedWall = { ...wall, thickness };
    onWallUpdate(updatedWall);
  };

  const handleJoinTypeChange = (newJoinType: 'miter' | 'bevel' | 'round') => {
    setJoinType(newJoinType);
    // Update BIM system with new join type
    bimSystem.updateWallJoinType(wall.id, newJoinType);
  };

  return (
    <div className="bim-wall-properties-panel">
      <h3>BIM Wall Properties</h3>
      
      {/* Basic Properties */}
      <div className="property-group">
        <label>Wall Type</label>
        <select 
          value={wall.type} 
          onChange={(e) => onWallUpdate({ ...wall, type: e.target.value as WallTypeString })}
        >
          <option value="layout">Layout Wall (350mm)</option>
          <option value="zone">Zone Wall (250mm)</option>
          <option value="area">Area Wall (150mm)</option>
        </select>
      </div>

      <div className="property-group">
        <label>Thickness (mm)</label>
        <input
          type="number"
          value={wall.thickness}
          onChange={(e) => handleThicknessChange(Number(e.target.value))}
          min="50"
          max="1000"
          step="10"
        />
      </div>

      {/* BIM-Specific Properties */}
      <div className="property-group">
        <label>Join Type</label>
        <select value={joinType} onChange={(e) => handleJoinTypeChange(e.target.value as any)}>
          <option value="miter">Miter</option>
          <option value="bevel">Bevel</option>
          <option value="round">Round</option>
        </select>
      </div>

      {/* Quality Metrics */}
      {qualityMetrics && (
        <div className="property-group">
          <label>Quality Metrics</label>
          <div className="quality-metrics">
            <div>Geometric Accuracy: {(qualityMetrics.geometricAccuracy * 100).toFixed(1)}%</div>
            <div>Topological Consistency: {(qualityMetrics.topologicalConsistency * 100).toFixed(1)}%</div>
            <div>Manufacturability: {(qualityMetrics.manufacturability * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="property-group">
        <label>Custom Tolerance</label>
        <input
          type="number"
          value={customTolerance || ''}
          onChange={(e) => setCustomTolerance(e.target.value ? Number(e.target.value) : null)}
          placeholder="Auto"
          step="0.001"
          min="0.001"
          max="10"
        />
      </div>
    </div>
  );
};`;
  }

  /**
   * Generate other replacement components (simplified)
   */
  private generateDynamicThicknessControl(): string {
    return `// Dynamic Thickness Control with BIM support\nexport const DynamicThicknessControl = () => { /* Implementation */ };`;
  }

  private generateAdaptiveToleranceControl(): string {
    return `// Adaptive Tolerance Control with mathematical precision\nexport const AdaptiveToleranceControl = () => { /* Implementation */ };`;
  }

  private generateBIMVisualizationControls(): string {
    return `// BIM Visualization Controls with advanced modes\nexport const BIMVisualizationControls = () => { /* Implementation */ };`;
  }

  private generateBIMWallContextMenu(): string {
    return `// BIM Wall Context Menu with quality analysis\nexport const BIMWallContextMenu = () => { /* Implementation */ };`;
  }

  private generateDynamicWallColorSystem(): string {
    return `// Dynamic Wall Color System with quality-based visualization\nexport const DynamicWallColorSystem = { /* Implementation */ };`;
  }

  /**
   * Update imports in usage locations
   */
  private async updateImports(component: DeprecatedUIComponent, step: UIMigrationStep): Promise<void> {
    console.log(`🔄 Updating imports for ${component.name}`);
    
    for (const file of step.targetFiles) {
      console.log(`  - Updating ${file}`);
      // In actual implementation, would update import statements
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Migrate component props
   */
  private async migrateProps(component: DeprecatedUIComponent, step: UIMigrationStep): Promise<void> {
    console.log(`🔄 Migrating props for ${component.name}`);
    
    // In actual implementation, would update prop interfaces and usage
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Test component integration
   */
  private async testIntegration(component: DeprecatedUIComponent, step: UIMigrationStep): Promise<void> {
    console.log(`🧪 Testing integration for ${component.name}`);
    
    // In actual implementation, would run tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * Remove deprecated component
   */
  private async removeDeprecatedComponent(component: DeprecatedUIComponent, step: UIMigrationStep): Promise<void> {
    console.log(`🗑️ Removing deprecated component: ${component.name}`);
    
    // In actual implementation, would delete files
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Get user-facing changes
   */
  private getUserFacingChanges(component: DeprecatedUIComponent): string[] {
    const changes: string[] = [];

    switch (component.id) {
      case 'basic-wall-properties-panel':
        changes.push(
          'Enhanced wall properties panel with BIM quality metrics',
          'New join type selection (miter/bevel/round)',
          'Custom tolerance adjustment capability',
          'Real-time quality feedback'
        );
        break;

      case 'basic-wall-visualization-controls':
        changes.push(
          'New visualization modes: offset curves, quality heatmap',
          'Interactive tolerance zone display',
          'Enhanced geometric debugging tools'
        );
        break;

      case 'simple-wall-context-menu':
        changes.push(
          'New context menu options: validate geometry, heal walls',
          'Quality analysis and optimization tools',
          'BIM-specific wall operations'
        );
        break;
    }

    return changes;
  }

  /**
   * Get rollback instructions
   */
  private getRollbackInstructions(plan: UIComponentMigrationPlan): string[] {
    return plan.rollbackPlan.map(step => 
      `${step.order}. ${step.description} (${step.targetFiles.join(', ')})`
    );
  }

  /**
   * Execute batch migration
   */
  async executeBatchMigration(componentIds: string[]): Promise<Map<string, MigrationResult>> {
    const results = new Map<string, MigrationResult>();

    // Sort by complexity (low complexity first)
    const sortedIds = this.sortByMigrationComplexity(componentIds);

    for (const componentId of sortedIds) {
      console.log(`\n🔧 Migrating component: ${componentId}`);
      const result = await this.executeMigration(componentId);
      results.set(componentId, result);

      if (!result.success) {
        console.error(`❌ Migration failed for ${componentId}, continuing with others...`);
      }
    }

    return results;
  }

  /**
   * Sort components by migration complexity
   */
  private sortByMigrationComplexity(componentIds: string[]): string[] {
    const complexityOrder: any = { low: 0, medium: 1, high: 2 };
    
    return componentIds.sort((a, b) => {
      const componentA = this.deprecatedComponents.get(a);
      const componentB = this.deprecatedComponents.get(b);
      
      if (!componentA || !componentB) return 0;
      
      return complexityOrder[componentA.migrationComplexity] - 
             complexityOrder[componentB.migrationComplexity];
    });
  }

  /**
   * Get migration readiness assessment
   */
  getMigrationReadiness(): {
    readyForMigration: string[];
    requiresPreparation: string[];
    highRiskMigrations: string[];
    totalComponents: number;
  } {
    const ready: string[] = [];
    const preparation: string[] = [];
    const highRisk: string[] = [];

    this.deprecatedComponents.forEach((component, componentId) => {
      if (component.migrationComplexity === 'low' && component.userImpact === 'none') {
        ready.push(componentId);
      } else if (component.migrationComplexity === 'high' || component.userImpact === 'significant') {
        highRisk.push(componentId);
      } else {
        preparation.push(componentId);
      }
    });

    return {
      readyForMigration: ready,
      requiresPreparation: preparation,
      highRiskMigrations: highRisk,
      totalComponents: this.deprecatedComponents.size
    };
  }

  /**
   * Generate migration report
   */
  generateMigrationReport(): string {
    const readiness = this.getMigrationReadiness();
    
    let report = '# UI Component Migration Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += '## Summary\n\n';
    report += `- Total deprecated components: ${readiness.totalComponents}\n`;
    report += `- Ready for migration: ${readiness.readyForMigration.length}\n`;
    report += `- Requires preparation: ${readiness.requiresPreparation.length}\n`;
    report += `- High risk migrations: ${readiness.highRiskMigrations.length}\n\n`;
    
    report += '## Component Details\n\n';
    this.deprecatedComponents.forEach((component, componentId) => {
      report += `### ${component.name}\n`;
      report += `- **Replacement**: ${component.replacement}\n`;
      report += `- **Complexity**: ${component.migrationComplexity}\n`;
      report += `- **User Impact**: ${component.userImpact}\n`;
      report += `- **Reason**: ${component.deprecationReason}\n\n`;
    });
    
    return report;
  }

  /**
   * Get migration history
   */
  getMigrationHistory(): typeof this.migrationHistory {
    return [...this.migrationHistory];
  }

  /**
   * Get deprecated components
   */
  getDeprecatedComponents(): Map<string, DeprecatedUIComponent> {
    return new Map(this.deprecatedComponents);
  }

  /**
   * Get migration plans
   */
  getMigrationPlans(): Map<string, UIComponentMigrationPlan> {
    return new Map(this.migrationPlans);
  }
}