import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from '@/components/StatusBar'

describe('StatusBar Component', () => {
  it('renders default message when no message provided', () => {
    render(<StatusBar />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('renders custom message', () => {
    render(<StatusBar message="Custom message" />)
    expect(screen.getByText('Custom message')).toBeInTheDocument()
  })

  it('displays coordinates when provided', () => {
    render(<StatusBar coordinates={{ x: 100, y: 200 }} />)
    expect(screen.getByText('X: 100, Y: 200')).toBeInTheDocument()
  })

  it('displays zoom level when provided', () => {
    render(<StatusBar zoom={1.5} />)
    expect(screen.getByText('Zoom: 150%')).toBeInTheDocument()
  })

  it('displays selected count', () => {
    render(<StatusBar selectedCount={3} />)
    expect(screen.getByText('3 items selected')).toBeInTheDocument()
  })

  it('displays singular form for single selection', () => {
    render(<StatusBar selectedCount={1} />)
    expect(screen.getByText('1 item selected')).toBeInTheDocument()
  })

  it('does not display selection count when zero', () => {
    render(<StatusBar selectedCount={0} />)
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })
})