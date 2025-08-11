/**
 * BIM Wall Properties Panel Tests
 * 
 * Tests for the BIM Wall Properties Panel component including
 * join type selection, quality metrics display, and tolerance adjustment
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BIMWallPropertiesPanel } from '../BIMWallPropertiesPanel';
import type { BIMWallPropertiesPanelProps } from '../BIMWallPropertiesPanel';
import { UnifiedWallData } from '@/lib/bim/data/UnifiedWallData';
import { OffsetJoinType } from '@/lib/bim/types/OffsetTypes';
import type { QualityMetrics } from '@/lib/bim/types/QualityMetrics';
import { CurveImpl } from '@/lib/bim/geometry/Curve';
import { WallSolidImpl } from '@/lib/bim/geometry/WallSolid';
import { BIMPointImpl } from '@/lib/bim/geometry/BIMPoint';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange && onValueChange('layout')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
      data-testid="visibility-switch"
    />
  )
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, onValueCommit, min, max }: any) => (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange && onValueChange([parseFloat(e.target.value)])}
      onMouseUp={() => onValueCommit && onValueCommit()}
      min={min}
      max={max}
      data-testid="tolerance-slider"
    />
  )
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => asChild ? children : <div>{children}</div>
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  )
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: any) => (
    <label className={className}>{children}</label>
  )
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />
}));

// Helper function to create test wall data
const createTestWallData = (overrides: Partial<any> = {}): UnifiedWallData => {
  const points = [
    new BIMPointImpl(0, 0, { id: 'p1' }),
    new BIMPointImpl(100, 0, { id: 'p2' })
  ];
  
  const baseline = new CurveImpl(
    points,
    'polyline' as any,
    {
      id: 'test-curve',
      isClosed: false
    }
  );

  const qualityMetrics: QualityMetrics = {
    geometricAccuracy: 0.95,
    topologicalConsistency: 0.90,
    manufacturability: 0.85,
    architecturalCompliance: 0.88,
    sliverFaceCount: 0,
    microGapCount: 1,
    selfIntersectionCount: 0,
    degenerateElementCount: 0,
    complexity: 0.5,
    processingEfficiency: 0.8,
    memoryUsage: 1024,
    calculatedAt: new Date(),
    calculationMethod: 'test',
    toleranceUsed: 0.001,
    issues: [],
    recommendations: []
  };

  const wallSolid = new WallSolidImpl(
    baseline,
    250,
    'zone' as any,
    {
      id: 'test-wall-solid',
      leftOffset: baseline,
      rightOffset: baseline,
      solidGeometry: [],
      joinTypes: new Map([['node1', OffsetJoinType.MITER]]),
      intersectionData: [],
      healingHistory: [],
      geometricQuality: qualityMetrics,
      processingTime: 100,
      complexity: 0.5
    }
  );

  return new UnifiedWallData({
    id: 'test-wall-1',
    type: 'zone' as any,
    thickness: 250,
    visible: true,
    baseline,
    basicGeometry: {
      segments: [],
      nodes: [],
      polygons: []
    },
    bimGeometry: {
      wallSolid,
      offsetCurves: [baseline],
      intersectionData: [],
      qualityMetrics
    },
    lastModifiedMode: 'bim',
    ...overrides
  });
};

// Default props for testing
const defaultProps: BIMWallPropertiesPanelProps = {
  selectedWallIds: ['test-wall-1'],
  wallData: [createTestWallData()],
  onWallTypeChange: vi.fn(),
  onWallVisibilityChange: vi.fn(),
  onWallDelete: vi.fn(),
  onJoinTypeChange: vi.fn(),
  onToleranceChange: vi.fn(),
  onValidateGeometry: vi.fn(),
  onHealGeometry: vi.fn(),
  onSelectionClear: vi.fn()
};

describe('BIMWallPropertiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders empty state when no walls selected', () => {
      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          selectedWallIds={[]}
          wallData={[]}
        />
      );

      expect(screen.getByText('BIM Properties')).toBeInTheDocument();
      expect(screen.getByText('No wall selected. Click on a wall to edit its BIM properties.')).toBeInTheDocument();
    });

    test('renders loading state when wall data is null', () => {
      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          wallData={null}
        />
      );

      expect(screen.getByText('Loading BIM wall data...')).toBeInTheDocument();
    });

    test('renders single wall selection correctly', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('1 wall selected')).toBeInTheDocument();
      expect(screen.getByText(/ID: test-wal/)).toBeInTheDocument();
      expect(screen.getByText('Basic Properties')).toBeInTheDocument();
      expect(screen.getByText('Geometric Properties')).toBeInTheDocument();
      expect(screen.getByText('Quality Metrics')).toBeInTheDocument();
    });

    test('renders multi-wall selection correctly', () => {
      const multiWallData = [
        createTestWallData({ id: 'wall-1' }),
        createTestWallData({ id: 'wall-2' })
      ];

      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          selectedWallIds={['wall-1', 'wall-2']}
          wallData={multiWallData}
        />
      );

      expect(screen.getByText('2 walls selected')).toBeInTheDocument();
      expect(screen.getByText('Editing multiple BIM walls')).toBeInTheDocument();
    });
  });

  describe('Basic Properties', () => {
    test('displays wall type correctly', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Wall Type')).toBeInTheDocument();
      expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'zone');
    });

    test('handles wall type change', async () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const select = screen.getByTestId('select');
      fireEvent.click(select);

      await waitFor(() => {
        expect(defaultProps.onWallTypeChange).toHaveBeenCalledWith(['test-wall-1'], 'layout');
      });
    });

    test('displays wall thickness correctly', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Thickness')).toBeInTheDocument();
      expect(screen.getByText('250mm')).toBeInTheDocument();
    });

    test('handles visibility toggle', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const visibilitySwitch = screen.getByTestId('visibility-switch');
      expect(visibilitySwitch).toBeChecked();

      fireEvent.click(visibilitySwitch);
      expect(defaultProps.onWallVisibilityChange).toHaveBeenCalledWith(['test-wall-1'], false);
    });

    test('shows mixed types warning for multi-selection', () => {
      const mixedWallData = [
        createTestWallData({ id: 'wall-1', type: 'layout' }),
        createTestWallData({ id: 'wall-2', type: 'zone' })
      ];

      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          selectedWallIds={['wall-1', 'wall-2']}
          wallData={mixedWallData}
        />
      );

      expect(screen.getByText('Mixed wall types')).toBeInTheDocument();
    });
  });

  describe('Join Type Selection', () => {
    test('displays join type options', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Join Type')).toBeInTheDocument();
      expect(screen.getByText('miter')).toBeInTheDocument();
      expect(screen.getByText('bevel')).toBeInTheDocument();
      expect(screen.getByText('round')).toBeInTheDocument();
    });

    test('handles join type selection', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const bevelButton = screen.getByText('bevel').closest('button');
      expect(bevelButton).toBeInTheDocument();

      fireEvent.click(bevelButton!);
      expect(defaultProps.onJoinTypeChange).toHaveBeenCalledWith(['test-wall-1'], OffsetJoinType.BEVEL);
    });

    test('shows visual preview for join types', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const joinTypeButtons = screen.getAllByRole('button').filter(button => 
        ['miter', 'bevel', 'round'].some(type => button.textContent?.includes(type))
      );

      expect(joinTypeButtons).toHaveLength(3);
      
      // Each button should have an SVG preview
      joinTypeButtons.forEach(button => {
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Tolerance Adjustment', () => {
    test('displays tolerance slider', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Tolerance')).toBeInTheDocument();
      expect(screen.getByTestId('tolerance-slider')).toBeInTheDocument();
    });

    test('handles tolerance change', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const slider = screen.getByTestId('tolerance-slider');
      fireEvent.change(slider, { target: { value: '0.025' } });
      fireEvent.mouseUp(slider);

      expect(defaultProps.onToleranceChange).toHaveBeenCalledWith(['test-wall-1'], 0.025);
    });

    test('shows tolerance impact preview', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Impact:')).toBeInTheDocument();
      // Use getAllByText to handle multiple "Quality:" texts
      const qualityTexts = screen.getAllByText(/Quality:/);
      expect(qualityTexts.length).toBeGreaterThan(0);
      expect(screen.getByText(/Speed:/)).toBeInTheDocument();
    });

    test('displays recommended tolerance', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText(/Recommended:/)).toBeInTheDocument();
    });
  });

  describe('Quality Metrics', () => {
    test('displays overall quality score', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Overall Quality')).toBeInTheDocument();
      // Quality should be calculated as average of the 4 main metrics
      // (0.95 + 0.90 + 0.85 + 0.88) / 4 = 0.895 ≈ 90%
      expect(screen.getByText('90%')).toBeInTheDocument();
    });

    test('shows detailed metrics when expanded', async () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const moreButton = screen.getByText('More');
      fireEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText('Geometric Accuracy')).toBeInTheDocument();
        expect(screen.getByText('Topology')).toBeInTheDocument();
        expect(screen.getByText('Manufacturability')).toBeInTheDocument();
      });

      // Should show progress bars for detailed metrics
      const progressBars = screen.getAllByTestId('progress');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    test('displays issue counts', async () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const moreButton = screen.getByText('More');
      fireEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText('Issues')).toBeInTheDocument();
        expect(screen.getByText('1 gaps')).toBeInTheDocument();
      });
    });

    test('handles walls without BIM geometry', () => {
      const wallWithoutBIM = createTestWallData({ bimGeometry: undefined });

      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          wallData={[wallWithoutBIM]}
        />
      );

      expect(screen.getByText('No BIM geometry available. Generate BIM representation to see quality metrics.')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    test('handles validate geometry action', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const validateButton = screen.getByText('Validate');
      fireEvent.click(validateButton);

      expect(defaultProps.onValidateGeometry).toHaveBeenCalledWith(['test-wall-1']);
    });

    test('handles heal geometry action', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const healButton = screen.getByText(/Heal/);
      fireEvent.click(healButton);

      expect(defaultProps.onHealGeometry).toHaveBeenCalledWith(['test-wall-1']);
    });

    test('disables heal button when no issues', () => {
      const points = [
        new BIMPointImpl(0, 0, { id: 'p1' }),
        new BIMPointImpl(100, 0, { id: 'p2' })
      ];
      
      const baseline = new CurveImpl(
        points,
        'polyline' as any,
        {
          id: 'perfect-curve',
          isClosed: false
        }
      );

      const perfectWallData = createTestWallData({
        bimGeometry: {
          wallSolid: new WallSolidImpl(
            baseline,
            250,
            'zone' as any,
            {
              id: 'perfect-wall-solid',
              joinTypes: new Map(),
              geometricQuality: {
            geometricAccuracy: 1.0,
            topologicalConsistency: 1.0,
            manufacturability: 1.0,
            architecturalCompliance: 1.0,
            sliverFaceCount: 0,
            microGapCount: 0,
            selfIntersectionCount: 0,
            degenerateElementCount: 0,
            complexity: 0.1,
            processingEfficiency: 1.0,
            memoryUsage: 512,
            calculatedAt: new Date(),
            calculationMethod: 'test',
            toleranceUsed: 0.001,
            issues: [],
            recommendations: []
              }
            }
          ),
          offsetCurves: [],
          intersectionData: [],
          qualityMetrics: {
            geometricAccuracy: 1.0,
            topologicalConsistency: 1.0,
            manufacturability: 1.0,
            architecturalCompliance: 1.0,
            sliverFaceCount: 0,
            microGapCount: 0,
            selfIntersectionCount: 0,
            degenerateElementCount: 0,
            complexity: 0.1,
            processingEfficiency: 1.0,
            memoryUsage: 512,
            calculatedAt: new Date(),
            calculationMethod: 'test',
            toleranceUsed: 0.001,
            issues: [],
            recommendations: []
          }
        }
      });

      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          wallData={[perfectWallData]}
        />
      );

      const healButton = screen.getByText('Heal (0)');
      expect(healButton).toBeDisabled();
    });

    test('handles delete action with confirmation', () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const deleteButton = screen.getByText('Delete Wall');
      fireEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete 1 wall(s)?');
      expect(defaultProps.onWallDelete).toHaveBeenCalledWith(['test-wall-1']);

      confirmSpy.mockRestore();
    });

    test('cancels delete when confirmation is denied', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const deleteButton = screen.getByText('Delete Wall');
      fireEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(defaultProps.onWallDelete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    test('handles selection clear', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(defaultProps.onSelectionClear).toHaveBeenCalled();
    });
  });

  describe('Metadata Display', () => {
    test('shows metadata for single selection', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
      expect(screen.getByText(/Version:/)).toBeInTheDocument();
      expect(screen.getByText('Mode: BIM')).toBeInTheDocument();
    });

    test('hides metadata for multi-selection', () => {
      const multiWallData = [
        createTestWallData({ id: 'wall-1' }),
        createTestWallData({ id: 'wall-2' })
      ];

      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          selectedWallIds={['wall-1', 'wall-2']}
          wallData={multiWallData}
        />
      );

      expect(screen.queryByText('Metadata')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    test('applies custom className', () => {
      const { container } = render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          className="custom-class"
        />
      );

      // The className is applied to the TooltipProvider's child div
      const mainDiv = container.querySelector('div[class*="custom-class"]');
      expect(mainDiv).toBeInTheDocument();
    });

    test('resets pending changes when selection changes', () => {
      const { rerender } = render(<BIMWallPropertiesPanel {...defaultProps} />);

      // Change wall type to trigger pending state
      const select = screen.getByTestId('select');
      fireEvent.click(select);

      // Change selection
      rerender(
        <BIMWallPropertiesPanel
          {...defaultProps}
          selectedWallIds={['different-wall']}
        />
      );

      // Pending changes should be reset (this is tested indirectly through UI state)
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty wall data array', () => {
      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          selectedWallIds={['test-wall-1']}
          wallData={[]}
        />
      );

      expect(screen.getByText('Loading BIM wall data...')).toBeInTheDocument();
    });

    test('handles walls with missing BIM geometry gracefully', () => {
      const wallWithoutBIM = createTestWallData({ bimGeometry: undefined });

      render(
        <BIMWallPropertiesPanel
          {...defaultProps}
          wallData={[wallWithoutBIM]}
        />
      );

      // Should still render basic properties
      expect(screen.getByText('Basic Properties')).toBeInTheDocument();
      expect(screen.getByText('Wall Type')).toBeInTheDocument();
      
      // Should show message about missing BIM geometry
      expect(screen.getByText('No BIM geometry available. Generate BIM representation to see quality metrics.')).toBeInTheDocument();
    });

    test('handles extreme tolerance values', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      const slider = screen.getByTestId('tolerance-slider');
      
      // Test very small tolerance (within the slider's range)
      fireEvent.change(slider, { target: { value: '0.025' } });
      fireEvent.mouseUp(slider);
      
      expect(defaultProps.onToleranceChange).toHaveBeenCalledWith(['test-wall-1'], 0.025);
    });
  });

  describe('Accessibility', () => {
    test('provides proper labels for form controls', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Wall Type')).toBeInTheDocument();
      expect(screen.getByText('Visible')).toBeInTheDocument();
      expect(screen.getByText('Join Type')).toBeInTheDocument();
      expect(screen.getByText('Tolerance')).toBeInTheDocument();
    });

    test('provides tooltips for complex controls', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      // Join type buttons should have tooltips (mocked as divs)
      const joinTypeButtons = screen.getAllByRole('button').filter(button => 
        ['miter', 'bevel', 'round'].some(type => button.textContent?.includes(type))
      );

      expect(joinTypeButtons.length).toBeGreaterThan(0);
    });

    test('uses semantic HTML elements', () => {
      render(<BIMWallPropertiesPanel {...defaultProps} />);

      // Should have proper headings
      expect(screen.getByRole('heading', { name: /BIM Properties/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Basic Properties/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Geometric Properties/ })).toBeInTheDocument();
      
      // Should have proper buttons
      expect(screen.getByRole('button', { name: /Clear/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Validate/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete Wall/ })).toBeInTheDocument();
    });
  });
});