/**
 * Complete application workflow end-to-end tests
 * Tests the entire application from user perspective
 * Requirements: All requirements final validation
 */

describe('Complete Application Workflow', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.wait(1000) // Allow application to initialize
  })

  describe('Application Initialization', () => {
    it('should load the application successfully', () => {
      // Check main components are present
      cy.get('[data-testid="drawing-canvas"]').should('be.visible')
      cy.get('[role="banner"]').should('be.visible') // Menu bar
      cy.get('[role="complementary"]').should('be.visible') // Sidebar
      cy.get('[role="contentinfo"]').should('be.visible') // Status bar
    })

    it('should have proper accessibility structure', () => {
      // Check skip links
      cy.get('a[href="#main-canvas"]').should('contain', 'Skip to canvas')
      cy.get('a[href="#tool-palette"]').should('contain', 'Skip to tools')
      cy.get('a[href="#sidebar"]').should('contain', 'Skip to sidebar')
      
      // Check ARIA labels
      cy.get('[aria-label*="zoom"]').should('exist')
      cy.get('[aria-label*="grid"]').should('exist')
    })

    it('should display default status message', () => {
      cy.contains('Ready').should('be.visible')
    })
  })

  describe('Wall Type Selection and Creation', () => {
    it('should create layout walls (350mm)', () => {
      // Select layout wall type
      cy.get('[aria-label*="Layout Wall"]').click()
      cy.contains('Selected layout wall type').should('be.visible')
      
      // Switch to draw tool
      cy.get('[aria-label*="Draw Wall"]').click()
      cy.contains('Activated draw tool').should('be.visible')
      
      // Draw on canvas
      cy.get('[data-testid="drawing-canvas"]').click(200, 200)
      cy.get('[data-testid="drawing-canvas"]').click(400, 200)
      
      // Verify wall creation
      cy.contains(/Wall created/).should('be.visible')
    })

    it('should create zone walls (250mm)', () => {
      // Select zone wall type
      cy.get('[aria-label*="Zone Wall"]').click()
      cy.contains('Selected zone wall type').should('be.visible')
      
      // Switch to draw tool and create wall
      cy.get('[aria-label*="Draw Wall"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(100, 300)
      cy.get('[data-testid="drawing-canvas"]').click(300, 300)
      
      cy.contains(/Wall created/).should('be.visible')
    })

    it('should create area walls (150mm)', () => {
      // Select area wall type
      cy.get('[aria-label*="Area Wall"]').click()
      cy.contains('Selected area wall type').should('be.visible')
      
      // Switch to draw tool and create wall
      cy.get('[aria-label*="Draw Wall"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(150, 400)
      cy.get('[data-testid="drawing-canvas"]').click(350, 400)
      
      cy.contains(/Wall created/).should('be.visible')
    })
  })

  describe('Wall Selection and Editing', () => {
    beforeEach(() => {
      // Create a test wall
      cy.get('[aria-label*="Draw Wall"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(200, 200)
      cy.get('[data-testid="drawing-canvas"]').click(400, 200)
      cy.contains(/Wall created/).should('be.visible')
    })

    it('should select walls and show properties', () => {
      // Switch to select tool
      cy.get('[aria-label*="Select Tool"]').click()
      
      // Select the wall
      cy.get('[data-testid="drawing-canvas"]').click(300, 200)
      cy.contains(/Selected.*wall/).should('be.visible')
      
      // Check sidebar shows wall properties
      cy.get('[role="complementary"]').should('contain', 'Wall Properties')
    })

    it('should edit wall properties', () => {
      // Select wall first
      cy.get('[aria-label*="Select Tool"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(300, 200)
      
      // Change wall type in sidebar
      cy.get('[role="complementary"]').within(() => {
        cy.get('select, [role="combobox"]').first().select('zone')
      })
      
      cy.contains(/Updated.*wall.*zone/).should('be.visible')
    })

    it('should delete selected walls', () => {
      // Select wall
      cy.get('[aria-label*="Select Tool"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(300, 200)
      
      // Delete wall
      cy.get('[aria-label*="Delete Selected"]').click()
      cy.contains(/Deleted.*wall/).should('be.visible')
    })
  })

  describe('Grid System', () => {
    it('should toggle grid visibility', () => {
      // Grid should start hidden
      cy.get('[aria-label*="Toggle Grid"]').should('not.have.class', 'active')
      
      // Toggle grid on
      cy.get('[aria-label*="Toggle Grid"]').click()
      cy.contains('Grid visible').should('be.visible')
      
      // Toggle grid off
      cy.get('[aria-label*="Toggle Grid"]').click()
      cy.contains('Grid hidden').should('be.visible')
    })

    it('should provide visual feedback for grid state', () => {
      cy.get('[aria-label*="Toggle Grid"]').click()
      
      // Button should show active state
      cy.get('[aria-label*="Toggle Grid"]').should('have.attr', 'aria-pressed', 'true')
    })
  })

  describe('Zoom and Pan Functionality', () => {
    it('should zoom in and out', () => {
      // Test zoom in
      cy.get('[aria-label*="Zoom In"]').click()
      cy.contains('Zoomed in').should('be.visible')
      
      // Test zoom out
      cy.get('[aria-label*="Zoom Out"]').click()
      cy.contains('Zoomed out').should('be.visible')
    })

    it('should reset view', () => {
      // Zoom in first
      cy.get('[aria-label*="Zoom In"]').click()
      
      // Reset view
      cy.get('[aria-label*="Reset"]').click()
      cy.contains('View reset').should('be.visible')
    })

    it('should show zoom level in status bar', () => {
      cy.get('[role="contentinfo"]').should('contain', '100%')
      
      cy.get('[aria-label*="Zoom In"]').click()
      cy.get('[role="contentinfo"]').should('contain', '120%')
    })
  })

  describe('Reference Image Management', () => {
    it('should load reference images', () => {
      // Create a test image file
      cy.fixture('test-image.png', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'test-floor-plan.png',
          mimeType: 'image/png'
        }, { force: true })
      })
      
      cy.contains(/Reference image loaded/).should('be.visible')
    })

    it('should toggle reference image lock', () => {
      // Load image first
      cy.fixture('test-image.png', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'test.png',
          mimeType: 'image/png'
        }, { force: true })
      })
      
      // Toggle lock
      cy.get('[aria-label*="Lock"]').click()
      cy.contains(/Reference image unlocked/).should('be.visible')
    })

    it('should toggle reference image visibility', () => {
      // Load image first
      cy.fixture('test-image.png', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'test.png',
          mimeType: 'image/png'
        }, { force: true })
      })
      
      // Toggle visibility
      cy.get('[aria-label*="Toggle.*Visibility"]').click()
      cy.contains(/Reference image hidden/).should('be.visible')
    })
  })

  describe('Performance Monitoring', () => {
    it('should show performance monitor', () => {
      cy.get('button').contains('Performance').click()
      cy.get('[data-testid="performance-monitor"]').should('be.visible')
    })

    it('should toggle performance mode', () => {
      cy.get('button').contains('Performance').click()
      
      cy.get('button').contains('Enable Performance Mode').click()
      cy.contains('Performance mode enabled').should('be.visible')
      
      cy.get('button').contains('Disable Performance Mode').click()
      cy.contains('Performance mode disabled').should('be.visible')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should show keyboard shortcuts dialog', () => {
      cy.get('[aria-label*="Show keyboard shortcuts"]').click()
      cy.contains('Keyboard Shortcuts').should('be.visible')
    })

    it('should support keyboard navigation', () => {
      // Test tab navigation
      cy.get('body').tab()
      cy.focused().should('be.visible')
      
      // Test escape key
      cy.get('body').type('{esc}')
    })
  })

  describe('Error Handling', () => {
    it('should handle rapid user interactions', () => {
      // Rapid clicking should not break the application
      for (let i = 0; i < 10; i++) {
        cy.get('[data-testid="drawing-canvas"]').click(100 + i * 10, 100 + i * 10)
      }
      
      // Application should remain stable
      cy.get('[data-testid="drawing-canvas"]').should('be.visible')
      cy.contains(/Ready|Wall created/).should('be.visible')
    })

    it('should handle tool switching rapidly', () => {
      const tools = ['Select Tool', 'Draw Wall', 'Move Tool', 'Delete Tool']
      
      tools.forEach(tool => {
        cy.get(`[aria-label*="${tool}"]`).click()
        cy.contains(/Activated/).should('be.visible')
      })
    })

    it('should maintain state consistency', () => {
      // Create multiple walls
      cy.get('[aria-label*="Draw Wall"]').click()
      
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="drawing-canvas"]').click(100 + i * 50, 200)
        cy.get('[data-testid="drawing-canvas"]').click(150 + i * 50, 200)
      }
      
      // Switch to select tool
      cy.get('[aria-label*="Select Tool"]').click()
      
      // Application should remain responsive
      cy.get('[data-testid="drawing-canvas"]').should('be.visible')
    })
  })

  describe('Responsive Design', () => {
    it('should work on different viewport sizes', () => {
      // Test desktop size
      cy.viewport(1280, 720)
      cy.get('[data-testid="drawing-canvas"]').should('be.visible')
      
      // Test tablet size
      cy.viewport(768, 1024)
      cy.get('[data-testid="drawing-canvas"]').should('be.visible')
      
      // Test mobile size
      cy.viewport(375, 667)
      cy.get('[data-testid="drawing-canvas"]').should('be.visible')
    })

    it('should maintain functionality on smaller screens', () => {
      cy.viewport(375, 667)
      
      // Basic functionality should still work
      cy.get('[aria-label*="Draw Wall"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(100, 200)
      cy.get('[data-testid="drawing-canvas"]').click(200, 200)
      
      cy.contains(/Wall created/).should('be.visible')
    })
  })

  describe('Data Persistence', () => {
    it('should maintain state during session', () => {
      // Create a wall
      cy.get('[aria-label*="Draw Wall"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(200, 200)
      cy.get('[data-testid="drawing-canvas"]').click(400, 200)
      
      // Switch tools and back
      cy.get('[aria-label*="Select Tool"]').click()
      cy.get('[aria-label*="Draw Wall"]').click()
      
      // Application should maintain state
      cy.get('[data-testid="drawing-canvas"]').should('be.visible')
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should complete a full floor plan creation workflow', () => {
      // 1. Start with layout walls
      cy.get('[aria-label*="Layout Wall"]').click()
      cy.get('[aria-label*="Draw Wall"]').click()
      
      // 2. Draw exterior walls
      cy.get('[data-testid="drawing-canvas"]').click(100, 100)
      cy.get('[data-testid="drawing-canvas"]').click(500, 100)
      cy.get('[data-testid="drawing-canvas"]').click(500, 400)
      cy.get('[data-testid="drawing-canvas"]').click(100, 400)
      cy.get('[data-testid="drawing-canvas"]').click(100, 100)
      
      // 3. Switch to zone walls for interior
      cy.get('[aria-label*="Zone Wall"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(300, 100)
      cy.get('[data-testid="drawing-canvas"]').click(300, 400)
      
      // 4. Add area walls for details
      cy.get('[aria-label*="Area Wall"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(200, 200)
      cy.get('[data-testid="drawing-canvas"]').click(400, 200)
      
      // 5. Enable grid for alignment
      cy.get('[aria-label*="Toggle Grid"]').click()
      
      // 6. Load reference image
      cy.fixture('test-image.png', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'floor-plan.png',
          mimeType: 'image/png'
        }, { force: true })
      })
      
      // 7. Select and edit walls
      cy.get('[aria-label*="Select Tool"]').click()
      cy.get('[data-testid="drawing-canvas"]').click(300, 250)
      
      // 8. Verify final state
      cy.contains(/Selected.*wall/).should('be.visible')
      cy.get('[role="complementary"]').should('contain', 'Wall Properties')
      cy.get('[role="contentinfo"]').should('contain', 'selected')
    })
  })
})