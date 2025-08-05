import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IconButton } from '@/components/ui/icon-button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Building } from 'lucide-react'

// Wrapper component to provide tooltip context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

describe('IconButton', () => {
  it('renders with correct icon', () => {
    const mockOnClick = vi.fn()
    
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Test Tooltip"
          onClick={mockOnClick}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    // Check if icon is rendered (Building icon should be present)
    const icon = button.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('handles click events correctly', () => {
    const mockOnClick = vi.fn()
    
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Test Tooltip"
          onClick={mockOnClick}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('applies active state correctly', () => {
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Test Tooltip"
          isActive={true}
          onClick={() => {}}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('applies inactive state correctly', () => {
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Test Tooltip"
          isActive={false}
          onClick={() => {}}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).not.toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('supports different tooltip positions', () => {
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Top Tooltip"
          tooltipSide="top"
          onClick={() => {}}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // Tooltip positioning is handled by Radix UI, so we just verify the component renders
  })

  it('supports custom icon sizes', () => {
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Test Tooltip"
          iconSize={24}
          onClick={() => {}}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    const icon = button.querySelector('svg')
    expect(icon).toHaveAttribute('width', '24')
    expect(icon).toHaveAttribute('height', '24')
  })

  it('supports different button variants', () => {
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Test Tooltip"
          variant="outline"
          onClick={() => {}}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('border', 'border-input')
  })

  it('supports different button sizes', () => {
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Test Tooltip"
          size="lg"
          onClick={() => {}}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-11')
  })

  it('supports custom tooltip delay', () => {
    render(
      <TestWrapper>
        <IconButton
          icon={Building}
          tooltip="Delayed Tooltip"
          tooltipDelay={100}
          onClick={() => {}}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // Tooltip delay is handled by Radix UI, so we just verify the component renders
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    
    render(
      <TestWrapper>
        <IconButton
          ref={ref}
          icon={Building}
          tooltip="Test Tooltip"
          onClick={() => {}}
        />
      </TestWrapper>
    )

    expect(ref).toHaveBeenCalled()
  })
})