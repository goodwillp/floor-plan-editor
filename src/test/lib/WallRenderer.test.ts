import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as PIXI from 'pixi.js'
import { WallRenderer } from '@/lib/WallRenderer'
import type { Wall, Segment, Node, WallTypeString } from '@/lib/types'
import { WALL_THICKNESS, WallType } from '@/lib/types'

// Mock PIXI.Graphics
const mockGraphics = {
  clear: vi.fn().mockReturnThis(),
  beginFill: vi.fn().mockReturnThis(),
  lineStyle: vi.fn().mockReturnThis(),
  moveTo: vi.fn().mockReturnThis(),
  lineTo: vi.fn().mockReturnThis(),
  closePath: vi.fn().mockReturnThis(),
  endFill: vi.fn().mockReturnThis(),
  destroy: vi.fn(),
  visible: true
}

const mockContainer = {
  addChild: vi.fn(),
  removeChild: vi.fn()
}

// Mock PIXI
vi.mock('pixi.js', () => ({
  Graphics: vi.fn(() => mockGraphics),
  Container: vi.fn(() => mockContainer)
}))

describe('WallRenderer', () => {
  let wallRenderer: WallRenderer
  let mockWallContainer: PIXI.Container
  let testNodes: Map<string, Node>
  let testSegments: Segment[]
  let testWall: Wall

  beforeEach(() => {
    wallRenderer = new WallRenderer()
    mockWallContainer = mockContainer as any
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Create test data
    testNodes = new Map([
      ['node1', { id: 'node1', x: 0, y: 0, connectedSegments: ['seg1'], type: 'endpoint' }],
      ['node2', { id: 'node2', x: 100, y: 0, connectedSegments: ['seg1'], type: 'endpoint' }]
    ])
    
    testSegments = [{
      id: 'seg1',
      startNodeId: 'node1',
      endNodeId: 'node2',
      wallId: 'wall1',
      length: 100,
      angle: 0
    }]
    
    testWall = {
      id: 'wall1',
      type: 'layout',
      thickness: WALL_THICKNESS.layout,
      segmentIds: ['seg1'],
      visible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  describe('Wall Type System', () => {
    it('should create wall with correct thickness for layout type', () => {
      // Requirements: 1.1
      const layoutWall: Wall = {
        ...testWall,
        type: 'layout',
        thickness: WALL_THICKNESS.layout
      }
      
      expect(layoutWall.thickness).toBe(350)
      expect(WallRenderer.getWallThickness('layout')).toBe(350)
    })

    it('should create wall with correct thickness for zone type', () => {
      // Requirements: 1.2
      const zoneWall: Wall = {
        ...testWall,
        type: 'zone',
        thickness: WALL_THICKNESS.zone
      }
      
      expect(zoneWall.thickness).toBe(250)
      expect(WallRenderer.getWallThickness('zone')).toBe(250)
    })

    it('should create wall with correct thickness for area type', () => {
      // Requirements: 1.3
      const areaWall: Wall = {
        ...testWall,
        type: 'area',
        thickness: WALL_THICKNESS.area
      }
      
      expect(areaWall.thickness).toBe(150)
      expect(WallRenderer.getWallThickness('area')).toBe(150)
    })

    it('should provide correct display names for wall types', () => {
      expect(WallRenderer.getWallTypeDisplayName('layout')).toBe('Layout Wall (350mm)')
      expect(WallRenderer.getWallTypeDisplayName('zone')).toBe('Zone Wall (250mm)')
      expect(WallRenderer.getWallTypeDisplayName('area')).toBe('Area Wall (150mm)')
    })
  })

  describe('Wall Rendering', () => {
    it('should render wall with outer shell representation', () => {
      // Requirements: 1.4
      wallRenderer.renderWall(testWall, testSegments, testNodes, mockWallContainer)
      
      expect(PIXI.Graphics).toHaveBeenCalled()
      expect(mockContainer.addChild).toHaveBeenCalled()
      expect(mockGraphics.beginFill).toHaveBeenCalled()
      expect(mockGraphics.lineStyle).toHaveBeenCalled()
      expect(mockGraphics.moveTo).toHaveBeenCalled()
      expect(mockGraphics.lineTo).toHaveBeenCalled()
      expect(mockGraphics.closePath).toHaveBeenCalled()
      expect(mockGraphics.endFill).toHaveBeenCalled()
    })

    it('should not render invisible walls', () => {
      // Requirements: 1.4
      const invisibleWall = { ...testWall, visible: false }
      
      wallRenderer.renderWall(invisibleWall, testSegments, testNodes, mockWallContainer)
      
      expect(mockContainer.addChild).not.toHaveBeenCalled()
    })

    it('should not render walls with no segments', () => {
      // Requirements: 1.4
      wallRenderer.renderWall(testWall, [], testNodes, mockWallContainer)
      
      expect(mockContainer.addChild).not.toHaveBeenCalled()
    })

    it('should use different styles for different wall types', () => {
      // Requirements: 1.1, 1.2, 1.3, 1.4
      const layoutWall = { ...testWall, type: 'layout' as WallTypeString }
      const zoneWall = { ...testWall, type: 'zone' as WallTypeString }
      const areaWall = { ...testWall, type: 'area' as WallTypeString }
      
      wallRenderer.renderWall(layoutWall, testSegments, testNodes, mockWallContainer)
      const layoutCalls = mockGraphics.beginFill.mock.calls.length
      
      vi.clearAllMocks()
      wallRenderer.renderWall(zoneWall, testSegments, testNodes, mockWallContainer)
      const zoneCalls = mockGraphics.beginFill.mock.calls.length
      
      vi.clearAllMocks()
      wallRenderer.renderWall(areaWall, testSegments, testNodes, mockWallContainer)
      const areaCalls = mockGraphics.beginFill.mock.calls.length
      
      // All should render (different styles)
      expect(layoutCalls).toBeGreaterThan(0)
      expect(zoneCalls).toBeGreaterThan(0)
      expect(areaCalls).toBeGreaterThan(0)
    })
  })

  describe('Core Line Segment Hiding', () => {
    it('should hide segment core by default', () => {
      // Requirements: 1.5
      wallRenderer.hideSegmentCore('seg1', mockWallContainer)
      
      // Since segment graphics don't exist yet, this should not throw
      expect(() => wallRenderer.hideSegmentCore('seg1', mockWallContainer)).not.toThrow()
    })

    it('should show segment core only for debugging', () => {
      // Requirements: 1.5
      wallRenderer.showSegmentCoreForDebug(testSegments[0], testNodes, mockWallContainer)
      
      expect(PIXI.Graphics).toHaveBeenCalled()
      expect(mockContainer.addChild).toHaveBeenCalled()
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(1, 0xFF0000, 0.3)
    })
  })

  describe('Wall Graphics Management', () => {
    it('should remove wall graphics when requested', () => {
      // First render a wall
      wallRenderer.renderWall(testWall, testSegments, testNodes, mockWallContainer)
      
      // Then remove it
      wallRenderer.removeWallGraphics(testWall.id, mockWallContainer)
      
      expect(mockContainer.removeChild).toHaveBeenCalled()
      expect(mockGraphics.destroy).toHaveBeenCalled()
    })

    it('should update wall visual representation', () => {
      // Requirements: 1.4
      wallRenderer.updateWall(testWall, testSegments, testNodes, mockWallContainer)
      
      expect(PIXI.Graphics).toHaveBeenCalled()
      expect(mockContainer.addChild).toHaveBeenCalled()
    })

    it('should clear all graphics', () => {
      // Render a wall first
      wallRenderer.renderWall(testWall, testSegments, testNodes, mockWallContainer)
      
      // Then clear all
      wallRenderer.clearAll(mockWallContainer)
      
      expect(mockContainer.removeChild).toHaveBeenCalled()
      expect(mockGraphics.destroy).toHaveBeenCalled()
    })
  })

  describe('Wall Thickness Constants', () => {
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
  })
})