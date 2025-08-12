/**
 * Feature Flag Manager for gradual BIM rollout
 * Allows enabling/disabling BIM features per user or project
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

export interface FeatureFlag {
  name: string;
  description: string;
  category: 'core' | 'rendering' | 'ui' | 'performance' | 'experimental';
  defaultEnabled: boolean;
  dependencies: string[];
  rolloutPercentage: number; // 0-100, for gradual rollout
  minimumVersion?: string;
  deprecatesFeature?: string;
}

export interface FeatureFlagConfig {
  userId?: string;
  projectId?: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  overrides: Record<string, boolean>;
}

/**
 * Manages feature flags for BIM functionality rollout
 */
export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private config: FeatureFlagConfig;
  private enabledFeatures: Set<string> = new Set();
  private listeners: Map<string, Array<(enabled: boolean) => void>> = new Map();

  constructor(config?: Partial<FeatureFlagConfig>) {
    this.config = {
      version: '1.0.0',
      environment: 'development',
      overrides: {},
      ...config
    };

    this.initializeDefaultFlags();
    this.loadConfiguration();
  }

  /**
   * Initialize default BIM feature flags
   */
  private initializeDefaultFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        name: 'adaptive-tolerance',
        description: 'Use adaptive tolerance calculations based on wall thickness and document precision',
        category: 'core',
        defaultEnabled: false,
        dependencies: [],
        rolloutPercentage: 0
      },
      {
        name: 'bim-intersection-algorithms',
        description: 'Enhanced intersection algorithms with robust boolean operations',
        category: 'core',
        defaultEnabled: false,
        dependencies: ['adaptive-tolerance'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-wall-rendering',
        description: 'BIM-enhanced wall rendering with offset curves and quality visualization',
        category: 'rendering',
        defaultEnabled: false,
        dependencies: ['bim-intersection-algorithms'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-wall-selection',
        description: 'BIM-aware wall selection using wall solid geometry',
        category: 'ui',
        defaultEnabled: false,
        dependencies: ['bim-wall-rendering'],
        rolloutPercentage: 0
      },
      {
        name: 'adaptive-selection-tolerance',
        description: 'Dynamic selection tolerance based on zoom level and wall thickness',
        category: 'ui',
        defaultEnabled: false,
        dependencies: ['adaptive-tolerance'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-distance-calculations',
        description: 'Enhanced distance calculations with BIM precision',
        category: 'core',
        defaultEnabled: false,
        dependencies: ['adaptive-tolerance'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-proximity-detection',
        description: 'Thickness-aware proximity detection for wall operations',
        category: 'core',
        defaultEnabled: false,
        dependencies: ['bim-distance-calculations'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-quality-metrics',
        description: 'Real-time geometric quality assessment and visualization',
        category: 'ui',
        defaultEnabled: false,
        dependencies: ['bim-wall-rendering'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-shape-healing',
        description: 'Automatic shape healing for geometric issues',
        category: 'core',
        defaultEnabled: false,
        dependencies: ['bim-intersection-algorithms'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-advanced-visualization',
        description: 'Advanced visualization modes (offset curves, quality heatmaps, etc.)',
        category: 'rendering',
        defaultEnabled: false,
        dependencies: ['bim-wall-rendering', 'bim-quality-metrics'],
        rolloutPercentage: 0
      },
      {
        name: 'show-deprecation-warnings',
        description: 'Show deprecation warnings for legacy API usage',
        category: 'experimental',
        defaultEnabled: true,
        dependencies: [],
        rolloutPercentage: 100
      },
      {
        name: 'track-legacy-usage',
        description: 'Track usage of legacy APIs for migration analytics',
        category: 'experimental',
        defaultEnabled: false,
        dependencies: [],
        rolloutPercentage: 0
      },
      {
        name: 'bim-performance-mode',
        description: 'Performance optimizations for BIM operations',
        category: 'performance',
        defaultEnabled: false,
        dependencies: ['bim-wall-rendering'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-batch-operations',
        description: 'Batch processing for multiple wall operations',
        category: 'performance',
        defaultEnabled: false,
        dependencies: ['bim-intersection-algorithms'],
        rolloutPercentage: 0
      },
      {
        name: 'bim-spatial-indexing',
        description: 'Spatial indexing for efficient geometric queries',
        category: 'performance',
        defaultEnabled: false,
        dependencies: [],
        rolloutPercentage: 0
      }
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.name, flag);
    });
  }

  /**
   * Load configuration from storage or environment
   */
  private loadConfiguration(): void {
    try {
      // Try to load from localStorage first
      const stored = localStorage.getItem('bim-feature-flags');
      if (stored) {
        const storedConfig = JSON.parse(stored);
        Object.assign(this.config.overrides, storedConfig.overrides || {});
      }
    } catch (error) {
      console.warn('Failed to load feature flag configuration:', error);
    }

    // Apply initial configuration
    this.applyConfiguration();
  }

  /**
   * Apply current configuration to determine enabled features
   */
  private applyConfiguration(): void {
    this.enabledFeatures.clear();

    for (const [name, flag] of this.flags) {
      let enabled = false;

      // Check explicit override first
      if (name in this.config.overrides) {
        enabled = this.config.overrides[name];
      } else {
        // Check rollout percentage
        enabled = this.shouldEnableByRollout(flag);
      }

      // Check dependencies
      if (enabled && !this.areDependenciesMet(flag)) {
        console.warn(`Feature ${name} disabled due to unmet dependencies:`, flag.dependencies);
        enabled = false;
      }

      if (enabled) {
        this.enabledFeatures.add(name);
      }
    }
  }

  /**
   * Check if feature should be enabled based on rollout percentage
   */
  private shouldEnableByRollout(flag: FeatureFlag): boolean {
    if (flag.rolloutPercentage === 0) return flag.defaultEnabled;
    if (flag.rolloutPercentage === 100) return true;

    // Use deterministic hash based on user/project ID for consistent rollout
    const identifier = this.config.userId || this.config.projectId || 'anonymous';
    const hash = this.simpleHash(identifier + flag.name);
    const percentage = hash % 100;

    return percentage < flag.rolloutPercentage;
  }

  /**
   * Simple hash function for rollout determination
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if all dependencies for a feature are met
   */
  private areDependenciesMet(flag: FeatureFlag): boolean {
    return flag.dependencies.every(dep => this.enabledFeatures.has(dep));
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(featureName: string): boolean {
    return this.enabledFeatures.has(featureName);
  }

  /**
   * Enable a feature (with dependency checking)
   */
  enable(featureName: string): boolean {
    const flag = this.flags.get(featureName);
    if (!flag) {
      console.warn(`Unknown feature flag: ${featureName}`);
      return false;
    }

    // Check dependencies
    if (!this.areDependenciesMet(flag)) {
      console.warn(`Cannot enable ${featureName}: dependencies not met:`, flag.dependencies);
      return false;
    }

    this.config.overrides[featureName] = true;
    this.enabledFeatures.add(featureName);
    this.saveConfiguration();
    this.notifyListeners(featureName, true);

    console.log(`✅ Feature enabled: ${featureName}`);
    return true;
  }

  /**
   * Disable a feature (with dependent feature checking)
   */
  disable(featureName: string): boolean {
    const flag = this.flags.get(featureName);
    if (!flag) {
      console.warn(`Unknown feature flag: ${featureName}`);
      return false;
    }

    // Check if other features depend on this one
    const dependentFeatures = this.getDependentFeatures(featureName);
    if (dependentFeatures.length > 0) {
      console.warn(`Cannot disable ${featureName}: other features depend on it:`, dependentFeatures);
      return false;
    }

    this.config.overrides[featureName] = false;
    this.enabledFeatures.delete(featureName);
    this.saveConfiguration();
    this.notifyListeners(featureName, false);

    console.log(`❌ Feature disabled: ${featureName}`);
    return true;
  }

  /**
   * Get features that depend on the given feature
   */
  private getDependentFeatures(featureName: string): string[] {
    const dependents: string[] = [];
    
    for (const [name, flag] of this.flags) {
      if (flag.dependencies.includes(featureName) && this.enabledFeatures.has(name)) {
        dependents.push(name);
      }
    }

    return dependents;
  }

  /**
   * Force enable a feature (ignoring dependencies)
   */
  forceEnable(featureName: string): boolean {
    const flag = this.flags.get(featureName);
    if (!flag) {
      console.warn(`Unknown feature flag: ${featureName}`);
      return false;
    }

    this.config.overrides[featureName] = true;
    this.enabledFeatures.add(featureName);
    this.saveConfiguration();
    this.notifyListeners(featureName, true);

    console.warn(`⚠️ Feature force-enabled: ${featureName} (dependencies may not be met)`);
    return true;
  }

  /**
   * Force disable a feature (ignoring dependents)
   */
  forceDisable(featureName: string): boolean {
    const flag = this.flags.get(featureName);
    if (!flag) {
      console.warn(`Unknown feature flag: ${featureName}`);
      return false;
    }

    this.config.overrides[featureName] = false;
    this.enabledFeatures.delete(featureName);
    this.saveConfiguration();
    this.notifyListeners(featureName, false);

    console.warn(`⚠️ Feature force-disabled: ${featureName} (dependent features may break)`);
    return true;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures(): string[] {
    return Array.from(this.enabledFeatures);
  }

  /**
   * Get all available features
   */
  getAllFeatures(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get feature information
   */
  getFeature(featureName: string): FeatureFlag | undefined {
    return this.flags.get(featureName);
  }

  /**
   * Get features by category
   */
  getFeaturesByCategory(category: string): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.category === category);
  }

  /**
   * Add listener for feature changes
   */
  addListener(featureName: string, callback: (enabled: boolean) => void): void {
    if (!this.listeners.has(featureName)) {
      this.listeners.set(featureName, []);
    }
    this.listeners.get(featureName)!.push(callback);
  }

  /**
   * Remove listener for feature changes
   */
  removeListener(featureName: string, callback: (enabled: boolean) => void): void {
    const listeners = this.listeners.get(featureName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notify listeners of feature changes
   */
  private notifyListeners(featureName: string, enabled: boolean): void {
    const listeners = this.listeners.get(featureName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(enabled);
        } catch (error) {
          console.error(`Error in feature flag listener for ${featureName}:`, error);
        }
      });
    }
  }

  /**
   * Save configuration to storage
   */
  private saveConfiguration(): void {
    try {
      const configToSave = {
        overrides: this.config.overrides,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('bim-feature-flags', JSON.stringify(configToSave));
    } catch (error) {
      console.warn('Failed to save feature flag configuration:', error);
    }
  }

  /**
   * Reset all overrides to defaults
   */
  resetToDefaults(): void {
    this.config.overrides = {};
    this.applyConfiguration();
    this.saveConfiguration();
    console.log('🔄 Feature flags reset to defaults');
  }

  /**
   * Get migration readiness assessment
   */
  getMigrationReadiness(): {
    readyForProduction: boolean;
    coreFeatures: { name: string; enabled: boolean; required: boolean }[];
    recommendations: string[];
  } {
    const coreFeatures = [
      { name: 'adaptive-tolerance', required: true },
      { name: 'bim-intersection-algorithms', required: true },
      { name: 'bim-wall-rendering', required: true },
      { name: 'bim-wall-selection', required: false },
      { name: 'bim-quality-metrics', required: false }
    ];

    const featureStatus = coreFeatures.map(feature => ({
      ...feature,
      enabled: this.isEnabled(feature.name)
    }));

    const requiredEnabled = featureStatus.filter(f => f.required && f.enabled).length;
    const totalRequired = featureStatus.filter(f => f.required).length;
    const readyForProduction = requiredEnabled === totalRequired;

    const recommendations: string[] = [];
    if (!readyForProduction) {
      featureStatus.filter(f => f.required && !f.enabled).forEach(feature => {
        recommendations.push(`Enable required feature: ${feature.name}`);
      });
    }

    return {
      readyForProduction,
      coreFeatures: featureStatus,
      recommendations
    };
  }

  /**
   * Export configuration for backup or sharing
   */
  exportConfiguration(): string {
    return JSON.stringify({
      config: this.config,
      enabledFeatures: Array.from(this.enabledFeatures),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfiguration(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      if (imported.config && imported.config.overrides) {
        this.config.overrides = imported.config.overrides;
        this.applyConfiguration();
        this.saveConfiguration();
        console.log('📥 Feature flag configuration imported successfully');
        return true;
      }
    } catch (error) {
      console.error('Failed to import feature flag configuration:', error);
    }
    return false;
  }
}