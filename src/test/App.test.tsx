import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App Component', () => {
  it('renders the main layout components', () => {
    render(<App />)
    
    // Check if main layout elements are present
    expect(screen.getByText('Canvas Area')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('renders menu bar with tooltips', () => {
    render(<App />)
    
    // Menu bar should be present (we can't easily test tooltips without user interaction)
    const menuButtons = screen.getAllByRole('button')
    expect(menuButtons.length).toBeGreaterThan(0)
  })
})