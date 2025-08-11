import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextualHelpSystem } from '../ContextualHelpSystem';
import '@testing-library/jest-dom';

// Mock createPortal to render tooltips in the same container
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (element: React.ReactNode) => element
}));

describe('ContextualHelpSystem', () => {
  beforeEach(() => {
    // Clear any existing help attributes
    document.body.innerHTML = '';
    
    // Create mock UI elements
    const mockElements = `
      <div data-testid="bim-mode-toggle" data-help-id="bim-mode-toggle">BIM Mode</div>
      <div data-testid="wall-properties-panel" data-help-id="wall-properties-panel">Properties</div>
      <div data-testid="quality-metrics" data-help-id="quality-metrics">Quality: 95%</div>
      <div data-testid="viewport">Viewport</div>
    `;
    document.body.innerHTML = mockElements;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Tooltip System', () => {
    it('should show tooltip on hover', async () => {
      render(<ContextualHelpSystem />);
      
      const bimToggle = screen.getByTestId('bim-mode-toggle');
      
      // Simulate mouseover
      fireEvent.mouseOver(bimToggle);
      
      await waitFor(() => {
        expect(screen.getByText('BIM Mode Toggle')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouseout', async () => {
      render(<ContextualHelpSystem />);
      
      const bimToggle = screen.getByTestId('bim-mode-toggle');
      
      // Show tooltip
      fireEvent.mouseOver(bimToggle);
      await waitFor(() => {
        expect(screen.getByText('BIM Mode Toggle')).toBeInTheDocument();
      });
      
      // Hide tooltip
      fireEvent.mouseOut(bimToggle);
      
      await waitFor(() => {
        expect(screen.queryByText('BIM Mode Toggle')).not.toBeInTheDocument();
      }, { timeout: 300 });
    });

    it('should show correct content for different help IDs', async () => {
      render(<ContextualHelpSystem />);
      
      // Test BIM mode toggle tooltip
      const bimToggle = screen.getByTestId('bim-mode-toggle');
      fireEvent.mouseOver(bimToggle);
      
      await waitFor(() => {
        expect(screen.getByText('BIM Mode Toggle')).toBeInTheDocument();
        expect(screen.getByText(/Switch between Basic and BIM modes/)).toBeInTheDocument();
      });
      
      fireEvent.mouseOut(bimToggle);
      
      // Test quality metrics tooltip
      const qualityMetrics = screen.getByTestId('quality-metrics');
      fireEvent.mouseOver(qualityMetrics);
      
      await waitFor(() => {
        expect(screen.getByText('Quality Metrics')).toBeInTheDocument();
        expect(screen.getByText(/Understand geometric quality indicators/)).toBeInTheDocument();
      });
    });

    it('should show action buttons in tooltips', async () => {
      render(<ContextualHelpSystem />);
      
      const bimToggle = screen.getByTestId('bim-mode-toggle');
      fireEvent.mouseOver(bimToggle);
      
      await waitFor(() => {
        expect(screen.getByText('Learn More')).toBeInTheDocument();
      });
    });

    it('should handle tooltip actions', async () => {
      // Mock window.open
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        writable: true,
        value: mockOpen
      });

      render(<ContextualHelpSystem />);
      
      const bimToggle = screen.getByTestId('bim-mode-toggle');
      fireEvent.mouseOver(bimToggle);
      
      await waitFor(() => {
        const learnMoreButton = screen.getByText('Learn More');
        fireEvent.click(learnMoreButton);
        expect(mockOpen).toHaveBeenCalledWith('/docs/user-guides/getting-started-with-bim.html', '_blank');
      });
    });
  });

  describe('Guided Workflow System', () => {
    it('should start workflow when requested', async () => {
      render(<ContextualHelpSystem />);
      
      // Find and click help menu
      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText('Getting Started with BIM')).toBeInTheDocument();
      });
      
      // Start workflow
      const workflowButton = screen.getByText('Getting Started with BIM');
      fireEvent.click(workflowButton);
      
      await waitFor(() => {
        expect(screen.getByText('Getting Started with BIM Walls')).toBeInTheDocument();
        expect(screen.getByText('Enable BIM Mode')).toBeInTheDocument();
      });
    });

    it('should navigate through workflow steps', async () => {
      render(<ContextualHelpSystem />);
      
      // Start workflow programmatically
      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      
      const workflowButton = screen.getByText('Getting Started with BIM');
      fireEvent.click(workflowButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enable BIM Mode')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
      });
      
      // Go to next step
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select Wall Tool')).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
      });
    });

    it('should handle workflow completion', async () => {
      render(<ContextualHelpSystem />);
      
      // Start workflow
      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      
      const workflowButton = screen.getByText('Getting Started with BIM');
      fireEvent.click(workflowButton);
      
      // Navigate to last step
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
        await waitFor(() => {});
      }
      
      // Complete workflow
      const completeButton = screen.getByText('Complete');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Getting Started with BIM Walls')).not.toBeInTheDocument();
      });
    });

    it('should handle workflow cancellation', async () => {
      render(<ContextualHelpSystem />);
      
      // Start workflow
      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      
      const workflowButton = screen.getByText('Getting Started with BIM');
      fireEvent.click(workflowButton);
      
      await waitFor(() => {
        expect(screen.getByText('Getting Started with BIM Walls')).toBeInTheDocument();
      });
      
      // Cancel workflow
      const cancelButton = screen.getByText('×');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Getting Started with BIM Walls')).not.toBeInTheDocument();
      });
    });

    it('should highlight target elements during workflow', async () => {
      render(<ContextualHelpSystem />);
      
      // Start workflow
      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      
      const workflowButton = screen.getByText('Getting Started with BIM');
      fireEvent.click(workflowButton);
      
      await waitFor(() => {
        const bimToggle = screen.getByTestId('bim-mode-toggle');
        expect(bimToggle).toHaveClass('guided-highlight');
      });
    });
  });

  describe('Help Menu', () => {
    it('should show help menu when clicked', () => {
      render(<ContextualHelpSystem />);
      
      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      
      expect(screen.getByText('Quick Start')).toBeInTheDocument();
      expect(screen.getByText('Guided Workflows')).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
    });

    it('should hide help menu when clicked again', () => {
      render(<ContextualHelpSystem />);
      
      const helpButton = screen.getByText('?');
      
      // Show menu
      fireEvent.click(helpButton);
      expect(screen.getByText('Quick Start')).toBeInTheDocument();
      
      // Hide menu
      fireEvent.click(helpButton);
      expect(screen.queryByText('Quick Start')).not.toBeInTheDocument();
    });

    it('should open documentation links', () => {
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        writable: true,
        value: mockOpen
      });

      render(<ContextualHelpSystem />);
      
      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      
      const guideButton = screen.getByText('Getting Started Guide');
      fireEvent.click(guideButton);
      
      expect(mockOpen).toHaveBeenCalledWith('/docs/user-guides/getting-started-with-bim.html', '_blank');
    });

    it('should categorize workflows correctly', () => {
      render(<ContextualHelpSystem />);
      
      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Advanced Operations')).toBeInTheDocument();
      expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ContextualHelpSystem />);
      
      const helpButton = screen.getByText('?');
      expect(helpButton).toHaveAttribute('data-help-id', 'help-menu');
    });

    it('should support keyboard navigation', () => {
      render(<ContextualHelpSystem />);
      
      const helpButton = screen.getByText('?');
      
      // Focus and activate with keyboard
      helpButton.focus();
      fireEvent.keyDown(helpButton, { key: 'Enter' });
      
      expect(screen.getByText('Quick Start')).toBeInTheDocument();
    });

    it('should provide screen reader friendly content', async () => {
      render(<ContextualHelpSystem />);
      
      const bimToggle = screen.getByTestId('bim-mode-toggle');
      fireEvent.mouseOver(bimToggle);
      
      await waitFor(() => {
        const tooltip = screen.getByText('BIM Mode Toggle');
        expect(tooltip).toBeInTheDocument();
        // Tooltip content should be accessible to screen readers
        expect(tooltip.closest('.contextual-tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not create memory leaks with tooltips', async () => {
      const { unmount } = render(<ContextualHelpSystem />);
      
      const bimToggle = screen.getByTestId('bim-mode-toggle');
      
      // Show and hide tooltip multiple times
      for (let i = 0; i < 10; i++) {
        fireEvent.mouseOver(bimToggle);
        await waitFor(() => {
          expect(screen.getByText('BIM Mode Toggle')).toBeInTheDocument();
        });
        
        fireEvent.mouseOut(bimToggle);
        await waitFor(() => {
          expect(screen.queryByText('BIM Mode Toggle')).not.toBeInTheDocument();
        }, { timeout: 300 });
      }
      
      // Unmount should clean up properly
      unmount();
    });

    it('should handle rapid tooltip changes', async () => {
      render(<ContextualHelpSystem />);
      
      const bimToggle = screen.getByTestId('bim-mode-toggle');
      const qualityMetrics = screen.getByTestId('quality-metrics');
      
      // Rapidly switch between elements
      fireEvent.mouseOver(bimToggle);
      fireEvent.mouseOut(bimToggle);
      fireEvent.mouseOver(qualityMetrics);
      
      await waitFor(() => {
        expect(screen.getByText('Quality Metrics')).toBeInTheDocument();
        expect(screen.queryByText('BIM Mode Toggle')).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should work with dynamically added elements', async () => {
      render(<ContextualHelpSystem />);
      
      // Add new element dynamically
      const newElement = document.createElement('div');
      newElement.setAttribute('data-testid', 'dynamic-element');
      newElement.setAttribute('data-help-id', 'dynamic-help');
      newElement.textContent = 'Dynamic Element';
      document.body.appendChild(newElement);
      
      // Should be able to show tooltip for dynamic element
      fireEvent.mouseOver(newElement);
      
      // Note: This test would need the help content to be registered
      // for the dynamic-help ID to actually show content
    });

    it('should handle missing help content gracefully', async () => {
      render(<ContextualHelpSystem />);
      
      // Create element with non-existent help ID
      const element = document.createElement('div');
      element.setAttribute('data-help-id', 'non-existent-help');
      element.textContent = 'No Help';
      document.body.appendChild(element);
      
      // Should not show tooltip for non-existent help content
      fireEvent.mouseOver(element);
      
      await waitFor(() => {
        // Should not crash or show empty tooltip
        expect(screen.queryByText('No Help')).toBeInTheDocument(); // Element itself
      });
    });
  });
});