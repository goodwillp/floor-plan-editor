import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import App from '@/App'

/**
 * Complete application workflow integration tests
 * Requirements: All requirements final validation
 */

// Mock complex components to focus on workflow
vi.mock('@/components/DrawingCanvas', () => ({
  DrawingCanvas: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      loadReferenceImage: vi.fn().mockResolvedValue(undefined),
      toggleReferenceImageLock: vi.fn().mockReturnValue(true),
      toggleReferenceImageVisibility: vi.fn().mockReturnValue(true),
    }))
    
    return (
      <div 
        data-testid="drawing-canvas"
        onClick={() => {
          if (props.onWallCreated) props.onWallCreated('wall-1')
          if (props.onWallSelected) props.onWallSelected(['wall-1'], [{ id: 'wall-1', type: 'layout' }])
        }}
        onMouseMove={() => {
          if (props.onMouseMove) props.onMouseMove({ x: 100, y: 100 })
        }}
      >
        Drawing Canvas - Active Tool: {props.activeTool} - Wall Type: {props.activeWallType}
      </div>
    )
  })
}))

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    errorLog: [],
    memoryInfo: { percentage: 0.3 },
    isRecovering: false,
    errorStats: { totalErrors: 0 },
    clearErrorLog: vi.fn(),
    setMemoryThresholds: vi.fn()
  })
}))

vi.mock('@/components/PerformanceMonitor', () => ({
  PerformanceMonitor: ({ onEnablePerformanceMode, onDisablePerformanceMode }: any) => (
    <div data-testid="performance-monitor">
      <button onClick={onEnablePerformanceMode}>Enable Performance Mode</button>
      <button onClick={onDisablePerformanceMode}>Disable Performance Mode</button>
    </div>
  ),
  usePerformanceMonitor: () => ({
    frameStats: { fps: 60, frameTime: 16.67 },
    memoryStats: { used: 50, total: 100 }
  })
}))

vi.mock('@/lib/KeyboardShortcuts', () => ({
  KeyboardShortcutManager: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    getShortcutGroups: vi.fn(() => [
      {
        category: 'File',
        shortcuts: [
          { key: 's', ctrlKey: true, description: 'Save' },
          { key: 'o', ctrlKey: true, description: 'Open' }
        ]
      }
    ]),
    destroy: vi.fn()
  })),
  createDefaultShortcuts: vi.fn(() => [])
}))

vi.mock('@/lib/AccessibilityManager', () => ({
  AccessibilityManager: vi.fn().mockImplementation(() => ({
    destroy: vi.fn()
  }))
}))

describe('Complete Application Workflow', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('should complete a full floor plan creation workflow', async () => {
    const { container } = render(<App />)
    
    // 1. Application should load with default state
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    expect(screen.getByText(/Active Tool: select/)).toBeInTheDocument()
    expect(screen.getByText(/Wall Type: layout/)).toBeInTheDocument()

    // 2. Switch to drawing tool
    const drawButton = screen.getByRole('button', { name: /draw wall/i })
    await user.click(drawButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Active Tool: draw/)).toBeInTheDocument()
    })

    // 3. Change wall type to zone
    const zoneButton = screen.getByRole('button', { name: /zone wall/i })
    await user.click(zoneButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Wall Type: zone/)).toBeInTheDocument()
    })

    // 4. Draw a wall by clicking on canvas
    const canvas = screen.getByTestId('drawing-canvas')
    await user.click(canvas)
    
    // 5. Verify wall creation feedback
    await waitFor(() => {
      expect(screen.getByText(/Wall created: wall-1/)).toBeInTheDocument()
    })

    // 6. Switch to select tool and select the wall
    const selectButton = screen.getByRole('button', { name: /select tool/i })
    await user.click(selectButton)
    await user.click(canvas)
    
    await waitFor(() => {
      expect(screen.getByText(/Selected 1 wall/)).toBeInTheDocument()
    })

    // 7. Toggle grid visibility
    const gridButton = screen.getByRole('button', { name: /toggle grid/i })
    await user.click(gridButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Grid visible/)).toBeInTheDocument()
    })

    // 8. Test zoom functionality
    const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
    await user.click(zoomInButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Zoomed in/)).toBeInTheDocument()
    })

    // 9. Test reference image loading
    const imageInput = screen.getByLabelText(/load reference image/i)
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    await user.upload(imageInput, file)
    
    await waitFor(() => {
      expect(screen.getByText(/Reference image loaded: test.png/)).toBeInTheDocument()
    })

    // 10. Verify status bar updates
    expect(screen.getByText(/100, 100/)).toBeInTheDocument() // Mouse coordinates
    expect(screen.getByText(/1 selected/)).toBeInTheDocument() // Selection count
  })

  it('should handle error scenarios gracefully', async () => {
    const { container } = render(<App />)
    
    // Test error handling by triggering various edge cases
    const canvas = screen.getByTestId('drawing-canvas')
    
    // Rapid clicking should not cause issues
    for (let i = 0; i < 10; i++) {
      await user.click(canvas)
    }
    
    // Application should remain stable
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    expect(container).toBeInTheDocument()
  })

  it('should validate all wall type requirements', async () => {
    render(<App />)
    
    // Test Layout wall (350mm) - Requirement 1.1
    const layoutButton = screen.getByRole('button', { name: /layout wall.*350mm/i })
    await user.click(layoutButton)
    expect(screen.getByText(/Wall Type: layout/)).toBeInTheDocument()
    
    // Test Zone wall (250mm) - Requirement 1.2
    const zoneButton = screen.getByRole('button', { name: /zone wall.*250mm/i })
    await user.click(zoneButton)
    expect(screen.getByText(/Wall Type: zone/)).toBeInTheDocument()
    
    // Test Area wall (150mm) - Requirement 1.3
    const areaButton = screen.getByRole('button', { name: /area wall.*150mm/i })
    await user.click(areaButton)
    expect(screen.getByText(/Wall Type: area/)).toBeInTheDocument()
  })

  it('should validate tool functionality requirements', async () => {
    render(<App />)
    
    // Test tool switching - Requirement 11.1-11.4
    const tools = ['select', 'draw', 'move', 'delete']
    
    for (const tool of tools) {
      const button = screen.getByRole('button', { name: new RegExp(tool, 'i') })
      await user.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Active Tool: ${tool}`, 'i'))).toBeInTheDocument()
      })
    }
  })

  it('should validate viewport and zoom requirements', async () => {
    render(<App />)
    
    // Test zoom in - Requirement 12.1
    const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
    await user.click(zoomInButton)
    expect(screen.getByText(/Zoomed in/)).toBeInTheDocument()
    
    // Test zoom out - Requirement 12.2
    const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
    await user.click(zoomOutButton)
    expect(screen.getByText(/Zoomed out/)).toBeInTheDocument()
    
    // Test view reset - Requirement 12.4
    const resetButton = screen.getByRole('button', { name: /reset.*view/i })
    await user.click(resetButton)
    expect(screen.getByText(/View reset/)).toBeInTheDocument()
  })

  it('should validate grid system requirements', async () => {
    render(<App />)
    
    // Test grid toggle - Requirement 10.1-10.2
    const gridButton = screen.getByRole('button', { name: /toggle grid/i })
    
    // Grid should start inactive - Requirement 10.4
    expect(screen.queryByText(/Grid visible/)).not.toBeInTheDocument()
    
    // Toggle grid on
    await user.click(gridButton)
    expect(screen.getByText(/Grid visible/)).toBeInTheDocument()
    
    // Toggle grid off
    await user.click(gridButton)
    expect(screen.getByText(/Grid hidden/)).toBeInTheDocument()
  })

  it('should validate reference image requirements', async () => {
    render(<App />)
    
    // Test image loading - Requirement 13.1
    const imageInput = screen.getByLabelText(/load reference image/i)
    const file = new File(['test'], 'floor-plan.jpg', { type: 'image/jpeg' })
    await user.upload(imageInput, file)
    
    await waitFor(() => {
      expect(screen.getByText(/Reference image loaded: floor-plan.jpg/)).toBeInTheDocument()
    })
    
    // Test image lock toggle - Requirement 13.3-13.4
    const lockButton = screen.getByRole('button', { name: /lock.*reference/i })
    await user.click(lockButton)
    expect(screen.getByText(/Reference image unlocked/)).toBeInTheDocument()
    
    // Test image visibility toggle
    const visibilityButton = screen.getByRole('button', { name: /toggle.*reference.*visibility/i })
    await user.click(visibilityButton)
    expect(screen.getByText(/Reference image hidden/)).toBeInTheDocument()
  })

  it('should validate performance monitoring requirements', async () => {
    render(<App />)
    
    // Show performance monitor
    const performanceButton = screen.getByRole('button', { name: /performance/i })
    await user.click(performanceButton)
    
    expect(screen.getByTestId('performance-monitor')).toBeInTheDocument()
    
    // Test performance mode toggle
    const enableButton = screen.getByRole('button', { name: /enable performance mode/i })
    await user.click(enableButton)
    expect(screen.getByText(/Performance mode enabled/)).toBeInTheDocument()
    
    const disableButton = screen.getByRole('button', { name: /disable performance mode/i })
    await user.click(disableButton)
    expect(screen.getByText(/Performance mode disabled/)).toBeInTheDocument()
  })

  it('should validate keyboard shortcuts functionality', async () => {
    render(<App />)
    
    // Test keyboard shortcuts dialog
    const shortcutsButton = screen.getByRole('button', { name: /shortcuts/i })
    await user.click(shortcutsButton)
    
    // Dialog should open with shortcuts
    await waitFor(() => {
      expect(screen.getByText(/Keyboard Shortcuts/)).toBeInTheDocument()
    })
  })

  it('should validate accessibility features', async () => {
    render(<App />)
    
    // Check for skip links
    expect(screen.getByText(/Skip to canvas/)).toBeInTheDocument()
    expect(screen.getByText(/Skip to tools/)).toBeInTheDocument()
    expect(screen.getByText(/Skip to sidebar/)).toBeInTheDocument()
    
    // Check for proper ARIA labels
    expect(screen.getByLabelText(/toggle grid/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument()
  })

  it('should maintain application stability under stress', async () => {
    render(<App />)
    
    // Rapid tool switching
    const tools = ['select', 'draw', 'move', 'delete']
    for (let i = 0; i < 20; i++) {
      const tool = tools[i % tools.length]
      const button = screen.getByRole('button', { name: new RegExp(tool, 'i') })
      await user.click(button)
    }
    
    // Rapid wall type switching
    const wallTypes = ['layout', 'zone', 'area']
    for (let i = 0; i < 15; i++) {
      const wallType = wallTypes[i % wallTypes.length]
      const button = screen.getByRole('button', { name: new RegExp(`${wallType} wall`, 'i') })
      await user.click(button)
    }
    
    // Application should remain stable
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    expect(screen.getByText(/Ready|Wall created|Selected/)).toBeInTheDocument()
  })
})