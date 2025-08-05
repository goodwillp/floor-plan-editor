import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ButtonGroup } from '@/components/ui/button-group'
import { Button } from '@/components/ui/button'

describe('ButtonGroup', () => {
  it('renders children correctly', () => {
    render(
      <ButtonGroup>
        <Button>Button 1</Button>
        <Button>Button 2</Button>
      </ButtonGroup>
    )

    expect(screen.getByText('Button 1')).toBeInTheDocument()
    expect(screen.getByText('Button 2')).toBeInTheDocument()
  })

  it('applies horizontal orientation by default', () => {
    render(
      <ButtonGroup data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('button-group')
    expect(group).toHaveClass('flex', 'items-center')
    expect(group).not.toHaveClass('flex-col')
  })

  it('applies vertical orientation when specified', () => {
    render(
      <ButtonGroup orientation="vertical" data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('button-group')
    expect(group).toHaveClass('flex-col')
  })

  it('applies correct spacing classes', () => {
    const { rerender } = render(
      <ButtonGroup spacing="none" data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    let group = screen.getByTestId('button-group')
    expect(group).toHaveClass('gap-0')

    rerender(
      <ButtonGroup spacing="sm" data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )
    group = screen.getByTestId('button-group')
    expect(group).toHaveClass('gap-1')

    rerender(
      <ButtonGroup spacing="md" data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )
    group = screen.getByTestId('button-group')
    expect(group).toHaveClass('gap-2')

    rerender(
      <ButtonGroup spacing="lg" data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )
    group = screen.getByTestId('button-group')
    expect(group).toHaveClass('gap-3')
  })

  it('applies separator styles for horizontal orientation', () => {
    render(
      <ButtonGroup separator data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('button-group')
    expect(group).toHaveClass('border-r', 'border-border', 'pr-2', 'mr-2')
  })

  it('applies separator styles for vertical orientation', () => {
    render(
      <ButtonGroup orientation="vertical" separator data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('button-group')
    expect(group).toHaveClass('border-b', 'border-border', 'pb-2', 'mb-2')
  })

  it('does not apply separator styles when separator is false', () => {
    render(
      <ButtonGroup separator={false} data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('button-group')
    expect(group).not.toHaveClass('border-r', 'border-border', 'pr-2', 'mr-2')
  })

  it('applies custom className', () => {
    render(
      <ButtonGroup className="custom-class" data-testid="button-group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('button-group')
    expect(group).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    render(
      <ButtonGroup data-testid="button-group" role="group" aria-label="Test group">
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('button-group')
    expect(group).toHaveAttribute('role', 'group')
    expect(group).toHaveAttribute('aria-label', 'Test group')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    
    render(
      <ButtonGroup ref={ref}>
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('combines all styling options correctly', () => {
    render(
      <ButtonGroup 
        orientation="vertical" 
        spacing="lg" 
        separator 
        className="custom-class"
        data-testid="button-group"
      >
        <Button>Button 1</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('button-group')
    expect(group).toHaveClass(
      'flex',
      'items-center',
      'flex-col',
      'gap-3',
      'border-b',
      'border-border',
      'pb-2',
      'mb-2',
      'custom-class'
    )
  })
})