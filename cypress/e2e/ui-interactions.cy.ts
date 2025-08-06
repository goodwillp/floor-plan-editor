describe('UI Interactions and Tools', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForCanvas()
  })

  it('should toggle grid visibility', () => {
    // Grid should be off by default
    cy.get('[data-testid="grid-toggle"]').should('not.have.class', 'active')

    // Toggle grid on
    cy.get('[data-testid="grid-toggle"]').click()
    cy.get('[data-testid="grid-toggle"]').should('have.class', 'active')

    // Verify grid is visible (this would need visual verification)
    cy.get('[data-testid="drawing-canvas"]').should('contain.class', 'grid-visible')

    // Toggle grid off
    cy.get('[data-testid="grid-toggle"]').click()
    cy.get('[data-testid="grid-toggle"]').should('not.have.class', 'active')
  })

  it('should support zoom and pan operations', () => {
    // Test zoom in
    cy.get('[data-testid="zoom-in"]').click()
    cy.get('[data-testid="zoom-level"]').should('contain', '110%')

    // Test zoom out
    cy.get('[data-testid="zoom-out"]').click()
    cy.get('[data-testid="zoom-level"]').should('contain', '100%')

    // Test mouse wheel zoom
    cy.get('[data-testid="drawing-canvas"] canvas')
      .trigger('wheel', { deltaY: -100 })
    cy.get('[data-testid="zoom-level"]').should('contain', '110%')

    // Test pan with mouse drag
    cy.get('[data-testid="drawing-canvas"] canvas')
      .trigger('mousedown', { clientX: 400, clientY: 300, which: 1 })
      .trigger('mousemove', { clientX: 450, clientY: 350 })
      .trigger('mouseup')

    // Verify pan occurred (would need to check canvas transform)
  })

  it('should load and manage reference images', () => {
    // Open reference image panel
    cy.get('[data-testid="reference-image-toggle"]').click()
    cy.get('[data-testid="reference-image-panel"]').should('be.visible')

    // Mock file upload
    const fileName = 'test-floor-plan.png'
    cy.fixture(fileName).then(fileContent => {
      cy.get('[data-testid="image-upload-input"]').selectFile({
        contents: Cypress.Buffer.from(fileContent),
        fileName,
        mimeType: 'image/png'
      })
    })

    // Verify image is loaded
    cy.get('[data-testid="reference-image"]').should('be.visible')

    // Test image lock/unlock
    cy.get('[data-testid="image-lock-toggle"]').should('have.class', 'locked')
    cy.get('[data-testid="image-lock-toggle"]').click()
    cy.get('[data-testid="image-lock-toggle"]').should('not.have.class', 'locked')

    // Test image positioning when unlocked
    cy.get('[data-testid="reference-image"]')
      .trigger('mousedown', { clientX: 200, clientY: 200 })
      .trigger('mousemove', { clientX: 250, clientY: 250 })
      .trigger('mouseup')
  })

  it('should show tooltips on hover', () => {
    // Test wall type tooltips
    cy.get('[data-testid="wall-type-layout"]').trigger('mouseover')
    cy.get('[data-testid="tooltip"]').should('contain', 'Layout Wall (350mm)')

    cy.get('[data-testid="wall-type-zone"]').trigger('mouseover')
    cy.get('[data-testid="tooltip"]').should('contain', 'Zone Wall (250mm)')

    cy.get('[data-testid="wall-type-area"]').trigger('mouseover')
    cy.get('[data-testid="tooltip"]').should('contain', 'Area Wall (150mm)')

    // Test tool tooltips
    cy.get('[data-testid="grid-toggle"]').trigger('mouseover')
    cy.get('[data-testid="tooltip"]').should('contain', 'Toggle Grid')

    cy.get('[data-testid="zoom-in"]').trigger('mouseover')
    cy.get('[data-testid="tooltip"]').should('contain', 'Zoom In')
  })

  it('should handle sidebar collapse and expand', () => {
    // Sidebar should be collapsed by default
    cy.get('[data-testid="sidebar"]').should('have.class', 'collapsed')

    // Expand sidebar
    cy.get('[data-testid="sidebar-toggle"]').click()
    cy.get('[data-testid="sidebar"]').should('not.have.class', 'collapsed')

    // Verify canvas adjusts
    cy.get('[data-testid="drawing-canvas"]').should('have.class', 'sidebar-expanded')

    // Collapse sidebar
    cy.get('[data-testid="sidebar-toggle"]').click()
    cy.get('[data-testid="sidebar"]').should('have.class', 'collapsed')
  })
})