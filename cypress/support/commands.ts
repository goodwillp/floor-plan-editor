/// <reference types="cypress" />

// Custom commands for floor plan editor testing

Cypress.Commands.add('drawWall', (startX: number, startY: number, endX: number, endY: number, wallType: string = 'layout') => {
  // Select wall type first
  cy.selectWallType(wallType as 'layout' | 'zone' | 'area')
  
  // Get the canvas element
  cy.get('[data-testid="drawing-canvas"]').within(() => {
    // Start drawing
    cy.get('canvas')
      .trigger('mousedown', { clientX: startX, clientY: startY })
      .trigger('mousemove', { clientX: endX, clientY: endY })
      .trigger('mouseup', { clientX: endX, clientY: endY })
  })
  
  // Wait for wall to be created
  cy.wait(100)
})

Cypress.Commands.add('selectWallType', (wallType: 'layout' | 'zone' | 'area') => {
  const wallTypeMap = {
    layout: '[data-testid="wall-type-layout"]',
    zone: '[data-testid="wall-type-zone"]',
    area: '[data-testid="wall-type-area"]'
  }
  
  cy.get(wallTypeMap[wallType]).click()
})

Cypress.Commands.add('waitForCanvas', () => {
  cy.get('[data-testid="drawing-canvas"]').should('be.visible')
  cy.get('canvas').should('be.visible')
  // Wait for PixiJS to initialize
  cy.wait(1000)
})

Cypress.Commands.add('checkWallCount', (expectedCount: number) => {
  // This would need to be implemented based on how walls are tracked in the app
  // For now, we'll check if the status bar shows the correct count
  cy.get('[data-testid="status-bar"]').should('contain', `${expectedCount} wall`)
})