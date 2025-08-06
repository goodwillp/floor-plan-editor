// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom assertions for floor plan testing
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to draw a wall on the canvas
       * @example cy.drawWall(100, 100, 200, 200, 'layout')
       */
      drawWall(startX: number, startY: number, endX: number, endY: number, wallType?: string): Chainable<Element>
      
      /**
       * Custom command to select a wall type
       * @example cy.selectWallType('zone')
       */
      selectWallType(wallType: 'layout' | 'zone' | 'area'): Chainable<Element>
      
      /**
       * Custom command to wait for canvas to be ready
       * @example cy.waitForCanvas()
       */
      waitForCanvas(): Chainable<Element>
      
      /**
       * Custom command to check if walls are properly rendered
       * @example cy.checkWallCount(3)
       */
      checkWallCount(expectedCount: number): Chainable<Element>
    }
  }
}