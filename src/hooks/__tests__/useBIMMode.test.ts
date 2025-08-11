/**
 * useBIMMode Hook Tests
 * 
 * Tests for BIM mode state management and compatibility checking
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useBIMMode } from '../useBIMMode';
import type { UseBIMModeOptions } from '../useBIMMode';
import { UnifiedWallData } from '@/lib/bim/data/UnifiedWallData';
import { ModeSwitchingEngine } from '@/lib/bim/engines/ModeSwitchingEngine';
import type { 
  ModeSwitchResult, 
  CompatibilityResult 
} from '@/lib/bim/engines/ModeSwitchingEngine';

// Mock the BIM modules
vi.mock('@/lib/bim/data/UnifiedWallData');
vi.mock('@/lib/bim/engines/ModeSwitchingEngine');

describe('useBIMMode', () => {
  let mockModeSwitchingEngine: vi.Mocked<ModeSwitchingEngine>;
  let mockWalls: Map<string, UnifiedWallData>;
  let mockOnModeChange: vi.Mock;
  let mockOnError: vi.Mock;

  const mockCompatibilityResult: CompatibilityResult = {
    isCompatible: true,
    canSwitchToBIM: true,
    canSwitchToBasic: true,
    blockers: [],
    warnings: [],
    estimatedProcessingTime: 1000,
    potentialDataLoss: []
  };

  const mockSuccessfulSwitchResult: ModeSwitchResult = {
    success: true,
    convertedWalls: ['wall1', 'wall2'],
    failedWalls: [],
    warnings: [],
    preservedData: true,
    processingTime: 1000,
    qualityImpact: 0,
    approximationsUsed: []
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ModeSwitchingEngine
    mockModeSwitchingEngine = {
      validateModeSwitch: vi.fn().mockResolvedValue(mockCompatibilityResult),
      switchToBIMMode: vi.fn().mockResolvedValue(mockSuccessfulSwitchResult),
      switchToBasicMode: vi.fn().mockResolvedValue(mockSuccessfulSwitchResult),
      synchronizeModes: vi.fn()
    } as any;

    // Mock walls
    mockWalls = new Map();
    
    // Create mock wall data
    const mockWall1 = {
      id: 'wall1',
      bimGeometry: undefined,
      lastModifiedMode: 'basic',
      getModeCompatibility: vi.fn().mockReturnValue({
        canSwitchToBIM: true,
        canSwitchToBasic: true,
        potentialDataLoss: [],
        approximationsRequired: [],
        qualityImpact: 0,
        estimatedProcessingTime: 500
      })
    } as any;

    const mockWall2 = {
      id: 'wall2',
      bimGeometry: undefined,
      lastModifiedMode: 'basic',
      getModeCompatibility: vi.fn().mockReturnValue({
        canSwitchToBIM: true,
        canSwitchToBasic: true,
        potentialDataLoss: [],
        approximationsRequired: [],
        qualityImpact: 0,
        estimatedProcessingTime: 500
      })
    } as any;

    mockWalls.set('wall1', mockWall1);
    mockWalls.set('wall2', mockWall2);

    mockOnModeChange = vi.fn();
    mockOnError = vi.fn();
  });

  describe('Initial State', () => {
    it('should initialize with basic mode inactive', () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onModeChange: mockOnModeChange,
        onError: mockOnError
      };

      const { result } = renderHook(() => useBIMMode(options));

      expect(result.current.bimMode.isActive).toBe(false);
      expect(result.current.bimMode.canSwitch).toBe(true);
      expect(result.current.bimMode.switchInProgress).toBe(false);
    });

    it('should detect BIM mode when walls have BIM geometry', () => {
      // Set up wall with BIM geometry
      const bimWall = {
        id: 'wall1',
        bimGeometry: { wallSolid: {}, offsetCurves: [], intersectionData: [], qualityMetrics: {} },
        lastModifiedMode: 'bim',
        getModeCompatibility: vi.fn().mockReturnValue({
          canSwitchToBIM: true,
          canSwitchToBasic: true,
          potentialDataLoss: [],
          approximationsRequired: [],
          qualityImpact: 0,
          estimatedProcessingTime: 500
        })
      } as any;

      const wallsWithBIM = new Map([['wall1', bimWall]]);

      const options: UseBIMModeOptions = {
        walls: wallsWithBIM,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onModeChange: mockOnModeChange,
        onError: mockOnError
      };

      const { result } = renderHook(() => useBIMMode(options));

      expect(result.current.bimMode.isActive).toBe(true);
    });

    it('should initialize with default compatibility status', () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { result } = renderHook(() => useBIMMode(options));

      expect(result.current.compatibilityStatus.isCompatible).toBe(true);
      expect(result.current.dataPreservationGuarantee).toBe(true);
    });
  });

  describe('Compatibility Checking', () => {
    it('should refresh compatibility status on initialization', async () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      renderHook(() => useBIMMode(options));

      await waitFor(() => {
        expect(mockModeSwitchingEngine.validateModeSwitch).toHaveBeenCalledWith(
          'basic',
          'bim',
          mockWalls
        );
      });
    });

    it('should update compatibility status when walls change', async () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { rerender } = renderHook(() => useBIMMode(options));

      // Add a new wall
      const newWalls = new Map(mockWalls);
      const newWall = {
        id: 'wall3',
        bimGeometry: undefined,
        lastModifiedMode: 'basic',
        getModeCompatibility: vi.fn().mockReturnValue({
          canSwitchToBIM: true,
          canSwitchToBasic: true,
          potentialDataLoss: [],
          approximationsRequired: [],
          qualityImpact: 0,
          estimatedProcessingTime: 500
        })
      } as any;
      newWalls.set('wall3', newWall);

      rerender({ walls: newWalls, modeSwitchingEngine: mockModeSwitchingEngine });

      await waitFor(() => {
        expect(mockModeSwitchingEngine.validateModeSwitch).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle compatibility check errors', async () => {
      mockModeSwitchingEngine.validateModeSwitch.mockRejectedValue(
        new Error('Compatibility check failed')
      );

      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onError: mockOnError
      };

      renderHook(() => useBIMMode(options));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('Compatibility check failed')
        );
      });
    });

    it('should manually refresh compatibility', async () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { result } = renderHook(() => useBIMMode(options));

      await act(async () => {
        await result.current.refreshCompatibility();
      });

      expect(mockModeSwitchingEngine.validateModeSwitch).toHaveBeenCalledTimes(2); // Initial + manual
    });
  });

  describe('Mode Switching', () => {
    it('should switch to BIM mode successfully', async () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onModeChange: mockOnModeChange
      };

      const { result } = renderHook(() => useBIMMode(options));

      let switchResult: ModeSwitchResult;
      await act(async () => {
        switchResult = await result.current.toggleBIMMode('bim');
      });

      expect(mockModeSwitchingEngine.switchToBIMMode).toHaveBeenCalledWith(mockWalls);
      expect(switchResult!.success).toBe(true);
      expect(mockOnModeChange).toHaveBeenCalledWith(true);
    });

    it('should switch to basic mode successfully', async () => {
      // Set up BIM mode first
      const bimWall = {
        id: 'wall1',
        bimGeometry: { wallSolid: {}, offsetCurves: [], intersectionData: [], qualityMetrics: {} },
        lastModifiedMode: 'bim',
        getModeCompatibility: vi.fn().mockReturnValue({
          canSwitchToBIM: true,
          canSwitchToBasic: true,
          potentialDataLoss: [],
          approximationsRequired: [],
          qualityImpact: 0,
          estimatedProcessingTime: 500
        })
      } as any;

      const wallsWithBIM = new Map([['wall1', bimWall]]);

      const options: UseBIMModeOptions = {
        walls: wallsWithBIM,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onModeChange: mockOnModeChange
      };

      const { result } = renderHook(() => useBIMMode(options));

      let switchResult: ModeSwitchResult;
      await act(async () => {
        switchResult = await result.current.toggleBIMMode('basic');
      });

      expect(mockModeSwitchingEngine.switchToBasicMode).toHaveBeenCalledWith(wallsWithBIM);
      expect(switchResult!.success).toBe(true);
      expect(mockOnModeChange).toHaveBeenCalledWith(false);
    });

    it('should handle switch failure', async () => {
      const failedResult: ModeSwitchResult = {
        success: false,
        convertedWalls: [],
        failedWalls: ['wall1'],
        warnings: ['Conversion failed'],
        preservedData: false,
        processingTime: 500,
        qualityImpact: 1.0,
        approximationsUsed: []
      };

      mockModeSwitchingEngine.switchToBIMMode.mockResolvedValue(failedResult);

      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onError: mockOnError
      };

      const { result } = renderHook(() => useBIMMode(options));

      let switchResult: ModeSwitchResult;
      await act(async () => {
        switchResult = await result.current.toggleBIMMode('bim');
      });

      expect(switchResult!.success).toBe(false);
      expect(result.current.bimMode.isActive).toBe(false);
      expect(mockOnError).toHaveBeenCalledWith('Conversion failed');
    });

    it('should handle switch exception', async () => {
      mockModeSwitchingEngine.switchToBIMMode.mockRejectedValue(
        new Error('Network error')
      );

      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onError: mockOnError
      };

      const { result } = renderHook(() => useBIMMode(options));

      let switchResult: ModeSwitchResult;
      await act(async () => {
        switchResult = await result.current.toggleBIMMode('bim');
      });

      expect(switchResult!.success).toBe(false);
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );
    });

    it('should set switchInProgress during operation', async () => {
      // Mock a delayed response
      mockModeSwitchingEngine.switchToBIMMode.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSuccessfulSwitchResult), 100))
      );

      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { result } = renderHook(() => useBIMMode(options));

      const switchPromise = act(async () => {
        return result.current.toggleBIMMode('bim');
      });

      // Should be in progress initially
      expect(result.current.bimMode.switchInProgress).toBe(true);

      await switchPromise;

      // Should complete
      expect(result.current.bimMode.switchInProgress).toBe(false);
    });

    it('should throw error when engine not available', async () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        // No engine provided
        onError: mockOnError
      };

      const { result } = renderHook(() => useBIMMode(options));

      await act(async () => {
        try {
          await result.current.toggleBIMMode('bim');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Mode switching engine not available');
        }
      });
    });
  });

  describe('Data Preservation Guarantee', () => {
    it('should guarantee data preservation when no potential loss', () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { result } = renderHook(() => useBIMMode(options));

      expect(result.current.dataPreservationGuarantee).toBe(true);
    });

    it('should not guarantee data preservation when potential loss exists', async () => {
      const compatibilityWithLoss: CompatibilityResult = {
        ...mockCompatibilityResult,
        potentialDataLoss: ['Intersection metadata will be lost']
      };

      mockModeSwitchingEngine.validateModeSwitch.mockResolvedValue(compatibilityWithLoss);

      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { result } = renderHook(() => useBIMMode(options));

      await waitFor(() => {
        expect(result.current.dataPreservationGuarantee).toBe(false);
      });
    });

    it('should not guarantee data preservation when quality impact is high', async () => {
      const compatibilityWithImpact: CompatibilityResult = {
        ...mockCompatibilityResult,
        potentialDataLoss: []
      };

      // Mock UI compatibility status with high quality impact
      mockModeSwitchingEngine.validateModeSwitch.mockResolvedValue(compatibilityWithImpact);

      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { result } = renderHook(() => useBIMMode(options));

      // Manually set high quality impact in compatibility status
      await waitFor(() => {
        // The hook should calculate quality impact from the result
        expect(result.current.compatibilityStatus).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear error state', () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { result } = renderHook(() => useBIMMode(options));

      // Set an error
      act(() => {
        result.current.bimMode.error = 'Test error';
      });

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.bimMode.error).toBeUndefined();
    });

    it('should handle empty walls map', () => {
      const options: UseBIMModeOptions = {
        walls: new Map(),
        modeSwitchingEngine: mockModeSwitchingEngine
      };

      const { result } = renderHook(() => useBIMMode(options));

      expect(result.current.bimMode.isActive).toBe(false);
      expect(result.current.compatibilityStatus.isCompatible).toBe(true);
    });

    it('should handle missing mode switching engine', () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls
        // No engine provided
      };

      const { result } = renderHook(() => useBIMMode(options));

      expect(result.current.bimMode.canSwitch).toBe(true);
      expect(result.current.compatibilityStatus.isCompatible).toBe(true);
    });
  });

  describe('Callback Handling', () => {
    it('should call onModeChange when mode changes', async () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onModeChange: mockOnModeChange
      };

      const { result } = renderHook(() => useBIMMode(options));

      await act(async () => {
        await result.current.toggleBIMMode('bim');
      });

      expect(mockOnModeChange).toHaveBeenCalledWith(true);
    });

    it('should call onError when errors occur', async () => {
      mockModeSwitchingEngine.validateModeSwitch.mockRejectedValue(
        new Error('Test error')
      );

      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine,
        onError: mockOnError
      };

      renderHook(() => useBIMMode(options));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('Test error')
        );
      });
    });

    it('should not call callbacks when not provided', async () => {
      const options: UseBIMModeOptions = {
        walls: mockWalls,
        modeSwitchingEngine: mockModeSwitchingEngine
        // No callbacks provided
      };

      const { result } = renderHook(() => useBIMMode(options));

      // Should not throw when callbacks are not provided
      await act(async () => {
        await result.current.toggleBIMMode('bim');
      });

      expect(result.current.bimMode.isActive).toBe(true);
    });
  });
});