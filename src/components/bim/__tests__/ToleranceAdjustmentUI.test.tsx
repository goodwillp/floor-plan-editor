import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToleranceAdjustmentUI } from '../ToleranceAdjustmentUI';
import { UnifiedWallData } from '../../../lib/bim/data/UnifiedWallData';
import { WallTypeString } from '../../../types/Wall';

// Mock the AdaptiveToleranceManager
jest.mock('../../../lib/bim/engines/AdaptiveToleranceManager', () => ({
  AdaptiveToleranceManager: jest.fn().mockImplementation(() => ({
    calculateTolerance: jest.fn((thickness, precision, angle, context) => {
      // Return different values based on context for testing
      switch (context) {
        case 'vertex_merge': return thickness * 0.001;
        case 'offset_operation': return thickness * 0.005;
        case 'boolean_operation': return thickness * 0.01;
        default: return thickness * 0.005;
      }
    })
  }))
}));

describe('ToleranceAdjustmentUI', () => {
  const mockWallData: UnifiedWallData = {
    id: 'test-wall-1',
    type: 'Layout' as WallTypeString,
    thickness: 10.0,
    visible: true,
    baseline: {
      id: 'baseline-1',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      type: 'polyline' as any,
      isClosed: false,
      length: 100,
      boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 0 },
      curvature: [0, 0],
      tangents: [{ x: 1, y: 0 }, { x: 1, y: 0 }]
    },
    basicGeometry: {
      segments: [],
      nodes: [],
      polygons: []
    },
    isBasicModeValid: true,
    isBIMModeValid: true,
    lastModifiedMode: 'basic' as const,
    requiresSync: false
  };

  const defaultProps = {
    currentTolerance: 0.05,
    onToleranceChange: jest.fn(),
    onApply: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render with basic elements', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} />);
      
      expect(screen.getByText('Tolerance Adjustment')).toBeInTheDocument();
      expect(screen.getByText('Real-time Preview')).toBeInTheDocument();
      expect(screen.getByLabelText('Tolerance Value:')).toBeInTheDocument();
      expect(screen.getByText('Impact Analysis')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should display current tolerance value', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} currentTolerance={0.025} />);
      
      expect(screen.getByText('0.0250')).toBeInTheDocument();
    });

    it('should display wall information when wall data is provided', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} wallData={mockWallData} />);
      
      expect(screen.getByText('Wall Thickness:')).toBeInTheDocument();
      expect(screen.getByText('10.00')).toBeInTheDocument();
    });

    it('should show recommendations when wall data is available', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} wallData={mockWallData} />);
      
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getAllByText('Apply')).toHaveLength(4); // 3 recommendations + main apply button
    });
  });

  describe('Tolerance Slider Interaction', () => {
    it('should update tolerance when slider changes', async () => {
      const onToleranceChange = jest.fn();
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onToleranceChange={onToleranceChange}
          wallData={mockWallData}
          showPreview={true}
        />
      );
      
      const slider = screen.getByLabelText('Tolerance Value:');
      fireEvent.change(slider, { target: { value: '0.075' } });
      
      expect(onToleranceChange).toHaveBeenCalledWith(0.075);
    });

    it('should update tolerance when direct input changes', async () => {
      const user = userEvent.setup();
      const onToleranceChange = jest.fn();
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onToleranceChange={onToleranceChange}
          wallData={mockWallData}
          showPreview={true}
        />
      );
      
      const input = screen.getByDisplayValue('0.0500');
      await user.clear(input);
      await user.type(input, '0.075');
      
      await waitFor(() => {
        expect(onToleranceChange).toHaveBeenCalled();
      });
    });

    it('should not call onToleranceChange when preview is disabled', async () => {
      const user = userEvent.setup();
      const onToleranceChange = jest.fn();
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onToleranceChange={onToleranceChange}
          showPreview={false}
        />
      );
      
      const slider = screen.getByLabelText('Tolerance Value:');
      fireEvent.change(slider, { target: { value: '0.075' } });
      
      expect(onToleranceChange).not.toHaveBeenCalled();
    });
  });

  describe('Tolerance Validation', () => {
    it('should show error for tolerance below minimum', () => {
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          currentTolerance={0.0001}
          wallData={mockWallData}
        />
      );
      
      // The component should show validation error for very small tolerance
      const input = screen.getByDisplayValue('0.0001');
      expect(input).toHaveClass('invalid');
    });

    it('should show warning for large tolerance', () => {
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          currentTolerance={1.0}
          wallData={mockWallData}
        />
      );
      
      expect(screen.getByText(/Large tolerance may affect geometric accuracy/)).toBeInTheDocument();
    });

    it('should show warning for very small tolerance', () => {
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          currentTolerance={0.001}
          wallData={mockWallData}
        />
      );
      
      expect(screen.getByText(/Very small tolerance may cause performance issues/)).toBeInTheDocument();
    });

    it('should disable apply button for invalid tolerance', () => {
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          currentTolerance={0.0001}
          wallData={mockWallData}
        />
      );
      
      const applyButtons = screen.getAllByRole('button', { name: 'Apply' });
      const mainApplyButton = applyButtons[applyButtons.length - 1]; // Last one is the main apply button
      expect(mainApplyButton).toBeDisabled();
    });
  });

  describe('Impact Analysis', () => {
    it('should display impact metrics', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} wallData={mockWallData} />);
      
      expect(screen.getByText('Quality Change:')).toBeInTheDocument();
      expect(screen.getByText('Performance Impact:')).toBeInTheDocument();
      expect(screen.getByText('Affected Operations:')).toBeInTheDocument();
    });

    it('should show affected operations list', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} wallData={mockWallData} />);
      
      expect(screen.getByText('Vertex merging')).toBeInTheDocument();
      expect(screen.getByText('Offset operations')).toBeInTheDocument();
      expect(screen.getByText('Boolean operations')).toBeInTheDocument();
      expect(screen.getByText('Shape healing')).toBeInTheDocument();
    });

    it('should show impact warnings for significant changes', () => {
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          currentTolerance={0.001}
          wallData={mockWallData}
        />
      );
      
      // With a large difference between current and new tolerance, should show warnings
      const input = screen.getByDisplayValue('0.0010');
      fireEvent.change(input, { target: { value: '0.1' } });
      
      expect(screen.getByText(/Significant quality impact expected/)).toBeInTheDocument();
    });
  });

  describe('Recommendations System', () => {
    it('should display tolerance recommendations', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} wallData={mockWallData} />);
      
      expect(screen.getByText('Conservative - High precision, slower performance')).toBeInTheDocument();
      expect(screen.getByText('Balanced - Good precision and performance')).toBeInTheDocument();
      expect(screen.getByText('Performance - Faster operations, lower precision')).toBeInTheDocument();
    });

    it('should apply recommendation when clicked', async () => {
      const user = userEvent.setup();
      const onToleranceChange = jest.fn();
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onToleranceChange={onToleranceChange}
          wallData={mockWallData}
          showPreview={true}
        />
      );
      
      const applyButtons = screen.getAllByText('Apply');
      const recommendationApplyButton = applyButtons[0]; // First recommendation apply button
      
      await user.click(recommendationApplyButton);
      
      expect(onToleranceChange).toHaveBeenCalled();
    });

    it('should show confidence levels for recommendations', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} wallData={mockWallData} />);
      
      expect(screen.getByText('90% confidence')).toBeInTheDocument();
      expect(screen.getByText('95% confidence')).toBeInTheDocument();
      expect(screen.getByText('80% confidence')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should call onApply when apply button is clicked', async () => {
      const user = userEvent.setup();
      const onApply = jest.fn().mockResolvedValue(undefined);
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onApply={onApply}
          currentTolerance={0.05}
        />
      );
      
      // Change tolerance using slider for more predictable behavior
      const slider = screen.getByLabelText('Tolerance Value:');
      fireEvent.change(slider, { target: { value: '0.075' } });
      
      const applyButtons = screen.getAllByRole('button', { name: 'Apply' });
      const mainApplyButton = applyButtons[applyButtons.length - 1]; // Last one is the main apply button
      await user.click(mainApplyButton);
      
      expect(onApply).toHaveBeenCalledWith(0.075);
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();
      
      render(<ToleranceAdjustmentUI {...defaultProps} onCancel={onCancel} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });

    it('should reset tolerance when reset button is clicked', async () => {
      const user = userEvent.setup();
      const onToleranceChange = jest.fn();
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onToleranceChange={onToleranceChange}
          currentTolerance={0.05}
          showPreview={true}
        />
      );
      
      // Change tolerance
      const input = screen.getByDisplayValue('0.0500');
      await user.clear(input);
      await user.type(input, '0.075');
      
      // Reset
      const resetButton = screen.getByRole('button', { name: 'Reset' });
      await user.click(resetButton);
      
      expect(onToleranceChange).toHaveBeenCalledWith(0.05);
    });

    it('should disable buttons during apply operation', async () => {
      const user = userEvent.setup();
      const onApply = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onApply={onApply}
          currentTolerance={0.05}
        />
      );
      
      // Change tolerance
      const input = screen.getByDisplayValue('0.0500');
      await user.clear(input);
      await user.type(input, '0.075');
      
      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await user.click(applyButton);
      
      // Buttons should be disabled during operation
      expect(screen.getByRole('button', { name: 'Applying...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    });
  });

  describe('Preview Toggle', () => {
    it('should toggle preview mode', async () => {
      const user = userEvent.setup();
      const onToleranceChange = jest.fn();
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onToleranceChange={onToleranceChange}
          showPreview={true}
        />
      );
      
      const previewCheckbox = screen.getByRole('checkbox');
      expect(previewCheckbox).toBeChecked();
      
      await user.click(previewCheckbox);
      expect(previewCheckbox).not.toBeChecked();
      
      // Now changes shouldn't trigger preview
      const slider = screen.getByLabelText('Tolerance Value:');
      fireEvent.change(slider, { target: { value: '0.075' } });
      
      expect(onToleranceChange).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle tolerance bounds correctly', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} wallData={mockWallData} />);
      
      const slider = screen.getByLabelText('Tolerance Value:');
      expect(slider).toHaveAttribute('min');
      expect(slider).toHaveAttribute('max');
      
      // Check that bounds are reasonable for the wall thickness
      const min = parseFloat(slider.getAttribute('min') || '0');
      const max = parseFloat(slider.getAttribute('max') || '0');
      
      expect(min).toBeGreaterThan(0);
      expect(max).toBeLessThan(mockWallData.thickness);
    });

    it('should update when currentTolerance prop changes', () => {
      const { rerender } = render(<ToleranceAdjustmentUI {...defaultProps} currentTolerance={0.05} />);
      
      expect(screen.getByDisplayValue('0.0500')).toBeInTheDocument();
      
      rerender(<ToleranceAdjustmentUI {...defaultProps} currentTolerance={0.075} />);
      
      expect(screen.getByDisplayValue('0.0750')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      const user = userEvent.setup();
      
      render(<ToleranceAdjustmentUI {...defaultProps} />);
      
      const input = screen.getByDisplayValue('0.0500');
      await user.clear(input);
      await user.type(input, 'invalid');
      
      // Component should not crash and should handle invalid input
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    });

    it('should handle apply operation failure', async () => {
      const user = userEvent.setup();
      const onApply = jest.fn().mockRejectedValue(new Error('Apply failed'));
      
      render(
        <ToleranceAdjustmentUI 
          {...defaultProps} 
          onApply={onApply}
          currentTolerance={0.05}
        />
      );
      
      // Change tolerance
      const slider = screen.getByLabelText('Tolerance Value:');
      fireEvent.change(slider, { target: { value: '0.075' } });
      
      const applyButtons = screen.getAllByRole('button', { name: 'Apply' });
      const mainApplyButton = applyButtons[applyButtons.length - 1];
      
      // Click and catch the error
      try {
        await user.click(mainApplyButton);
      } catch (error) {
        // Expected to fail
      }
      
      // Should handle the error and reset button state
      await waitFor(() => {
        const updatedApplyButtons = screen.getAllByRole('button', { name: 'Apply' });
        const updatedMainApplyButton = updatedApplyButtons[updatedApplyButtons.length - 1];
        expect(updatedMainApplyButton).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ToleranceAdjustmentUI {...defaultProps} />);
      
      expect(screen.getByLabelText('Tolerance Value:')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<ToleranceAdjustmentUI {...defaultProps} />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('checkbox')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Tolerance Value:')).toHaveFocus();
    });
  });
});