/**
 * BIMStatusBar Component Tests
 * 
 * Tests for BIM status bar showing geometric quality and performance metrics
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { BIMStatusBar } from '../BIMStatusBar';
import type { 
  BIMStatusBarProps, 
  QualityMetrics, 
  PerformanceMetrics 
} from '../BIMStatusBar';

// Mock the UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="quality-badge">
      {children}
    </span>
  )
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

describe('BIMStatusBar', () => {
  const mockQualityMetrics: QualityMetrics = {
    geometricAccuracy: 0.95,
    topologicalConsistency: 0.98,
    manufacturability: 0.90,
    architecturalCompliance: 0.92,
    sliverFaceCount: 0,
    microGapCount: 0,
    selfIntersectionCount: 0,
    degenerateElementCount: 0
  };

  const mockPerformanceMetrics: PerformanceMetrics = {
    lastOperationTime: 150,
    averageOperationTime: 200,
    memoryUsage: 2048,
    cacheHitRate: 0.85,
    operationsPerSecond: 25
  };

  const defaultProps: BIMStatusBarProps = {
    bimModeActive: true,
    overallQuality: 0.94,
    wallCount: 12,
    intersectionCount: 8,
    issueCount: 0,
    qualityMetrics: mockQualityMetrics,
    performanceMetrics: mockPerformanceMetrics
  };

  describe('Visibility Control', () => {
    it('should render when BIM mode is active', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('BIM')).toBeInTheDocument();
      expect(screen.getByText('12 walls')).toBeInTheDocument();
    });

    it('should not render when BIM mode is inactive', () => {
      render(<BIMStatusBar {...defaultProps} bimModeActive={false} />);
      
      expect(screen.queryByText('BIM')).not.toBeInTheDocument();
    });
  });

  describe('Basic Information Display', () => {
    it('should display BIM mode indicator', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('BIM')).toBeInTheDocument();
    });

    it('should display wall count', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('12 walls')).toBeInTheDocument();
    });

    it('should display intersection count when present', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('8 intersections')).toBeInTheDocument();
    });

    it('should not display intersection count when zero', () => {
      render(<BIMStatusBar {...defaultProps} intersectionCount={0} />);
      
      expect(screen.queryByText('intersections')).not.toBeInTheDocument();
    });

    it('should display current operation when provided', () => {
      render(<BIMStatusBar {...defaultProps} currentOperation="Generating offset curves" />);
      
      expect(screen.getByText('Generating offset curves')).toBeInTheDocument();
    });
  });

  describe('Quality Badge Display', () => {
    it('should display excellent quality badge for high quality with no issues', () => {
      render(<BIMStatusBar {...defaultProps} overallQuality={0.95} issueCount={0} />);
      
      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveTextContent('95%');
      expect(badge).toHaveClass('bg-green-600');
    });

    it('should display good quality badge for good quality with few issues', () => {
      render(<BIMStatusBar {...defaultProps} overallQuality={0.85} issueCount={2} />);
      
      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveTextContent('85%');
      expect(badge).toHaveClass('bg-blue-600');
    });

    it('should display fair quality badge for moderate quality', () => {
      render(<BIMStatusBar {...defaultProps} overallQuality={0.75} issueCount={4} />);
      
      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveTextContent('75%');
      expect(badge).toHaveClass('bg-amber-600');
    });

    it('should display poor quality badge for low quality', () => {
      render(<BIMStatusBar {...defaultProps} overallQuality={0.60} issueCount={10} />);
      
      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveTextContent('60%');
      expect(badge).toHaveAttribute('variant', 'destructive');
    });
  });

  describe('Quality Metrics Display', () => {
    it('should display geometric accuracy', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('Accuracy:')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should display topological consistency', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('Topology:')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
    });

    it('should display sliver face count when present', () => {
      const propsWithSlivers = {
        ...defaultProps,
        qualityMetrics: {
          ...mockQualityMetrics,
          sliverFaceCount: 3
        }
      };

      render(<BIMStatusBar {...propsWithSlivers} />);
      
      expect(screen.getByText('Slivers:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not display sliver face count when zero', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.queryByText('Slivers:')).not.toBeInTheDocument();
    });

    it('should display self-intersection count when present', () => {
      const propsWithIntersections = {
        ...defaultProps,
        qualityMetrics: {
          ...mockQualityMetrics,
          selfIntersectionCount: 2
        }
      };

      render(<BIMStatusBar {...propsWithIntersections} />);
      
      expect(screen.getByText('Self-Int:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not display self-intersection count when zero', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.queryByText('Self-Int:')).not.toBeInTheDocument();
    });
  });

  describe('Performance Metrics Display', () => {
    it('should display last operation time', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('Last Op:')).toBeInTheDocument();
      expect(screen.getByText('150ms')).toBeInTheDocument();
    });

    it('should display memory usage in KB', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('2KB')).toBeInTheDocument();
    });

    it('should display cache hit rate when present', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should not display cache hit rate when zero', () => {
      const propsWithoutCache = {
        ...defaultProps,
        performanceMetrics: {
          ...mockPerformanceMetrics,
          cacheHitRate: 0
        }
      };

      render(<BIMStatusBar {...propsWithoutCache} />);
      
      // Should not show cache hit rate section
      expect(screen.queryByText('85%')).not.toBeInTheDocument();
    });

    it('should display operations per second when present', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      expect(screen.getByText('25 ops/s')).toBeInTheDocument();
    });

    it('should not display operations per second when zero', () => {
      const propsWithoutOps = {
        ...defaultProps,
        performanceMetrics: {
          ...mockPerformanceMetrics,
          operationsPerSecond: 0
        }
      };

      render(<BIMStatusBar {...propsWithoutOps} />);
      
      expect(screen.queryByText('ops/s')).not.toBeInTheDocument();
    });
  });

  describe('Quality Indicator Colors', () => {
    it('should show green color for good metrics', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      // Accuracy should be green (95% > 80% threshold)
      const accuracyValue = screen.getByText('95%');
      expect(accuracyValue).toHaveClass('text-green-600');
    });

    it('should show amber color for warning metrics', () => {
      const propsWithWarning = {
        ...defaultProps,
        qualityMetrics: {
          ...mockQualityMetrics,
          geometricAccuracy: 0.75 // Between 60% and 80%
        }
      };

      render(<BIMStatusBar {...propsWithWarning} />);
      
      const accuracyValue = screen.getByText('75%');
      expect(accuracyValue).toHaveClass('text-amber-600');
    });

    it('should show red color for critical metrics', () => {
      const propsWithCritical = {
        ...defaultProps,
        qualityMetrics: {
          ...mockQualityMetrics,
          geometricAccuracy: 0.50 // Below 60% threshold
        }
      };

      render(<BIMStatusBar {...propsWithCritical} />);
      
      const accuracyValue = screen.getByText('50%');
      expect(accuracyValue).toHaveClass('text-red-600');
    });

    it('should show red color for high count metrics', () => {
      const propsWithHighCounts = {
        ...defaultProps,
        qualityMetrics: {
          ...mockQualityMetrics,
          sliverFaceCount: 10 // High count
        }
      };

      render(<BIMStatusBar {...propsWithHighCounts} />);
      
      const sliverValue = screen.getByText('10');
      expect(sliverValue).toHaveClass('text-red-600');
    });
  });

  describe('Performance Indicator Colors', () => {
    it('should show green color for fast operations', () => {
      const propsWithFastOps = {
        ...defaultProps,
        performanceMetrics: {
          ...mockPerformanceMetrics,
          lastOperationTime: 50 // Fast operation
        }
      };

      render(<BIMStatusBar {...propsWithFastOps} />);
      
      const timeValue = screen.getByText('50ms');
      expect(timeValue).toHaveClass('text-green-600');
    });

    it('should show amber color for moderate operations', () => {
      const propsWithModerateOps = {
        ...defaultProps,
        performanceMetrics: {
          ...mockPerformanceMetrics,
          lastOperationTime: 300 // Moderate operation
        }
      };

      render(<BIMStatusBar {...propsWithModerateOps} />);
      
      const timeValue = screen.getByText('300ms');
      expect(timeValue).toHaveClass('text-amber-600');
    });

    it('should show red color for slow operations', () => {
      const propsWithSlowOps = {
        ...defaultProps,
        performanceMetrics: {
          ...mockPerformanceMetrics,
          lastOperationTime: 1000 // Slow operation
        }
      };

      render(<BIMStatusBar {...propsWithSlowOps} />);
      
      const timeValue = screen.getByText('1000ms');
      expect(timeValue).toHaveClass('text-red-600');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <BIMStatusBar {...defaultProps} className="custom-status-bar" />
      );
      
      expect(container.firstChild).toHaveClass('custom-status-bar');
    });

    it('should have proper BIM-specific styling', () => {
      const { container } = render(<BIMStatusBar {...defaultProps} />);
      
      expect(container.firstChild).toHaveClass('bg-blue-50/50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero wall count', () => {
      render(<BIMStatusBar {...defaultProps} wallCount={0} />);
      
      expect(screen.getByText('0 walls')).toBeInTheDocument();
    });

    it('should handle very high quality values', () => {
      render(<BIMStatusBar {...defaultProps} overallQuality={1.0} />);
      
      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveTextContent('100%');
    });

    it('should handle very low quality values', () => {
      render(<BIMStatusBar {...defaultProps} overallQuality={0.0} />);
      
      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveTextContent('0%');
    });

    it('should handle missing optional props', () => {
      const minimalProps = {
        bimModeActive: true,
        overallQuality: 0.8,
        wallCount: 5,
        intersectionCount: 0,
        issueCount: 0,
        qualityMetrics: mockQualityMetrics,
        performanceMetrics: mockPerformanceMetrics
      };

      render(<BIMStatusBar {...minimalProps} />);
      
      expect(screen.getByText('BIM')).toBeInTheDocument();
      expect(screen.getByText('5 walls')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(<BIMStatusBar {...defaultProps} />);
      
      // Should have proper container structure
      expect(container.firstChild).toHaveClass('flex');
    });

    it('should provide tooltips for metrics', () => {
      render(<BIMStatusBar {...defaultProps} />);
      
      // Tooltips should be present (mocked as divs)
      const tooltips = screen.getAllByTestId('tooltip');
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });
});