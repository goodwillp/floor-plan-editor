import { describe, it, expect, beforeEach } from 'vitest'
import { DrawingService } from '@/lib/DrawingService'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import type { Point } from '@/lib/types'

describe('DrawingService', () => {
  let model: FloorPlanModel
  let drawingService: DrawingService

  beforeEach(() => {
    model = new FloorPlanModel()
    drawingService = new DrawingService(model)
  })

  describe('Wall Type Management', () => {
    it('should set and get active wall type', () => {
      expect(drawingService.getActiveWallType()).toBe('layout')
      
      drawingService.setActiveWallType('zone')
      expect(drawingService.getActiveWallType()).toBe('zone')
      
      drawingService.setActiveWallType('area')
      expect(drawingService.getActiveWallType()).toBe('area')
    })
  })

  describe('Drawing State Management', () => {
    it('should start drawing correctly', () => {
      const point: Point = { x: 100, y: 100 }
      
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
      
      drawingService.startDrawing(point)
      
      expect(drawingService.isCurrentlyDrawing()).toBe(true)
      expect(drawingService.getCurrentPoints()).toEqual([point])
    })

    it('should add points during drawing', () => {
      const point1: Point = { x: 100, y: 100 }
      const point2: Point = { x: 200, y: 100 }
      const point3: Point = { x: 200, y: 200 }
      
      drawingService.startDrawing(point1)
      drawingService.addPoint(point2)
      drawingService.addPoint(point3)
      
      expect(drawingService.getCurrentPoints()).toEqual([point1, point2, point3])
    })

    it('should not add points when not drawing', () => {
      const point: Point = { x: 100, y: 100 }
      
      drawingService.addPoint(point)
      
      expect(drawingService.getCurrentPoints()).toEqual([])
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
    })

    it('should cancel drawing correctly', () => {
      const point: Point = { x: 100, y: 100 }
      
      drawingService.startDrawing(point)
      expect(drawingService.isCurrentlyDrawing()).toBe(true)
      
      drawingService.cancelDrawing()
      
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
      expect(drawingService.getCurrentPoints()).toEqual([])
    })
  })

  describe('Wall Creation', () => {
    it('should complete drawing and create wall with multiple points', () => {
      const point1: Point = { x: 100, y: 100 }
      const point2: Point = { x: 200, y: 100 }
      const point3: Point = { x: 200, y: 200 }
      
      drawingService.setActiveWallType('zone')
      drawingService.startDrawing(point1)
      drawingService.addPoint(point2)
      drawingService.addPoint(point3)
      
      const wallId = drawingService.completeDrawing()
      
      expect(wallId).toBeTruthy()
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
      expect(drawingService.getCurrentPoints()).toEqual([])
      
      // Verify wall was created in model
      const wall = model.getWall(wallId!)
      expect(wall).toBeTruthy()
      expect(wall!.type).toBe('zone')
      expect(wall!.segmentIds).toHaveLength(2) // 3 points = 2 segments
    })

    it('should not create wall with insufficient points', () => {
      const point: Point = { x: 100, y: 100 }
      
      drawingService.startDrawing(point)
      const wallId = drawingService.completeDrawing()
      
      expect(wallId).toBeNull()
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
    })

    it('should not complete drawing when not drawing', () => {
      const wallId = drawingService.completeDrawing()
      
      expect(wallId).toBeNull()
    })
  })

  describe('Preview Functionality', () => {
    it('should provide preview line when drawing', () => {
      const point1: Point = { x: 100, y: 100 }
      const mousePos: Point = { x: 200, y: 150 }
      
      drawingService.startDrawing(point1)
      const previewLine = drawingService.getPreviewLine(mousePos)
      
      expect(previewLine).toBeTruthy()
      expect(previewLine!.start).toEqual(point1)
      expect(previewLine!.end).toEqual(mousePos)
    })

    it('should not provide preview line when not drawing', () => {
      const mousePos: Point = { x: 200, y: 150 }
      
      const previewLine = drawingService.getPreviewLine(mousePos)
      
      expect(previewLine).toBeNull()
    })

    it('should provide preview from last point', () => {
      const point1: Point = { x: 100, y: 100 }
      const point2: Point = { x: 200, y: 100 }
      const mousePos: Point = { x: 200, y: 200 }
      
      drawingService.startDrawing(point1)
      drawingService.addPoint(point2)
      const previewLine = drawingService.getPreviewLine(mousePos)
      
      expect(previewLine).toBeTruthy()
      expect(previewLine!.start).toEqual(point2)
      expect(previewLine!.end).toEqual(mousePos)
    })
  })

  describe('Length Calculation', () => {
    it('should calculate drawing length correctly', () => {
      const point1: Point = { x: 0, y: 0 }
      const point2: Point = { x: 100, y: 0 }
      const point3: Point = { x: 100, y: 100 }
      
      drawingService.startDrawing(point1)
      expect(drawingService.getCurrentDrawingLength()).toBe(0)
      
      drawingService.addPoint(point2)
      expect(drawingService.getCurrentDrawingLength()).toBe(100)
      
      drawingService.addPoint(point3)
      expect(drawingService.getCurrentDrawingLength()).toBe(200)
    })

    it('should return zero length for single point', () => {
      const point: Point = { x: 100, y: 100 }
      
      drawingService.startDrawing(point)
      
      expect(drawingService.getCurrentDrawingLength()).toBe(0)
    })
  })

  describe('Reset Functionality', () => {
    it('should reset all state', () => {
      const point: Point = { x: 100, y: 100 }
      
      drawingService.setActiveWallType('area')
      drawingService.startDrawing(point)
      
      drawingService.reset()
      
      expect(drawingService.isCurrentlyDrawing()).toBe(false)
      expect(drawingService.getCurrentPoints()).toEqual([])
      expect(drawingService.getActiveWallType()).toBe('layout')
    })
  })
})