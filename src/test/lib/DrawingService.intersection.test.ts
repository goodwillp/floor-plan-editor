import { describe, it, expect, beforeEach } from 'vitest'
import { DrawingService } from '@/lib/DrawingService'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import type { Point } from '@/lib/types'

describe('DrawingService - Intersection Integration', () => {
  let model: FloorPlanModel
  let drawingService: DrawingService

  beforeEach(() => {
    model = new FloorPlanModel()
    drawingService = new DrawingService(model)
  })

  describe('Wall Drawing with Intersections', () => {
    it('should automatically handle intersections when completing wall drawing', () => {
      // Create an existing horizontal wall
      drawingService.setActiveWallType('layout')
      drawingService.startDrawing({ x: 0, y: 5 })
      drawingService.addPoint({ x: 10, y: 5 })
      const horizontalWallId = drawingService.completeDrawing()!

      expect(horizontalWallId).toBeTruthy()

      // Draw a vertical wall that intersects the horizontal one
      drawingService.startDrawing({ x: 5, y: 0 })
      drawingService.addPoint({ x: 5, y: 10 })
      const verticalWallId = drawingService.completeDrawing()!

      expect(verticalWallId).toBeTruthy()

      // Check that intersection was processed
      const allNodes = model.getAllNodes()
      const intersectionNode = allNodes.find(n => 
        Math.abs(n.x - 5) < 1e-6 && Math.abs(n.y - 5) < 1e-6 && n.type === 'intersection'
      )

      expect(intersectionNode).toBeDefined()
      expect(intersectionNode!.connectedSegments.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle multiple intersections in a single wall', () => {
      // Create two existing walls
      drawingService.setActiveWallType('layout')
      
      // Horizontal wall 1
      drawingService.startDrawing({ x: 0, y: 3 })
      drawingService.addPoint({ x: 10, y: 3 })
      drawingService.completeDrawing()

      // Horizontal wall 2
      drawingService.startDrawing({ x: 0, y: 7 })
      drawingService.addPoint({ x: 10, y: 7 })
      drawingService.completeDrawing()

      // Draw a vertical wall that intersects both
      drawingService.startDrawing({ x: 5, y: 0 })
      drawingService.addPoint({ x: 5, y: 10 })
      const verticalWallId = drawingService.completeDrawing()!

      expect(verticalWallId).toBeTruthy()

      // Should have created two intersection nodes
      const allNodes = model.getAllNodes()
      const intersection1 = allNodes.find(n => 
        Math.abs(n.x - 5) < 1e-6 && Math.abs(n.y - 3) < 1e-6 && n.type === 'intersection'
      )
      const intersection2 = allNodes.find(n => 
        Math.abs(n.x - 5) < 1e-6 && Math.abs(n.y - 7) < 1e-6 && n.type === 'intersection'
      )

      expect(intersection1).toBeDefined()
      expect(intersection2).toBeDefined()
    })

    it('should handle intersections with different wall types', () => {
      // Create a layout wall
      drawingService.setActiveWallType('layout')
      drawingService.startDrawing({ x: 0, y: 5 })
      drawingService.addPoint({ x: 10, y: 5 })
      const layoutWallId = drawingService.completeDrawing()!

      // Create an area wall that intersects
      drawingService.setActiveWallType('area')
      drawingService.startDrawing({ x: 5, y: 0 })
      drawingService.addPoint({ x: 5, y: 10 })
      const areaWallId = drawingService.completeDrawing()!

      expect(layoutWallId).toBeTruthy()
      expect(areaWallId).toBeTruthy()

      // Both walls should still exist
      const layoutWall = model.getWall(layoutWallId)
      const areaWall = model.getWall(areaWallId)

      expect(layoutWall).toBeDefined()
      expect(areaWall).toBeDefined()
      expect(layoutWall!.type).toBe('layout')
      expect(areaWall!.type).toBe('area')

      // Intersection should be created
      const allNodes = model.getAllNodes()
      const intersectionNode = allNodes.find(n => 
        Math.abs(n.x - 5) < 1e-6 && Math.abs(n.y - 5) < 1e-6 && n.type === 'intersection'
      )

      expect(intersectionNode).toBeDefined()
    })

    it('should handle multi-segment walls with intersections', () => {
      // Create an existing simple wall
      drawingService.setActiveWallType('layout')
      drawingService.startDrawing({ x: 3, y: 0 })
      drawingService.addPoint({ x: 3, y: 10 })
      drawingService.completeDrawing()

      // Create a multi-segment wall that intersects
      drawingService.startDrawing({ x: 0, y: 2 })
      drawingService.addPoint({ x: 5, y: 2 })
      drawingService.addPoint({ x: 5, y: 8 })
      drawingService.addPoint({ x: 8, y: 8 })
      const multiSegmentWallId = drawingService.completeDrawing()!

      expect(multiSegmentWallId).toBeTruthy()

      // Should have created intersection at (3, 2)
      const allNodes = model.getAllNodes()
      const intersectionNode = allNodes.find(n => 
        Math.abs(n.x - 3) < 1e-6 && Math.abs(n.y - 2) < 1e-6 && n.type === 'intersection'
      )

      expect(intersectionNode).toBeDefined()
    })

    it('should preserve wall properties after intersection processing', () => {
      // Create walls with different types and check they maintain their properties
      drawingService.setActiveWallType('zone')
      drawingService.startDrawing({ x: 0, y: 5 })
      drawingService.addPoint({ x: 10, y: 5 })
      const zoneWallId = drawingService.completeDrawing()!

      drawingService.setActiveWallType('area')
      drawingService.startDrawing({ x: 5, y: 0 })
      drawingService.addPoint({ x: 5, y: 10 })
      const areaWallId = drawingService.completeDrawing()!

      const zoneWall = model.getWall(zoneWallId)!
      const areaWall = model.getWall(areaWallId)!

      expect(zoneWall.type).toBe('zone')
      expect(zoneWall.thickness).toBe(250) // Zone wall thickness
      expect(areaWall.type).toBe('area')
      expect(areaWall.thickness).toBe(150) // Area wall thickness

      // Both walls should still be visible
      expect(zoneWall.visible).toBe(true)
      expect(areaWall.visible).toBe(true)
    })
  })

  describe('Drawing State Management with Intersections', () => {
    it('should maintain proper drawing state during intersection processing', () => {
      // Start drawing
      drawingService.startDrawing({ x: 0, y: 0 })
      expect(drawingService.isCurrentlyDrawing()).toBe(true)

      drawingService.addPoint({ x: 10, y: 10 })
      expect(drawingService.getCurrentPoints()).toHaveLength(2)

      // Complete drawing (which processes intersections)
      const wallId = drawingService.completeDrawing()

      // Drawing state should be reset
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
      expect(drawingService.getCurrentPoints()).toHaveLength(0)
      expect(wallId).toBeTruthy()
    })

    it('should handle drawing cancellation properly', () => {
      drawingService.startDrawing({ x: 0, y: 0 })
      drawingService.addPoint({ x: 5, y: 5 })
      
      expect(drawingService.isCurrentlyDrawing()).toBe(true)
      
      drawingService.cancelDrawing()
      
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
      expect(drawingService.getCurrentPoints()).toHaveLength(0)
    })

    it('should provide correct preview lines during drawing', () => {
      drawingService.startDrawing({ x: 0, y: 0 })
      drawingService.addPoint({ x: 5, y: 0 })

      const previewLine = drawingService.getPreviewLine({ x: 10, y: 5 })
      
      expect(previewLine).toBeDefined()
      expect(previewLine!.start).toEqual({ x: 5, y: 0 })
      expect(previewLine!.end).toEqual({ x: 10, y: 5 })
    })

    it('should calculate drawing length correctly', () => {
      drawingService.startDrawing({ x: 0, y: 0 })
      drawingService.addPoint({ x: 3, y: 4 }) // Distance: 5
      drawingService.addPoint({ x: 6, y: 8 }) // Additional distance: 5

      const totalLength = drawingService.getCurrentDrawingLength()
      expect(totalLength).toBeCloseTo(10, 5)
    })
  })

  describe('Error Handling', () => {
    it('should handle intersection processing errors gracefully', () => {
      // This test ensures that if intersection processing fails, 
      // the wall drawing still completes successfully
      
      drawingService.startDrawing({ x: 0, y: 0 })
      drawingService.addPoint({ x: 10, y: 10 })
      
      // Mock a scenario where intersection processing might fail
      // but the basic wall creation should still work
      const wallId = drawingService.completeDrawing()
      
      expect(wallId).toBeTruthy()
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
    })

    it('should handle empty drawing completion', () => {
      const result = drawingService.completeDrawing()
      expect(result).toBeNull()
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
    })

    it('should handle single point drawing', () => {
      drawingService.startDrawing({ x: 0, y: 0 })
      const result = drawingService.completeDrawing()
      
      expect(result).toBeNull()
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
    })
  })

  describe('Integration with Wall Types', () => {
    it('should maintain wall type consistency through intersection processing', () => {
      const wallTypes: ['layout', 'zone', 'area'] = ['layout', 'zone', 'area']
      
      for (const wallType of wallTypes) {
        drawingService.setActiveWallType(wallType)
        drawingService.startDrawing({ x: 0, y: 0 })
        drawingService.addPoint({ x: 10, y: 0 })
        const wallId = drawingService.completeDrawing()!
        
        const wall = model.getWall(wallId)!
        expect(wall.type).toBe(wallType)
        
        // Clear for next iteration
        model.deleteWall(wallId)
      }
    })

    it('should handle wall type changes during drawing session', () => {
      drawingService.setActiveWallType('layout')
      expect(drawingService.getActiveWallType()).toBe('layout')

      drawingService.setActiveWallType('zone')
      expect(drawingService.getActiveWallType()).toBe('zone')

      drawingService.setActiveWallType('area')
      expect(drawingService.getActiveWallType()).toBe('area')
    })
  })
})