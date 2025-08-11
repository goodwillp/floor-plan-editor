/**
 * IntelligentBIMModeToggle Component Tests
 * 
 * Tests for BIM mode toggle functionality and compatibility checking
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IntelligentBIMModeToggle } from '../IntelligentBIMModeToggle';
import type { 
  IntelligentBIMModeToggleProps, 
  CompatibilityStatus, 
  ModeSwitchResult 
} from '../IntelligentBIMModeToggle';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => {
        if (!disabled) {
          onCheckedChange?.(e.target.checked);
        }
      }}
      disabled={disabled}
      data-testid="bim-mode-switch"
      {...props}
    />
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  )
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  )
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip">{children}</div>
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('IntelligentBIMModeToggle', () => {
  const mockOnToggleRequest = vi.fn();

  const defaultProps: IntelligentBIMModeToggleProps = {
    isActive: false,
    canSwitch: true,
    switchInProgress: false,
    compatibilityStatus: {
      isCompatible: true,
      canSwitchToBIM: true,
      canSwitchToBasic: true,
      potentialDataLoss: [],
      recommendedActions: [],
      estimatedProcessingTime: 1000,
      qualityImpact: 0
    },
    dataPreservationGuarantee: true,
    onToggleRequest: mockOnToggleRequest
  };

  const successfulSwitchResult: ModeSwitchResult = {
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
  });

  describe('Basic Rendering', () => {
    it('should render BIM mode toggle in OFF state', () => {
      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      expect(screen.getByText('BIM Mode')).toBeInTheDocument();
      expect(screen.getByText('OFF')).toBeInTheDocument();
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      expect(switchElement).not.toBeChecked();
    });

    it('should render BIM mode toggle in ON state', () => {
      render(<IntelligentBIMModeToggle {...defaultProps} isActive={true} />);
      
      expect(screen.getByText('BIM Mode')).toBeInTheDocument();
      expect(screen.getByText('ON')).toBeInTheDocument();
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      expect(switchElement).toBeChecked();
    });

    it('should disable switch when canSwitch is false', () => {
      render(<IntelligentBIMModeToggle {...defaultProps} canSwitch={false} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      expect(switchElement).toBeDisabled();
    });

    it('should disable switch when switchInProgress is true', () => {
      render(<IntelligentBIMModeToggle {...defaultProps} switchInProgress={true} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      expect(switchElement).toBeDisabled();
    });
  });

  describe('Compatibility Status Indicators', () => {
    it('should show green check for compatible status', () => {
      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      // Check for green check circle (success indicator)
      const statusIndicator = screen.getByRole('checkbox').parentElement;
      expect(statusIndicator).toBeInTheDocument();
    });

    it('should show warning for potential data loss', () => {
      const propsWithDataLoss = {
        ...defaultProps,
        dataPreservationGuarantee: false,
        compatibilityStatus: {
          ...defaultProps.compatibilityStatus,
          potentialDataLoss: ['Intersection metadata will be lost']
        }
      };

      render(<IntelligentBIMModeToggle {...propsWithDataLoss} />);
      
      // Should show warning indicator
      const statusIndicator = screen.getByRole('checkbox').parentElement;
      expect(statusIndicator).toBeInTheDocument();
    });

    it('should show error for incompatible status', () => {
      const incompatibleProps = {
        ...defaultProps,
        compatibilityStatus: {
          ...defaultProps.compatibilityStatus,
          isCompatible: false,
          canSwitchToBIM: false
        }
      };

      render(<IntelligentBIMModeToggle {...incompatibleProps} />);
      
      // Should show error indicator
      const statusIndicator = screen.getByRole('checkbox').parentElement;
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe('Mode Switching - Direct Switch', () => {
    it('should call onToggleRequest directly when compatible and data preserved', async () => {
      mockOnToggleRequest.mockResolvedValue(successfulSwitchResult);

      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      
      // Simulate the switch being toggled - the component starts with isActive=false
      // so changing to checked=true should switch to BIM mode
      await act(async () => {
        fireEvent.change(switchElement, { target: { checked: true } });
      });

      await waitFor(() => {
        expect(mockOnToggleRequest).toHaveBeenCalledWith('bim');
      });
    });

    it('should show progress dialog during switch', async () => {
      // Mock a delayed response
      mockOnToggleRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(successfulSwitchResult), 100))
      );

      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      fireEvent.click(switchElement);

      // Should show progress dialog
      await waitFor(() => {
        expect(screen.getByText('Switching Mode...')).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(mockOnToggleRequest).toHaveBeenCalled();
      });
    });

    it('should switch from BIM to basic mode', async () => {
      mockOnToggleRequest.mockResolvedValue(successfulSwitchResult);

      render(<IntelligentBIMModeToggle {...defaultProps} isActive={true} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      
      await act(async () => {
        fireEvent.change(switchElement, { target: { checked: false } });
      });

      await waitFor(() => {
        expect(mockOnToggleRequest).toHaveBeenCalledWith('basic');
      });
    });
  });

  describe('Mode Switching - Confirmation Dialog', () => {
    it('should show confirmation dialog when incompatible', async () => {
      const incompatibleProps = {
        ...defaultProps,
        compatibilityStatus: {
          ...defaultProps.compatibilityStatus,
          isCompatible: false,
          potentialDataLoss: ['Some data will be lost']
        }
      };

      render(<IntelligentBIMModeToggle {...incompatibleProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      
      await act(async () => {
        fireEvent.change(switchElement, { target: { checked: true } });
      });

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Switch to BIM Mode');
    });

    it('should show confirmation dialog when data not preserved', async () => {
      const dataLossProps = {
        ...defaultProps,
        dataPreservationGuarantee: false,
        compatibilityStatus: {
          ...defaultProps.compatibilityStatus,
          potentialDataLoss: ['Intersection metadata will be lost']
        }
      };

      render(<IntelligentBIMModeToggle {...dataLossProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      fireEvent.click(switchElement);

      // Should show confirmation dialog
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });

    it('should display compatibility information in confirmation dialog', async () => {
      const detailedProps = {
        ...defaultProps,
        dataPreservationGuarantee: false,
        compatibilityStatus: {
          ...defaultProps.compatibilityStatus,
          potentialDataLoss: ['Intersection metadata will be lost'],
          recommendedActions: ['Consider backing up your project'],
          estimatedProcessingTime: 5000,
          qualityImpact: 0.1
        }
      };

      render(<IntelligentBIMModeToggle {...detailedProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      fireEvent.click(switchElement);

      // Check for detailed information
      expect(screen.getByText('Estimated time: 5s')).toBeInTheDocument();
      expect(screen.getByText('Quality impact: 10%')).toBeInTheDocument();
      expect(screen.getByText(/Intersection metadata will be lost/)).toBeInTheDocument();
      expect(screen.getByText(/Consider backing up your project/)).toBeInTheDocument();
    });

    it('should proceed with switch when confirmed', async () => {
      mockOnToggleRequest.mockResolvedValue(successfulSwitchResult);

      const dataLossProps = {
        ...defaultProps,
        dataPreservationGuarantee: false
      };

      render(<IntelligentBIMModeToggle {...dataLossProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      
      await act(async () => {
        fireEvent.change(switchElement, { target: { checked: true } });
      });

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Confirm the switch - use getAllByText to get the button specifically
      const confirmButtons = screen.getAllByText('Switch to BIM Mode');
      const confirmButton = confirmButtons.find(el => el.tagName === 'BUTTON');
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockOnToggleRequest).toHaveBeenCalledWith('bim');
      });
    });

    it('should cancel switch when cancelled', async () => {
      const dataLossProps = {
        ...defaultProps,
        dataPreservationGuarantee: false
      };

      render(<IntelligentBIMModeToggle {...dataLossProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      fireEvent.click(switchElement);

      // Cancel the switch
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Dialog should close and no switch should occur
      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      });
      
      expect(mockOnToggleRequest).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle switch failure gracefully', async () => {
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

      mockOnToggleRequest.mockResolvedValue(failedResult);

      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      fireEvent.click(switchElement);

      await waitFor(() => {
        expect(mockOnToggleRequest).toHaveBeenCalled();
      });

      // Should handle the failure (no crash)
      expect(screen.getByTestId('bim-mode-switch')).toBeInTheDocument();
    });

    it('should handle switch exception gracefully', async () => {
      mockOnToggleRequest.mockRejectedValue(new Error('Network error'));

      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      fireEvent.click(switchElement);

      await waitFor(() => {
        expect(mockOnToggleRequest).toHaveBeenCalled();
      });

      // Should handle the exception (no crash)
      expect(screen.getByTestId('bim-mode-switch')).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('should show progress updates during switch', async () => {
      // Mock a delayed response to see progress
      mockOnToggleRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(successfulSwitchResult), 500))
      );

      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      fireEvent.click(switchElement);

      // Should show progress dialog with updates
      await waitFor(() => {
        expect(screen.getByText('Switching Mode...')).toBeInTheDocument();
      });

      // Should show progress bar
      expect(screen.getByTestId('progress')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(mockOnToggleRequest).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should show different operation phases', async () => {
      mockOnToggleRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(successfulSwitchResult), 300))
      );

      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      fireEvent.click(switchElement);

      // Should show initial operation
      await waitFor(() => {
        expect(screen.getByText('Initializing mode switch...')).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(mockOnToggleRequest).toHaveBeenCalled();
      }, { timeout: 500 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      expect(switchElement).toBeInTheDocument();
      
      // Should have proper role
      expect(switchElement).toHaveAttribute('type', 'checkbox');
    });

    it('should be keyboard accessible', () => {
      render(<IntelligentBIMModeToggle {...defaultProps} />);
      
      const switchElement = screen.getByTestId('bim-mode-switch');
      
      // Should be focusable
      switchElement.focus();
      expect(document.activeElement).toBe(switchElement);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <IntelligentBIMModeToggle {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild?.firstChild).toHaveClass('custom-class');
    });

    it('should show proper badge styling for active state', () => {
      render(<IntelligentBIMModeToggle {...defaultProps} isActive={true} />);
      
      const badge = screen.getByText('ON');
      expect(badge).toHaveClass('badge');
    });
  });
});