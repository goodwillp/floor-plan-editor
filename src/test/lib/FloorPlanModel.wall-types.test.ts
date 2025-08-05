import { describe, it, expect, beforeEach } from 'vitest'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { WALL_THICKNESS, WallType } from '@/lib/types'
import type { WallTypeString } from '@/lib/types'

describe('FloorPlanModel Wall Type System', () => {
  let model: FloorPlanModel

  beforeEach(() => {
    model = new FloorPlanModel()
  })

  describe('Wall Creation with Types', () => {
    it('should create layout wall with correct thickness', () => {
      // Requirements: 1.1
      const wall = model.createWall('layout')
      
      expect(wall.type).toBe('layout')
      expect(wall.thickness).toBe(350)
      expect(wall.thickness).toBe(WALL_THICKNESS.layout)
    })

    it('should create zone wall with correct thickness', () => {
      // Requirements: 1.2
      const wall = model.createWall('zone')
      
      expect(wall.type).toBe('zone')
      expect(wall.thickness).toBe(250)
      expect(wall.thickness).toBe(WALL_THICKNESS.zone)
    })

    it('should create area wall with correct thickness', () => {
      // Requirements: 1.3
      const wall = model.createWall('area')
      
      expect(wall.type).toBe('area')
      expect(wall.thickness).toBe(150)
      expect(wall.thickness).toBe(WALL_THICKNESS.area)
    })

    it('should create walls with unique IDs', () => {
      const wall1 = model.createWall('layout')
      const wall2 = model.createWall('zone')
      const wall3 = model.createWall('area')
      
      expect(wall1.id).not.toBe(wall2.id)
      expect(wall2.id).not.toBe(wall3.id)
      expect(wall1.id).not.toBe(wall3.id)
    })

    it('should create walls with proper timestamps', () => {
      const beforeCreate = new Date()
      const wall = model.createWall('layout')
      const afterCreate = new Date()
      
      expect(wall.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(wall.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
      expect(wall.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(wall.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })

    it('should create walls with default visibility', () => {
      const wall = model.createWall('layout')
      expect(wall.visible).toBe(true)
    })
  })

  describe('Wall Type Updates', () => {
    it('should update wall type from layout to zone', () => {
      // Requirements: 1.1, 1.2
      const wall = model.createWall('layout')
      const originalUpdatedAt = wall.updatedAt
      
      // Small delay to ensure timestamp difference
      setTimeout(() => {
        const success = model.updateWall(wall.id, { type: 'zone' })
        const updatedWall = model.getWall(wall.id)
        
        expect(success).toBe(true)
        expect(updatedWall?.type).toBe('zone')
        expect(updatedWall?.thickness).toBe(250)
        expect(updatedWall?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
      }, 1)
    })

    it('should update wall type from zone to area', () => {
      // Requirements: 1.2, 1.3
      const wall = model.createWall('zone')
      
      const success = model.updateWall(wall.id, { type: 'area' })
      const updatedWall = model.getWall(wall.id)
      
      expect(success).toBe(true)
      expect(updatedWall?.type).toBe('area')
      expect(updatedWall?.thickness).toBe(150)
    })

    it('should update wall type from area to layout', () => {
      // Requirements: 1.3, 1.1
      const wall = model.createWall('area')
      
      const success = model.updateWall(wall.id, { type: 'layout' })
      const updatedWall = model.getWall(wall.id)
      
      expect(success).toBe(true)
      expect(updatedWall?.type).toBe('layout')
      expect(updatedWall?.thickness).toBe(350)
    })

    it('should fail to update non-existent wall', () => {
      const success = model.updateWall('non-existent', { type: 'layout' })
      expect(success).toBe(false)
    })

    it('should update wall visibility', () => {
      const wall = model.createWall('layout')
      
      const success = model.updateWall(wall.id, { visible: false })
      const updatedWall = model.getWall(wall.id)
      
      expect(success).toBe(true)
      expect(updatedWall?.visible).toBe(false)
    })
  })

  describe('Wall Type Constants', () => {
    it('should have correct thickness constants', () => {
      // Requirements: 1.1, 1.2, 1.3
      expect(WALL_THICKNESS.layout).toBe(350)
      expect(WALL_THICKNESS.zone).toBe(250)
      expect(WALL_THICKNESS.area).toBe(150)
    })

    it('should use enum values correctly', () => {
      expect(WallType.LAYOUT).toBe('layout')
      expect(WallType.ZONE).toBe('zone')
      expect(WallType.AREA).toBe('area')
    })

    it('should map enum to thickness correctly', () => {
      expect(WALL_THICKNESS[WallType.LAYOUT]).toBe(350)
      expect(WALL_THICKNESS[WallType.ZONE]).toBe(250)
      expect(WALL_THICKNESS[WallType.AREA]).toBe(150)
    })
  })

  describe('Wall with Segments', () => {
    it('should create wall with segments and maintain type', () => {
      // Create nodes and segments first
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)
      
      if (segment) {
        const wall = model.createWall('layout', [segment.id])
        
        expect(wall.type).toBe('layout')
        expect(wall.thickness).toBe(350)
        expect(wall.segmentIds).toContain(segment.id)
        
        // Check segment is associated with wall
        const updatedSegment = model.getSegment(segment.id)
        expect(updatedSegment?.wallId).toBe(wall.id)
      }
    })

    it('should maintain wall type when adding segments', () => {
      const wall = model.createWall('zone')
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)
      
      if (segment) {
        const success = model.addSegmentsToWall(wall.id, [segment.id])
        const updatedWall = model.getWall(wall.id)
        
        expect(success).toBe(true)
        expect(updatedWall?.type).toBe('zone')
        expect(updatedWall?.thickness).toBe(250)
      }
    })

    it('should maintain wall type when removing segments', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)
      
      if (segment) {
        const wall = model.createWall('area', [segment.id])
        
        const success = model.removeSegmentsFromWall(wall.id, [segment.id])
        const updatedWall = model.getWall(wall.id)
        
        expect(success).toBe(true)
        expect(updatedWall?.type).toBe('area')
        expect(updatedWall?.thickness).toBe(150)
        expect(updatedWall?.segmentIds).not.toContain(segment.id)
      }
    })
  })

  describe('Wall Deletion', () => {
    it('should delete wall while preserving type information in tests', () => {
      const wall = model.createWall('layout')
      const wallId = wall.id
      const wallType = wall.type
      const wallThickness = wall.thickness
      
      // Verify wall exists with correct type
      expect(wall.type).toBe('layout')
      expect(wall.thickness).toBe(350)
      
      const success = model.deleteWall(wallId)
      expect(success).toBe(true)
      
      const deletedWall = model.getWall(wallId)
      expect(deletedWall).toBeUndefined()
      
      // Verify the original wall had correct properties before deletion
      expect(wallType).toBe('layout')
      expect(wallThickness).toBe(350)
    })
  })

  describe('Multiple Wall Types', () => {
    it('should handle multiple walls of different types', () => {
      const layoutWall = model.createWall('layout')
      const zoneWall = model.createWall('zone')
      const areaWall = model.createWall('area')
      
      const allWalls = model.getAllWalls()
      
      expect(allWalls).toHaveLength(3)
      expect(allWalls.find(w => w.id === layoutWall.id)?.type).toBe('layout')
      expect(allWalls.find(w => w.id === zoneWall.id)?.type).toBe('zone')
      expect(allWalls.find(w => w.id === areaWall.id)?.type).toBe('area')
      
      expect(allWalls.find(w => w.id === layoutWall.id)?.thickness).toBe(350)
      expect(allWalls.find(w => w.id === zoneWall.id)?.thickness).toBe(250)
      expect(allWalls.find(w => w.id === areaWall.id)?.thickness).toBe(150)
    })
  })
})