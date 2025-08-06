describe('Error Handling and Edge Cases', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForCanvas()
  })

  it('should handle invalid wall operations gracefully', () => {
    // Try to create a zero-length wall
    cy.selectWallType('layout')
    cy.drawWall(100, 100, 100, 100)

    // Should show error message
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid wall length')
  })

  it('should handle large file uploads with proper error messages', () => {
    cy.get('[data-testid="reference-image-toggle"]').click()

    // Try to upload a file that's too large (mock)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large-image.png', {
      type: 'image/png'
    })

    cy.get('[data-testid="image-upload-input"]').then(input => {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(largeFile)
      input[0].files = dataTransfer.files
      input[0].dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Should show file size error
    cy.get('[data-testid="error-message"]').should('contain', 'File size exceeds 10MB limit')
  })

  it('should handle invalid file types', () => {
    cy.get('[data-testid="reference-image-toggle"]').click()

    // Try to upload an invalid file type
    const invalidFile = new File(['test'], 'document.txt', {
      type: 'text/plain'
    })

    cy.get('[data-testid="image-upload-input"]').then(input => {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(invalidFile)
      input[0].files = dataTransfer.files
      input[0].dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Should show file type error
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid file type')
  })

  it('should recover from rendering errors', () => {
    // Create many walls to potentially trigger rendering issues
    cy.selectWallType('layout')
    
    for (let i = 0; i < 50; i++) {
      cy.drawWall(i * 10, 100, i * 10 + 50, 100)
    }

    // Application should still be responsive
    cy.get('[data-testid="status-bar"]').should('be.visible')
    cy.get('[data-testid="drawing-canvas"]').should('be.visible')
  })

  it('should handle memory warnings appropriately', () => {
    // This would need to be implemented based on the actual memory monitoring
    // For now, we'll test that the error panel can display memory warnings
    
    // Simulate memory warning (would need to be triggered by the app)
    cy.window().then(win => {
      win.dispatchEvent(new CustomEvent('memory-warning', {
        detail: { usage: 85, threshold: 80 }
      }))
    })

    // Should show memory warning
    cy.get('[data-testid="error-panel"]').should('contain', 'Memory usage high')
  })

  it('should maintain application state after errors', () => {
    // Create some walls
    cy.selectWallType('layout')
    cy.drawWall(100, 100, 200, 100)
    cy.drawWall(200, 100, 200, 200)

    // Trigger an error (simulate)
    cy.window().then(win => {
      win.dispatchEvent(new CustomEvent('test-error'))
    })

    // Verify walls are still there after error recovery
    cy.get('[data-testid="status-bar"]').should('contain', '2 wall')
    
    // Should still be able to create new walls
    cy.drawWall(200, 200, 300, 200)
    cy.get('[data-testid="status-bar"]').should('contain', '3 wall')
  })
})