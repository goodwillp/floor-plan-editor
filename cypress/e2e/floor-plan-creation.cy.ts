describe('Floor Plan Creation Workflow', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForCanvas()
  })

  it('should create a complete floor plan with different wall types', () => {
    // Test creating layout walls (350mm)
    cy.selectWallType('layout')
    cy.drawWall(100, 100, 300, 100)
    cy.drawWall(300, 100, 300, 300)
    cy.drawWall(300, 300, 100, 300)
    cy.drawWall(100, 300, 100, 100)

    // Test creating zone walls (250mm)
    cy.selectWallType('zone')
    cy.drawWall(150, 150, 250, 150)
    cy.drawWall(250, 150, 250, 250)

    // Test creating area walls (150mm)
    cy.selectWallType('area')
    cy.drawWall(175, 175, 225, 175)

    // Verify walls are created
    cy.get('[data-testid="status-bar"]').should('contain', 'wall')
  })

  it('should handle wall intersections automatically', () => {
    // Create first wall
    cy.selectWallType('layout')
    cy.drawWall(100, 100, 300, 100)

    // Create intersecting wall
    cy.drawWall(200, 50, 200, 150)

    // Verify intersection is handled
    cy.get('[data-testid="status-bar"]').should('contain', 'intersection')
  })

  it('should allow wall selection and editing', () => {
    // Create a wall
    cy.selectWallType('layout')
    cy.drawWall(100, 100, 300, 100)

    // Select the wall
    cy.get('[data-testid="drawing-canvas"] canvas').click(200, 100)

    // Verify wall is selected
    cy.get('[data-testid="wall-properties-panel"]').should('be.visible')

    // Change wall type
    cy.get('[data-testid="wall-type-select"]').select('zone')
    cy.get('[data-testid="apply-changes"]').click()

    // Verify change is applied
    cy.get('[data-testid="status-bar"]').should('contain', 'Zone')
  })

  it('should support wall deletion with node cleanup', () => {
    // Create walls
    cy.selectWallType('layout')
    cy.drawWall(100, 100, 300, 100)
    cy.drawWall(300, 100, 300, 300)

    // Select and delete first wall
    cy.get('[data-testid="drawing-canvas"] canvas').click(200, 100)
    cy.get('[data-testid="delete-wall"]').click()

    // Verify wall is deleted and nodes are cleaned up
    cy.get('[data-testid="status-bar"]').should('contain', '1 wall')
  })
})