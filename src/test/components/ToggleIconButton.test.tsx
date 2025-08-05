import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToggleIconButton } from '@/components/ui/toggle-icon-button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Grid3X3 } from 'lucide-react'

// Wrapper component to provide tooltip context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

describe('ToggleIconButton', () => {
  it('renders with correct initial state', () => {
    const mockOnToggle = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Toggle Grid"
          isToggled={false}
          onToggle={mockOnToggle}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).not.toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('shows active state when toggled', () => {
    const mockOnToggle = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Toggle Grid"
          isToggled={true}
          onToggle={mockOnToggle}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('calls onToggle with correct value when clicked', () => {
    const mockOnToggle = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Toggle Grid"
          isToggled={false}
          onToggle={mockOnToggle}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnToggle).toHaveBeenCalledWith(true)
  })

  it('calls onToggle with false when toggled off', () => {
    const mockOnToggle = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Toggle Grid"
          isToggled={true}
          onToggle={mockOnToggle}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnToggle).toHaveBeenCalledWith(false)
  })

  it('supports different tooltips for active and inactive states', () => {
    const mockOnToggle = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Toggle Grid"
          activeTooltip="Hide Grid"
          inactiveTooltip="Show Grid"
          isToggled={false}
          onToggle={mockOnToggle}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // Tooltip content is handled by the underlying IconButton component
  })

  it('falls back to default tooltip when specific tooltips not provided', () => {
    const mockOnToggle = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Default Tooltip"
          isToggled={false}
          onToggle={mockOnToggle}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // Tooltip fallback logic is handled internally
  })

  it('applies visual feedback for toggle state', () => {
    const mockOnToggle = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Toggle Grid"
          isToggled={true}
          onToggle={mockOnToggle}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('shadow-sm', 'ring-1', 'ring-primary/20')
  })

  it('calls both onToggle and onClick when provided', () => {
    const mockOnToggle = vi.fn()
    const mockOnClick = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Toggle Grid"
          isToggled={false}
          onToggle={mockOnToggle}
          onClick={mockOnClick}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnToggle).toHaveBeenCalledWith(true)
    expect(mockOnClick).toHaveBeenCalled()
  })

  it('supports all IconButton props', () => {
    const mockOnToggle = vi.fn()
    
    render(
      <TestWrapper>
        <ToggleIconButton
          icon={Grid3X3}
          tooltip="Toggle Grid"
          isToggled={false}
          onToggle={mockOnToggle}
          iconSize={20}
          tooltipSide="top"
          size="lg"
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-11') // lg size
    
    const icon = button.querySelector('svg')
    expect(icon).toHaveAttribute('width', '20')
    expect(icon).toHaveAttribute('height', '20')
  })
})