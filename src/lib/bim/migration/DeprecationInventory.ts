/**
 * Comprehensive inventory of deprecated functionality with impact analysis
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

export interface DeprecatedMethod {
  id: string;
  name: string;
  file: string;
  lineNumbers: number[];
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'geometric' | 'tolerance' | 'ui' | 'rendering' | 'validation';
  replacement: string;
  migrationStrategy: string;
  affectedComponents: string[];
  testFiles: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
  dependencies: string[];
}

export interface DeprecatedConstant {
  id: string;
  name: string;
  file: string;
  lineNumber: number;
  currentValue: any;
  description: string;
  impact: 'high' | 'medium' | 'low';
  replacement: string;
  migrationPath: string;
}

export interface DeprecatedUIComponent {
  id: string;
  name: string;
  file: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  replacement: string;
  userFacingChanges: string[];
}

/**
 * Complete inventory of deprecated functionality
 */
export const DEPRECATED_METHODS: DeprecatedMethod[] = [
  {
    id: 'wall-renderer-basic-offset',
    name: 'Basic polygon expansion in WallRenderer',
    file: 'floor-plan-editor/src/lib/WallRenderer.ts',
    lineNumbers: [45, 200],
    description: 'Simple quad generation with Martinez boolean operations for wall rendering',
    impact: 'high',
    category: 'rendering',
    replacement: 'RobustOffsetEngine with proper baseline curve offsetting',
    migrationStrategy: 'Gradual replacement with BIM-compatible offset operations using feature flags',
    affectedComponents: ['WallRenderer', 'FloorPlanRenderer', 'PerformanceOptimizer'],
    testFiles: ['WallRenderer.test.ts', 'FloorPlanRenderer.test.ts'],
    estimatedEffort: 'large',
    dependencies: ['RobustOffsetEngine', 'BooleanOperationsEngine']
  },
  {
    id: 'wall-renderer-hardcoded-tolerance',
    name: 'Hardcoded intersection tolerance in WallRenderer',
    file: 'floor-plan-editor/src/lib/WallRenderer.ts',
    lineNumbers: [166, 544],
    description: 'Fixed tolerance value 1e-6 for intersection detection in miter calculations',
    impact: 'medium',
    category: 'tolerance',
    replacement: 'AdaptiveToleranceManager with thickness-based calculations',
    migrationStrategy: 'Replace with dynamic tolerance system based on wall properties',
    affectedComponents: ['WallRenderer'],
    testFiles: ['WallRenderer.test.ts'],
    estimatedEffort: 'small',
    dependencies: ['AdaptiveToleranceManager']
  },
  {
    id: 'wall-renderer-basic-wedge-joins',
    name: 'Basic wedge join generation',
    file: 'floor-plan-editor/src/lib/WallRenderer.ts',
    lineNumbers: [180, 220],
    description: 'Simple angle-based join creation without proper offset-line intersection',
    impact: 'high',
    category: 'geometric',
    replacement: 'Proper miter apex calculation using offset-line intersection methods',
    migrationStrategy: 'Implement exact intersection calculations for wall connections',
    affectedComponents: ['WallRenderer'],
    testFiles: ['WallRenderer.test.ts'],
    estimatedEffort: 'medium',
    dependencies: ['IntersectionData', 'MiterCalculation']
  },
  {
    id: 'geometry-service-fixed-tolerance',
    name: 'Fixed tolerance constants in GeometryService',
    file: 'floor-plan-editor/src/lib/GeometryService.ts',
    lineNumbers: [8, 12],
    description: 'Hardcoded TOLERANCE (1e-6) and PROXIMITY_THRESHOLD (5) constants',
    impact: 'high',
    category: 'tolerance',
    replacement: 'Adaptive tolerance based on wall thickness and document precision',
    migrationStrategy: 'Replace with context-aware tolerance calculations from AdaptiveToleranceManager',
    affectedComponents: ['GeometryService', 'FloorPlanModel', 'DrawingService'],
    testFiles: ['GeometryService.test.ts', 'FloorPlanModel.test.ts'],
    estimatedEffort: 'medium',
    dependencies: ['AdaptiveToleranceManager']
  },
  {
    id: 'geometry-service-basic-intersection',
    name: 'Basic line intersection algorithm',
    file: 'floor-plan-editor/src/lib/GeometryService.ts',
    lineNumbers: [35, 65],
    description: 'Simple parametric line intersection without robust handling of edge cases',
    impact: 'medium',
    category: 'geometric',
    replacement: 'Robust intersection algorithms from BooleanOperationsEngine',
    migrationStrategy: 'Enhance with fallback strategies and comprehensive validation',
    affectedComponents: ['GeometryService', 'DrawingService'],
    testFiles: ['GeometryService.test.ts', 'DrawingService.test.ts'],
    estimatedEffort: 'medium',
    dependencies: ['BooleanOperationsEngine', 'GeometryValidator']
  },
  {
    id: 'geometry-service-proximity-detection',
    name: 'Distance-based proximity detection',
    file: 'floor-plan-editor/src/lib/GeometryService.ts',
    lineNumbers: [200, 250],
    description: 'Fixed threshold proximity detection without wall thickness consideration',
    impact: 'medium',
    category: 'geometric',
    replacement: 'Thickness-proportional proximity detection',
    migrationStrategy: 'Scale thresholds based on wall properties and geometric context',
    affectedComponents: ['GeometryService', 'WallMergeService'],
    testFiles: ['GeometryService.test.ts'],
    estimatedEffort: 'small',
    dependencies: ['AdaptiveToleranceManager']
  },
  {
    id: 'geometry-service-node-cleanup',
    name: 'Basic node cleanup validation',
    file: 'floor-plan-editor/src/lib/GeometryService.ts',
    lineNumbers: [120, 150],
    description: 'Simple collinearity check without BIM-level precision requirements',
    impact: 'medium',
    category: 'validation',
    replacement: 'Enhanced validation from GeometryValidator with quality metrics',
    migrationStrategy: 'Integrate with BIM quality assessment and healing algorithms',
    affectedComponents: ['GeometryService', 'FloorPlanModel'],
    testFiles: ['GeometryService.test.ts', 'FloorPlanModel.nodeCleanup.test.ts'],
    estimatedEffort: 'medium',
    dependencies: ['GeometryValidator', 'QualityMetrics']
  },
  {
    id: 'wall-selection-fixed-tolerance',
    name: 'Fixed selection tolerance in WallSelectionService',
    file: 'floor-plan-editor/src/lib/WallSelectionService.ts',
    lineNumbers: [11],
    description: 'Hardcoded 10-pixel selection tolerance regardless of context',
    impact: 'medium',
    category: 'ui',
    replacement: 'Dynamic selection tolerance based on wall thickness and zoom level',
    migrationStrategy: 'Integrate with BIM wall shell geometry for accurate selection',
    affectedComponents: ['WallSelectionService', 'InteractionHandler'],
    testFiles: ['WallSelectionService.test.ts'],
    estimatedEffort: 'small',
    dependencies: ['BIMWallSystem', 'ViewportManager']
  }
];

export const DEPRECATED_CONSTANTS: DeprecatedConstant[] = [
  {
    id: 'tolerance-config-pixel-based',
    name: 'Pixel-based tolerance configuration',
    file: 'floor-plan-editor/src/lib/ToleranceConfig.ts',
    lineNumber: 16,
    currentValue: {
      projectionMinPx: 40,
      projectionMultiplier: 1.2,
      nodeReuseMinPx: 30,
      nodeReuseMultiplier: 0.5,
      mergeNearbyMinPx: 10,
      mergeNearbyMultiplier: 0.5
    },
    description: 'Pixel-based tolerance values without mathematical precision',
    impact: 'high',
    replacement: 'AdaptiveToleranceManager with context-aware calculations',
    migrationPath: 'Replace with mathematical precision based on wall thickness and document settings'
  },
  {
    id: 'wall-thickness-constants',
    name: 'Hardcoded wall thickness constants',
    file: 'floor-plan-editor/src/lib/types.ts',
    lineNumber: 45,
    currentValue: {
      layout: 350,
      zone: 250,
      area: 150
    },
    description: 'Fixed wall thickness values without customization support',
    impact: 'medium',
    replacement: 'Dynamic thickness management in BIM system',
    migrationPath: 'Maintain compatibility while adding BIM flexibility for custom thicknesses'
  },
  {
    id: 'geometry-service-tolerance',
    name: 'GeometryService TOLERANCE constant',
    file: 'floor-plan-editor/src/lib/GeometryService.ts',
    lineNumber: 8,
    currentValue: 1e-6,
    description: 'Fixed floating-point comparison tolerance',
    impact: 'high',
    replacement: 'Context-aware tolerance from AdaptiveToleranceManager',
    migrationPath: 'Replace with dynamic tolerance based on operation type and geometric context'
  },
  {
    id: 'geometry-service-proximity',
    name: 'GeometryService PROXIMITY_THRESHOLD constant',
    file: 'floor-plan-editor/src/lib/GeometryService.ts',
    lineNumber: 12,
    currentValue: 5,
    description: 'Fixed proximity threshold for wall operations',
    impact: 'medium',
    replacement: 'Thickness-proportional proximity calculations',
    migrationPath: 'Scale based on wall thickness and geometric requirements'
  }
];

export const DEPRECATED_UI_COMPONENTS: DeprecatedUIComponent[] = [
  {
    id: 'basic-wall-properties-panel',
    name: 'Basic Wall Properties Panel',
    file: 'TBD - UI component audit needed',
    description: 'Simple wall property controls without BIM capabilities',
    impact: 'medium',
    replacement: 'BIMWallPropertiesPanel with advanced geometric controls',
    userFacingChanges: [
      'Advanced join type selection (miter/bevel/round)',
      'Quality metrics display',
      'Custom tolerance adjustment',
      'Real-time geometric feedback'
    ]
  },
  {
    id: 'simple-wall-visualization',
    name: 'Basic Wall Visualization Modes',
    file: 'TBD - Renderer component audit needed',
    description: 'Simple filled polygon rendering without advanced BIM visualization',
    impact: 'medium',
    replacement: 'Advanced BIM visualization modes',
    userFacingChanges: [
      'Offset curve visualization',
      'Intersection data display',
      'Quality heatmap rendering',
      'Tolerance zone indicators'
    ]
  },
  {
    id: 'fixed-tolerance-controls',
    name: 'Fixed Tolerance UI Controls',
    file: 'TBD - Settings component audit needed',
    description: 'Simple tolerance sliders without context awareness',
    impact: 'low',
    replacement: 'Interactive tolerance adjustment with impact preview',
    userFacingChanges: [
      'Real-time tolerance impact visualization',
      'Automatic tolerance recommendations',
      'Context-aware tolerance bounds',
      'Quality vs performance trade-off indicators'
    ]
  }
];

/**
 * Migration priority matrix based on impact and effort
 */
export const MIGRATION_PRIORITIES: Record<string, string[]> = {
  critical: [
    'wall-renderer-basic-offset',
    'geometry-service-fixed-tolerance',
    'tolerance-config-pixel-based'
  ],
  high: [
    'wall-renderer-basic-wedge-joins',
    'geometry-service-basic-intersection',
    'geometry-service-tolerance'
  ],
  medium: [
    'geometry-service-proximity-detection',
    'geometry-service-node-cleanup',
    'wall-selection-fixed-tolerance',
    'wall-thickness-constants'
  ],
  low: [
    'wall-renderer-hardcoded-tolerance',
    'geometry-service-proximity',
    'basic-wall-properties-panel',
    'simple-wall-visualization',
    'fixed-tolerance-controls'
  ]
};

/**
 * Dependency graph for migration planning
 */
export const MIGRATION_DEPENDENCIES: Record<string, string[]> = {
  'AdaptiveToleranceManager': [
    'geometry-service-fixed-tolerance',
    'wall-renderer-hardcoded-tolerance',
    'tolerance-config-pixel-based',
    'geometry-service-tolerance',
    'geometry-service-proximity'
  ],
  'RobustOffsetEngine': [
    'wall-renderer-basic-offset'
  ],
  'BooleanOperationsEngine': [
    'geometry-service-basic-intersection'
  ],
  'GeometryValidator': [
    'geometry-service-node-cleanup'
  ],
  'BIMWallSystem': [
    'wall-selection-fixed-tolerance',
    'basic-wall-properties-panel'
  ]
};

/**
 * Get deprecated methods by category
 */
export function getDeprecatedMethodsByCategory(category: string): DeprecatedMethod[] {
  return DEPRECATED_METHODS.filter(method => method.category === (category as any));
}

/**
 * Get migration priority for a deprecated item
 */
export function getMigrationPriority(itemId: string): string {
  for (const [priority, items] of Object.entries(MIGRATION_PRIORITIES)) {
    if (items.includes(itemId)) {
      return priority;
    }
  }
  return 'unknown';
}

/**
 * Get dependencies for a BIM component
 */
export function getDependentItems(componentName: string): string[] {
  return (MIGRATION_DEPENDENCIES as any)[componentName] || [];
}

/**
 * Calculate total migration effort
 */
export function calculateMigrationEffort(): {
  small: number;
  medium: number;
  large: number;
  total: number;
} {
  const effort = { small: 0, medium: 0, large: 0, total: 0 };
  
  DEPRECATED_METHODS.forEach(method => {
    effort[method.estimatedEffort]++;
    effort.total++;
  });
  
  return effort;
}

/**
 * Get impact analysis summary
 */
export function getImpactAnalysis(): {
  high: number;
  medium: number;
  low: number;
  byCategory: Record<string, number>;
} {
  const impact = { high: 0, medium: 0, low: 0, byCategory: {} };
  
  DEPRECATED_METHODS.forEach(method => {
    (impact as any)[method.impact]++;
    (impact.byCategory as any)[method.category] = ((impact.byCategory as any)[method.category] || 0) + 1;
  });
  
  DEPRECATED_CONSTANTS.forEach(constant => {
    (impact as any)[constant.impact]++;
  });
  
  DEPRECATED_UI_COMPONENTS.forEach(component => {
    (impact as any)[component.impact]++;
  });
  
  return impact;
}