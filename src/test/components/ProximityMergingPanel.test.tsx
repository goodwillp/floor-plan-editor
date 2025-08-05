import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProximityMergingPanel } from '@/components/ProximityMergingPanel'
import type { ProximityMerge } from '@/lib/ProximityMergingService'

describe('ProximityMergingPanel', () => {
  const mockProps = {
    isEnabled: false,
    proximityThreshold: 15,
    activeMerges: [],
    mergeStats: {
      totalMerges: 0,
      averageDistance: 0,
      mergesByType: {}
    },
    onEnabledChange: vi.fn(),
    onThresholdChange: vi.fn(),
    onRefresh: vi.fn(),
    onClearAll: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render proximity merging panel', () => {
      render(<ProximityMergingPanel {...mockProps} />)

      expect(screen.getByText('Proximity Merging')).toBeInTheDocument()
      expect(screen.getByText('Enable Merging')).toBeInTheDocument()
    })

    it('should show disabled state correctly', () => {
      render(<ProximityMergingPanel {...mockProps} />)

      const enableSwitch = screen.getByRole('switch')
      expect(enableSwitch).not.toBeChecked()
      
      // Should show help text when disabled
      expect(screen.getByText(/Enable proximity merging to automatically detect/)).toBeInTheDocument()
    })

    it('should show enabled state correctly', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      const enableSwitch = screen.getByRole('switch')
      expect(enableSwitch).toBeChecked()
      
      // Should show threshold slider when enabled
      expect(screen.getByText(/Proximity Threshold:/)).toBeInTheDocument()
    })
  })

  describe('Threshold Control', () => {
    it('should display current threshold value', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          proximityThreshold={25}
        />
      )

      expect(screen.getByText('Proximity Threshold: 25px')).toBeInTheDocument()
    })

    it('should show threshold range indicators', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      expect(screen.getByText('5px')).toBeInTheDocument()
      expect(screen.getByText('50px')).toBeInTheDocument()
    })

    it('should call onThresholdChange when slider changes', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: '30' } })

      expect(mockProps.onThresholdChange).toHaveBeenCalled()
    })
  })

  describe('Statistics Display', () => {
    it('should display merge statistics', () => {
      const mergeStats = {
        totalMerges: 3,
        averageDistance: 12.5,
        mergesByType: {
          visual: 3
        }
      }

      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          mergeStats={mergeStats}
        />
      )

      expect(screen.getByText('3')).toBeInTheDocument() // Total merges badge
      expect(screen.getByText('12.5px')).toBeInTheDocument() // Average distance
      expect(screen.getByText('3')).toBeInTheDocument() // Visual merges count
    })

    it('should show zero statistics when no merges', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      expect(screen.getByText('0')).toBeInTheDocument() // Total merges
    })

    it('should display different merge types', () => {
      const mergeStats = {
        totalMerges: 5,
        averageDistance: 10,
        mergesByType: {
          visual: 3,
          physical: 2
        }
      }

      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          mergeStats={mergeStats}
        />
      )

      expect(screen.getByText('Visual:')).toBeInTheDocument()
      expect(screen.getByText('Physical:')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should show refresh button when enabled', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })

    it('should show clear all button when there are merges', () => {
      const mockMerges: ProximityMerge[] = [{
        id: 'merge_1',
        wall1Id: 'wall1',
        wall2Id: 'wall2',
        mergeType: 'visual',
        distance: 10,
        segments: [],
        createdAt: new Date()
      }]

      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          activeMerges={mockMerges}
          mergeStats={{ totalMerges: 1, averageDistance: 10, mergesByType: { visual: 1 } }}
        />
      )

      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    it('should call onRefresh when refresh button clicked', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      expect(mockProps.onRefresh).toHaveBeenCalled()
    })

    it('should call onClearAll when clear all button clicked', () => {
      const mockMerges: ProximityMerge[] = [{
        id: 'merge_1',
        wall1Id: 'wall1',
        wall2Id: 'wall2',
        mergeType: 'visual',
        distance: 10,
        segments: [],
        createdAt: new Date()
      }]

      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          activeMerges={mockMerges}
          mergeStats={{ totalMerges: 1, averageDistance: 10, mergesByType: { visual: 1 } }}
        />
      )

      const clearButton = screen.getByText('Clear All')
      fireEvent.click(clearButton)

      expect(mockProps.onClearAll).toHaveBeenCalled()
    })
  })

  describe('Advanced Settings', () => {
    it('should toggle advanced settings', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      // Click settings button to show advanced
      const settingsButton = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsButton)

      expect(screen.getByText('Advanced Settings')).toBeInTheDocument()
      expect(screen.getByText(/Proximity merging creates visual connections/)).toBeInTheDocument()
    })

    it('should show merge type legend in advanced settings', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      // Show advanced settings
      const settingsButton = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsButton)

      expect(screen.getByText('Merge Types:')).toBeInTheDocument()
      expect(screen.getByText('Same wall types')).toBeInTheDocument()
      expect(screen.getByText('Different wall types')).toBeInTheDocument()
    })

    it('should show active merges list in advanced mode', () => {
      const mockMerges: ProximityMerge[] = [
        {
          id: 'merge_1',
          wall1Id: 'wall_12345678',
          wall2Id: 'wall_87654321',
          mergeType: 'visual',
          distance: 10.5,
          segments: [{ seg1Id: 'seg1', seg2Id: 'seg2', distance: 10.5, mergePoints: [] }],
          createdAt: new Date()
        }
      ]

      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          activeMerges={mockMerges}
          mergeStats={{ totalMerges: 1, averageDistance: 10.5, mergesByType: { visual: 1 } }}
        />
      )

      // Show advanced settings
      const settingsButton = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsButton)

      expect(screen.getByText('Active Merges')).toBeInTheDocument()
      expect(screen.getByText('wall_123... ↔ wall_876...')).toBeInTheDocument()
      expect(screen.getByText('11px')).toBeInTheDocument() // Rounded distance
      expect(screen.getByText('1 segment pair(s)')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onEnabledChange when switch is toggled', () => {
      render(<ProximityMergingPanel {...mockProps} />)

      const enableSwitch = screen.getByRole('switch')
      fireEvent.click(enableSwitch)

      expect(mockProps.onEnabledChange).toHaveBeenCalledWith(true)
    })

    it('should handle multiple rapid interactions', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      const refreshButton = screen.getByText('Refresh')
      
      // Click multiple times rapidly
      fireEvent.click(refreshButton)
      fireEvent.click(refreshButton)
      fireEvent.click(refreshButton)

      expect(mockProps.onRefresh).toHaveBeenCalledTimes(3)
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels and roles', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      expect(screen.getByRole('switch')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })

    it('should have proper heading structure', () => {
      render(<ProximityMergingPanel {...mockProps} />)

      expect(screen.getByRole('heading', { name: /proximity merging/i })).toBeInTheDocument()
    })

    it('should provide informative help text', () => {
      render(<ProximityMergingPanel {...mockProps} />)

      expect(screen.getByText(/Enable proximity merging to automatically detect/)).toBeInTheDocument()
    })
  })

  describe('Visual States', () => {
    it('should show different visual states based on merge count', () => {
      const { rerender } = render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
        />
      )

      // No merges - should not show clear button
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument()

      // With merges - should show clear button
      const mockMerges: ProximityMerge[] = [{
        id: 'merge_1',
        wall1Id: 'wall1',
        wall2Id: 'wall2',
        mergeType: 'visual',
        distance: 10,
        segments: [],
        createdAt: new Date()
      }]

      rerender(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          activeMerges={mockMerges}
          mergeStats={{ totalMerges: 1, averageDistance: 10, mergesByType: { visual: 1 } }}
        />
      )

      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    it('should show appropriate badges and indicators', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          mergeStats={{ totalMerges: 5, averageDistance: 12, mergesByType: { visual: 5 } }}
        />
      )

      // Should show badge with merge count
      const badge = screen.getByText('5')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty merge stats gracefully', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          mergeStats={{ totalMerges: 0, averageDistance: 0, mergesByType: {} }}
        />
      )

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should handle very large numbers in statistics', () => {
      render(
        <ProximityMergingPanel 
          {...mockProps} 
          isEnabled={true}
          mergeStats={{ 
            totalMerges: 999, 
            averageDistance: 123.456789, 
            mergesByType: { visual: 999 } 
          }}
        />
      )

      expect(screen.getByText('999')).toBeInTheDocument()
      expect(screen.getByText('123.46px')).toBeInTheDocument() // Should be rounded
    })

    it('should handle missing callback functions', () => {
      const propsWithoutCallbacks = {
        ...mockProps,
        onEnabledChange: undefined,
        onThresholdChange: undefined,
        onRefresh: undefined,
        onClearAll: undefined
      }

      // Should not crash when callbacks are missing
      expect(() => {
        render(<ProximityMergingPanel {...propsWithoutCallbacks} />)
      }).not.toThrow()
    })
  })
})