import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import App from '../App'

// Mock all complex components to avoid initialization issues
vi.mock('@/components/DrawingCanvas', () => ({
  DrawingCanvas: React.forwardRef(() => <div data-testid="drawing-canvas">Canvas Area</div>)
}))

vi.mock('@/components/MenuBar', () => ({
  MenuBar: () => <div data-testid="menu-bar" role="banner">Menu Bar</div>
}))

vi.mock('@/components/ToolPalette', () => ({
  ToolPalette: () => <div data-testid="tool-palette">Tool Palette</div>
}))

vi.mock('@/components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" role="complementary">Sidebar</div>
}))

vi.mock('@/components/StatusBar', () => ({
  StatusBar: ({ message }: { message: string }) => <div data-testid="status-bar" role="contentinfo">{message}</div>
}))

vi.mock('@/components/PerformanceMonitor', () => ({
  PerformanceMonitor: () => <div data-testid="performance-monitor">Performance Monitor</div>,
  usePerformanceMonitor: () => ({
    frameStats: { fps: 60, frameTime: 16.67 },
    memoryStats: { used: 50, total: 100 }
  })
}))

vi.mock('@/components/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelp: () => <div data-testid="keyboard-shortcuts">Keyboard Shortcuts</div>
}))

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    errorLog: [],
    memoryInfo: { percentage: 0.5 },
    isRecovering: false,
    errorStats: { totalErrors: 0 },
    clearErrorLog: vi.fn(),
    setMemoryThresholds: vi.fn()
  })
}))

vi.mock('@/lib/KeyboardShortcuts', () => ({
  KeyboardShortcutManager: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    getShortcutGroups: vi.fn(() => []),
    destroy: vi.fn()
  })),
  createDefaultShortcuts: vi.fn(() => [])
}))

vi.mock('@/lib/AccessibilityManager', () => ({
  AccessibilityManager: vi.fn().mockImplementation(() => ({
    destroy: vi.fn()
  }))
}))

describe('App Component', () => {
  it('renders the main layout components', () => {
    render(<App />)
    
    // Check if main layout elements are present
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByTestId('menu-bar')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('renders menu bar with tooltips', () => {
    render(<App />)
    
    // Menu bar should be present
    expect(screen.getByTestId('menu-bar')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    
    // Status bar should show ready message
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })
})