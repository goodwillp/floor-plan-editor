/**
 * useBIMMode Hook
 * 
 * React hook for managing BIM mode state and compatibility checking
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { UnifiedWallData } from '@/lib/bim/data/UnifiedWallData';
import { ModeSwitchingEngine } from '@/lib/bim/engines/ModeSwitchingEngine';
import type { 
  ModeSwitchResult, 
  CompatibilityResult 
} from '@/lib/bim/engines/ModeSwitchingEngine';

/**
 * BIM mode state interface
 */
export interface BIMMode {
  isActive: boolean;
  canSwitch: boolean;
  switchInProgress: boolean;
  lastSwitchResult?: ModeSwitchResult;
  error?: string;
}

/**
 * Compatibility status for UI display
 */
export interface UICompatibilityStatus {
  isCompatible: boolean;
  canSwitchToBIM: boolean;
  canSwitchToBasic: boolean;
  potentialDataLoss: string[];
  recommendedActions: string[];
  estimatedProcessingTime: number;
  qualityImpact: number;
}

/**
 * BIM mode hook options
 */
export interface UseBIMModeOptions {
  walls: Map<string, UnifiedWallData>;
  modeSwitchingEngine?: ModeSwitchingEngine;
  onModeChange?: (isActive: boolean) => void;
  onError?: (error: string) => void;
}

/**
 * BIM mode hook return type
 */
export interface UseBIMModeReturn {
  bimMode: BIMMode;
  compatibilityStatus: UICompatibilityStatus;
  dataPreservationGuarantee: boolean;
  toggleBIMMode: (targetMode: 'basic' | 'bim') => Promise<ModeSwitchResult>;
  refreshCompatibility: () => Promise<void>;
  clearError: () => void;
}

/**
 * Default compatibility status
 */
const DEFAULT_COMPATIBILITY: UICompatibilityStatus = {
  isCompatible: true,
  canSwitchToBIM: true,
  canSwitchToBasic: true,
  potentialDataLoss: [],
  recommendedActions: [],
  estimatedProcessingTime: 0,
  qualityImpact: 0
};

/**
 * useBIMMode Hook
 */
export const useBIMMode = ({
  walls,
  modeSwitchingEngine,
  onModeChange,
  onError
}: UseBIMModeOptions): UseBIMModeReturn => {
  const [bimMode, setBimMode] = useState<BIMMode>({
    isActive: false,
    canSwitch: true,
    switchInProgress: false
  });

  const [compatibilityStatus, setCompatibilityStatus] = useState<UICompatibilityStatus>(
    DEFAULT_COMPATIBILITY
  );

  // Determine if BIM mode is currently active based on wall data
  const isCurrentlyBIMMode = useMemo(() => {
    if (walls.size === 0) return false;
    
    // Check if any walls have BIM geometry
    for (const wall of walls.values()) {
      if (wall.bimGeometry && wall.lastModifiedMode === 'bim') {
        return true;
      }
    }
    return false;
  }, [walls]);

  // Update BIM mode state when wall data changes
  useEffect(() => {
    setBimMode(prev => ({
      ...prev,
      isActive: isCurrentlyBIMMode
    }));
  }, [isCurrentlyBIMMode]);

  // Calculate data preservation guarantee
  const dataPreservationGuarantee = useMemo(() => {
    return compatibilityStatus.potentialDataLoss.length === 0 && 
           compatibilityStatus.qualityImpact < 0.05;
  }, [compatibilityStatus]);

  /**
   * Refresh compatibility status
   */
  const refreshCompatibility = useCallback(async () => {
    if (!modeSwitchingEngine || walls.size === 0) {
      setCompatibilityStatus(DEFAULT_COMPATIBILITY);
      return;
    }

    try {
      const currentMode = isCurrentlyBIMMode ? 'bim' : 'basic';
      const targetMode = isCurrentlyBIMMode ? 'basic' : 'bim';
      
      const result = await modeSwitchingEngine.validateModeSwitch(
        currentMode,
        targetMode,
        walls
      );

      // Convert engine result to UI format
      const uiStatus: UICompatibilityStatus = {
        isCompatible: result.isCompatible,
        canSwitchToBIM: result.canSwitchToBIM,
        canSwitchToBasic: result.canSwitchToBasic,
        potentialDataLoss: result.potentialDataLoss,
        recommendedActions: generateRecommendations(result),
        estimatedProcessingTime: result.estimatedProcessingTime,
        qualityImpact: calculateQualityImpact(result)
      };

      setCompatibilityStatus(uiStatus);
      
      // Update canSwitch based on compatibility
      setBimMode(prev => ({
        ...prev,
        canSwitch: result.isCompatible
      }));
    } catch (error) {
      const errorMessage = `Compatibility check failed: ${error}`;
      setBimMode(prev => ({
        ...prev,
        error: errorMessage,
        canSwitch: false
      }));
      onError?.(errorMessage);
    }
  }, [modeSwitchingEngine, walls, isCurrentlyBIMMode, onError]);

  /**
   * Toggle BIM mode
   */
  const toggleBIMMode = useCallback(async (targetMode: 'basic' | 'bim'): Promise<ModeSwitchResult> => {
    if (!modeSwitchingEngine) {
      const error = 'Mode switching engine not available';
      setBimMode(prev => ({ ...prev, error }));
      throw new Error(error);
    }

    setBimMode(prev => ({
      ...prev,
      switchInProgress: true,
      error: undefined
    }));

    try {
      let result: ModeSwitchResult;
      
      if (targetMode === 'bim') {
        result = await modeSwitchingEngine.switchToBIMMode(walls);
      } else {
        result = await modeSwitchingEngine.switchToBasicMode(walls);
      }

      setBimMode(prev => ({
        ...prev,
        isActive: targetMode === 'bim' && result.success,
        switchInProgress: false,
        lastSwitchResult: result,
        error: result.success ? undefined : `Mode switch failed: ${result.warnings.join(', ')}`
      }));

      if (result.success) {
        onModeChange?.(targetMode === 'bim');
        // Refresh compatibility after successful switch
        await refreshCompatibility();
      } else {
        onError?.(result.warnings.join(', '));
      }

      return result;
    } catch (error) {
      const errorMessage = `Mode switch error: ${error}`;
      setBimMode(prev => ({
        ...prev,
        switchInProgress: false,
        error: errorMessage
      }));
      onError?.(errorMessage);
      
      // Return failed result
      return {
        success: false,
        convertedWalls: [],
        failedWalls: Array.from(walls.keys()),
        warnings: [errorMessage],
        preservedData: false,
        processingTime: 0,
        qualityImpact: 1.0,
        approximationsUsed: []
      };
    }
  }, [modeSwitchingEngine, walls, onModeChange, onError, refreshCompatibility]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setBimMode(prev => ({
      ...prev,
      error: undefined
    }));
  }, []);

  // Refresh compatibility when walls change
  useEffect(() => {
    refreshCompatibility();
  }, [refreshCompatibility]);

  return {
    bimMode,
    compatibilityStatus,
    dataPreservationGuarantee,
    toggleBIMMode,
    refreshCompatibility,
    clearError
  };
};

/**
 * Generate user-friendly recommendations from compatibility result
 */
function generateRecommendations(result: CompatibilityResult): string[] {
  const recommendations: string[] = [];

  if (result.blockers.length > 0) {
    recommendations.push('Fix geometry validation errors before switching modes');
  }

  if (result.potentialDataLoss.length > 0) {
    recommendations.push('Consider backing up your project before switching');
  }

  if (result.estimatedProcessingTime > 5000) {
    recommendations.push('Large project - consider switching during off-peak hours');
  }

  if (result.warnings.length > 0) {
    recommendations.push('Review warnings and consider simplifying complex geometry');
  }

  if (recommendations.length === 0) {
    recommendations.push('Mode switch should complete without issues');
  }

  return recommendations;
}

/**
 * Calculate overall quality impact from compatibility result
 */
function calculateQualityImpact(result: CompatibilityResult): number {
  let impact = 0;

  // Add impact for potential data loss
  impact += result.potentialDataLoss.length * 0.1;

  // Add impact for warnings
  impact += result.warnings.length * 0.05;

  // Add impact for blockers (severe)
  impact += result.blockers.length * 0.3;

  return Math.min(impact, 1.0);
}

export default useBIMMode;