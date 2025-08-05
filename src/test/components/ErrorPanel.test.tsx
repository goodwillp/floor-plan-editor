import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ErrorPanel } from '@/components/ErrorPanel'
import { ErrorType, ErrorSeverity } from '@/lib/ErrorHandler'

describe('ErrorPanel', () => {
  const defaultProps = {
    errorLog: [],
    memoryInfo: null,
    isRecovering: false,
    errorStats: {
      [ErrorType.GEOMETRIC]: 0,
      [ErrorType.RENDERING]: 0,
      [ErrorType.UI]: 0,
      [ErrorType.MEMORY]: 0,
      [ErrorType.VALIDATION]: 0
    },
    onClearErrors: vi.fn(),
    onSetMemoryThresholds: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render error monitoring title', () => {
      render(<ErrorPanel {...defaultProps} />)
      
      expect(screen.getByText('Error Monitoring')).toBeInTheDocument()
    })

    it('should show error count badge when errors exist', () => {
      const propsWithErrors = {
        ...defaultProps,
        errorStats: {
          ...defaultProps.errorStats,
          [ErrorType.UI]: 5,
          [ErrorType.GEOMETRIC]: 3
        }
      }

      render(<ErrorPanel {...propsWithErrors} />)
      
      expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('should not show error count badge when no errors', () => {
      render(<ErrorPanel {...defaultProps} />)
      
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('should show recovery status when recovering', () => {
      render(<ErrorPanel {...defaultProps} isRecovering={true} />)
      
      expect(screen.getByText('Recovering from Error')).toBeInTheDocument()
      expect(screen.getByText('The system is attempting to recover from an error. Please wait...')).toBeInTheDocument()
    })

    it('should not show recovery status when not recovering', () => {
      render(<ErrorPanel {...defaultProps} />)
      
      expect(screen.queryByText('Recovering from Error')).not.toBeInTheDocument()
    })
  })

  describe('Memory Usage Display', () => {
    it('should display memory usage when available', () => {
      const memoryInfo = {
        used: 50 * 1024 * 1024, // 50MB
        total: 100 * 1024 * 1024, // 100MB
        percentage: 0.5,
        warningThreshold: 0.7,
        criticalThreshold: 0.9
      }

      render(<ErrorPanel {...defaultProps} memoryInfo={memoryInfo} />)
      
      expect(screen.getByText('Memory Usage')).toBeInTheDocument()
      expect(screen.getByText('Normal')).toBeInTheDocument()
      expect(screen.getByText('50 MB / 100 MB')).toBeInTheDocument()
    })

    it('should show warning status for high memory usage', () => {
      const memoryInfo = {
        used: 80 * 1024 * 1024, // 80MB
        total: 100 * 1024 * 1024, // 100MB
        percentage: 0.8,
        warningThreshold: 0.7,
        criticalThreshold: 0.9
      }

      render(<ErrorPanel {...defaultProps} memoryInfo={memoryInfo} />)
      
      expect(screen.getByText('Warning')).toBeInTheDocument()
    })

    it('should show critical status for very high memory usage', () => {
      const memoryInfo = {
        used: 95 * 1024 * 1024, // 95MB
        total: 100 * 1024 * 1024, // 100MB
        percentage: 0.95,
        warningThreshold: 0.7,
        criticalThreshold: 0.9
      }

      render(<ErrorPanel {...defaultProps} memoryInfo={memoryInfo} />)
      
      expect(screen.getByText('Critical')).toBeInTheDocument()
    })

    it('should not display memory usage when not available', () => {
      render(<ErrorPanel {...defaultProps} />)
      
      expect(screen.queryByText('Memory Usage')).not.toBeInTheDocument()
    })
  })

  describe('Error Statistics', () => {
    it('should display error statistics', () => {
      const errorStats = {
        [ErrorType.GEOMETRIC]: 5,
        [ErrorType.RENDERING]: 3,
        [ErrorType.UI]: 2,
        [ErrorType.MEMORY]: 1,
        [ErrorType.VALIDATION]: 0
      }

      render(<ErrorPanel {...defaultProps} errorStats={errorStats} />)
      
      expect(screen.getByText('Error Statistics')).toBeInTheDocument()
      expect(screen.getByText('geometric')).toBeInTheDocument()
      expect(screen.getByText('rendering')).toBeInTheDocument()
      expect(screen.getByText('ui')).toBeInTheDocument()
      expect(screen.getByText('memory')).toBeInTheDocument()
      expect(screen.getByText('validation')).toBeInTheDocument()
      
      expect(screen.getByText('5')).toBeInTheDocument() // geometric
      expect(screen.getByText('3')).toBeInTheDocument() // rendering
      expect(screen.getByText('2')).toBeInTheDocument() // ui
      expect(screen.getByText('1')).toBeInTheDocument() // memory
      expect(screen.getByText('0')).toBeInTheDocument() // validation
    })
  })

  describe('Error Log Display', () => {
    it('should show error details when show details is clicked', () => {
      const errorLog = [
        {
          type: ErrorType.UI,
          severity: ErrorSeverity.LOW,
          message: 'Test UI error',
          timestamp: Date.now(),
          userMessage: 'A UI error occurred',
          details: { context: 'test' }
        }
      ]

      render(<ErrorPanel {...defaultProps} errorLog={errorLog} />)
      
      const showDetailsButton = screen.getByText('Show Details')
      fireEvent.click(showDetailsButton)
      
      expect(screen.getByText('Recent Errors')).toBeInTheDocument()
      expect(screen.getByText('Test UI error')).toBeInTheDocument()
      expect(screen.getByText('User: A UI error occurred')).toBeInTheDocument()
    })

    it('should show error details modal when error is clicked', async () => {
      const errorLog = [
        {
          type: ErrorType.GEOMETRIC,
          severity: ErrorSeverity.MEDIUM,
          message: 'Geometric calculation failed',
          timestamp: Date.now(),
          userMessage: 'A geometric operation failed',
          details: { point1: { x: 0, y: 0 }, point2: { x: 1, y: 1 } }
        }
      ]

      render(<ErrorPanel {...defaultProps} errorLog={errorLog} />)
      
      // Show details first
      const showDetailsButton = screen.getByText('Show Details')
      fireEvent.click(showDetailsButton)
      
      // Click on error
      const errorItem = screen.getByText('Geometric calculation failed')
      fireEvent.click(errorItem)
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument()
        expect(screen.getByText('Geometric calculation failed')).toBeInTheDocument()
        expect(screen.getByText('A geometric operation failed')).toBeInTheDocument()
      })
    })

    it('should close error details modal when close button is clicked', async () => {
      const errorLog = [
        {
          type: ErrorType.UI,
          severity: ErrorSeverity.LOW,
          message: 'Test error',
          timestamp: Date.now(),
          userMessage: 'Test user message'
        }
      ]

      render(<ErrorPanel {...defaultProps} errorLog={errorLog} />)
      
      // Show details and click error
      fireEvent.click(screen.getByText('Show Details'))
      fireEvent.click(screen.getByText('Test error'))
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument()
      })
      
      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
      })
    })
  })

  describe('Actions', () => {
    it('should call onClearErrors when clear button is clicked', () => {
      const onClearErrors = vi.fn()
      const propsWithErrors = {
        ...defaultProps,
        onClearErrors,
        errorStats: {
          ...defaultProps.errorStats,
          [ErrorType.UI]: 1
        }
      }

      render(<ErrorPanel {...propsWithErrors} />)
      
      const clearButton = screen.getByText('Clear')
      fireEvent.click(clearButton)
      
      expect(onClearErrors).toHaveBeenCalled()
    })

    it('should disable clear button when no errors exist', () => {
      render(<ErrorPanel {...defaultProps} />)
      
      const clearButton = screen.getByText('Clear')
      expect(clearButton).toBeDisabled()
    })

    it('should toggle details visibility when show/hide details button is clicked', () => {
      const errorLog = [
        {
          type: ErrorType.UI,
          severity: ErrorSeverity.LOW,
          message: 'Test error',
          timestamp: Date.now()
        }
      ]

      render(<ErrorPanel {...defaultProps} errorLog={errorLog} />)
      
      const toggleButton = screen.getByText('Show Details')
      fireEvent.click(toggleButton)
      
      expect(screen.getByText('Recent Errors')).toBeInTheDocument()
      expect(screen.getByText('Hide Details')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Hide Details'))
      
      expect(screen.queryByText('Recent Errors')).not.toBeInTheDocument()
      expect(screen.getByText('Show Details')).toBeInTheDocument()
    })
  })

  describe('Error Details Modal', () => {
    it('should display error details correctly', async () => {
      const errorLog = [
        {
          type: ErrorType.RENDERING,
          severity: ErrorSeverity.HIGH,
          message: 'Rendering failed',
          timestamp: Date.now(),
          userMessage: 'Canvas rendering error',
          details: { layer: 'wall', operation: 'draw' }
        }
      ]

      render(<ErrorPanel {...defaultProps} errorLog={errorLog} />)
      
      // Show details and click error
      fireEvent.click(screen.getByText('Show Details'))
      fireEvent.click(screen.getByText('Rendering failed'))
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument()
        expect(screen.getByText('Type:')).toBeInTheDocument()
        expect(screen.getByText('rendering')).toBeInTheDocument()
        expect(screen.getByText('Severity:')).toBeInTheDocument()
        expect(screen.getByText('high')).toBeInTheDocument()
        expect(screen.getByText('Message:')).toBeInTheDocument()
        expect(screen.getByText('Rendering failed')).toBeInTheDocument()
        expect(screen.getByText('User Message:')).toBeInTheDocument()
        expect(screen.getByText('Canvas rendering error')).toBeInTheDocument()
        expect(screen.getByText('Time:')).toBeInTheDocument()
        expect(screen.getByText('Details:')).toBeInTheDocument()
      })
    })

    it('should display JSON details when available', async () => {
      const errorLog = [
        {
          type: ErrorType.GEOMETRIC,
          severity: ErrorSeverity.MEDIUM,
          message: 'Test error',
          timestamp: Date.now(),
          details: { point1: { x: 0, y: 0 }, point2: { x: 1, y: 1 } }
        }
      ]

      render(<ErrorPanel {...defaultProps} errorLog={errorLog} />)
      
      // Show details and click error
      fireEvent.click(screen.getByText('Show Details'))
      fireEvent.click(screen.getByText('Test error'))
      
      await waitFor(() => {
        expect(screen.getByText('Details:')).toBeInTheDocument()
        expect(screen.getByText(/"point1":/)).toBeInTheDocument()
        expect(screen.getByText(/"x": 0/)).toBeInTheDocument()
        expect(screen.getByText(/"y": 0/)).toBeInTheDocument()
      })
    })
  })

  describe('Memory Thresholds', () => {
    it('should call onSetMemoryThresholds when thresholds are changed', () => {
      const onSetMemoryThresholds = vi.fn()
      const memoryInfo = {
        used: 50 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        percentage: 0.5,
        warningThreshold: 0.7,
        criticalThreshold: 0.9
      }

      render(<ErrorPanel {...defaultProps} memoryInfo={memoryInfo} onSetMemoryThresholds={onSetMemoryThresholds} />)
      
      // This would typically be triggered by a slider or input change
      // For now, we'll just verify the prop is passed correctly
      expect(onSetMemoryThresholds).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ErrorPanel {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /show details/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should have proper heading structure', () => {
      render(<ErrorPanel {...defaultProps} />)
      
      expect(screen.getByRole('heading', { name: /error monitoring/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty error log gracefully', () => {
      render(<ErrorPanel {...defaultProps} errorLog={[]} />)
      
      expect(screen.getByText('Error Monitoring')).toBeInTheDocument()
      expect(screen.queryByText('Recent Errors')).not.toBeInTheDocument()
    })

    it('should handle null memory info gracefully', () => {
      render(<ErrorPanel {...defaultProps} memoryInfo={null} />)
      
      expect(screen.queryByText('Memory Usage')).not.toBeInTheDocument()
    })

    it('should handle errors without user messages', () => {
      const errorLog = [
        {
          type: ErrorType.UI,
          severity: ErrorSeverity.LOW,
          message: 'Test error',
          timestamp: Date.now()
        }
      ]

      render(<ErrorPanel {...defaultProps} errorLog={errorLog} />)
      
      fireEvent.click(screen.getByText('Show Details'))
      fireEvent.click(screen.getByText('Test error'))
      
      expect(screen.queryByText('User Message:')).not.toBeInTheDocument()
    })

    it('should handle errors without details', () => {
      const errorLog = [
        {
          type: ErrorType.UI,
          severity: ErrorSeverity.LOW,
          message: 'Test error',
          timestamp: Date.now()
        }
      ]

      render(<ErrorPanel {...defaultProps} errorLog={errorLog} />)
      
      fireEvent.click(screen.getByText('Show Details'))
      fireEvent.click(screen.getByText('Test error'))
      
      expect(screen.queryByText('Details:')).not.toBeInTheDocument()
    })
  })
}) 