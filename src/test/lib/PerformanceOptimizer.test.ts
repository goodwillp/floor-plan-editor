import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PerformanceOptimizer, ViewportCuller } from '@/lib/PerformanceOptimizer'
import type { Wall, Segment, Node } from '@/lib/types'

/**
 * Tests for performance optimization utilities
 * Requirements: 6.7, 9.5 - Optimize rendering performance for large floor plans
 */

describe('ViewportCuller', () => {
  let culler: ViewportCuller

  beforeEach(() => {
    culler = new ViewportCuller()
  })

  it('should update viewport bounds correctly', () => {
    culler.updateViewport(1.0, 0, 0, 800, 600)
    const bounds = culler.getViewportBounds()
    
    expect(bounds.minX).toBeLessThan(0)
    expect(bounds.maxX).toBeGreaterThan(800)
    expect(bounds.minY).toBeLessThan(0)
    expect(bounds.maxY).toBeGreaterThan(600)
  })

  it('should detect visible segments correctly', () => {
    culler.updateViewport(1.0, 0, 0, 800, 600)
    
    const nodes = new Map<string, Node>([
      ['node1', { id: 'node1', x: 100, y: 100, connectedSegments: ['seg1'], type: 'endpoint' }],
      ['node2', { id: 'node2', x: 200, y: 200, connectedSegments: ['seg1'], type: 'endpoint' }],
      ['node3', { id: 'node3', x: 1000, y: 1000, connectedSegments: ['seg2'], type: 'endpoint' }],
      ['node4', { id: 'node4', x: 1100, y: 1100, connectedSegments: ['seg2'], type: 'endpoint' }]
    ])

    const visibleSegment: Segment = {
      id: 'seg1',
      startNodeId: 'node1',
      endNodeId: 'node2',
      length: 141.42,
      angle: 45
    }

    const hiddenSegment: Segment = {
      id: 'seg2',
      startNodeId: 'node3',
      endNodeId: 'node4',
      length: 141.42,
      angle: 45
    }

    expect(culler.isSegmentVisible(visibleSegment, nodes)).toBe(true)
    expect(culler.isSegmentVisible(hiddenSegment, nodes)).toBe(false)
  })

  it('should detect visible walls correctly', () => {
    culler.updateViewport(1.0, 0, 0, 800, 600)
    
    const nodes = new Map<string, Node>([
      ['node1', { id: 'node1', x: 100, y: 100, connectedSegments: ['seg1'], type: 'endpoint' }],
      ['node2', { id: 'node2', x: 200, y: 200, connectedSegments: ['seg1'], type: 'endpoint' }]
    ])

    const segments: Segment[] = [{
      id: 'seg1',
      startNodeId: 'node1',
      endNodeId: 'node2',
      length: 141.42,
      angle: 45
    }]

    const visibleWall: Wall = {
      id: 'wall1',
      type: 'layout',
      thickness: 350,
      segmentIds: ['seg1'],
      visible: true
    }

    const invisibleWall: Wall = {
      id: 'wall2',
      type: 'layout',
      thickness: 350,
      segmentIds: ['seg1'],
      visible: false
    }

    expect(culler.isWallVisible(visibleWall, segments, nodes)).toBe(true)
    expect(culler.isWallVisible(invisibleWall, segments, nodes)).toBe(false)
  })
})

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer
  let mockContainer: any

  beforeEach(() => {
    optimizer = new PerformanceOptimizer()
    mockContainer = {
      removeChildren: vi.fn(),
      addChild: vi.fn()
    }
  })

  afterEach(() => {
    optimizer.destroy()
  })

  it('should initialize with default configuration', () => {
    const config = optimizer.getPerformanceMetrics()
    expect(config.renderStats.totalWalls).toBe(0)
    expect(config.renderStats.visibleWalls).toBe(0)
    expect(config.renderStats.culledWalls).toBe(0)
  })

  it('should update viewport correctly', () => {
    expect(() => {
      optimizer.updateViewport(1.0, 0, 0, 800, 600)
    }).not.toThrow()
  })

  it('should optimize wall rendering with culling', () => {
    optimizer.updateViewport(1.0, 0, 0, 800, 600)
    
    const walls = new Map<string, Wall>([
      ['wall1', {
        id: 'wall1',
        type: 'layout',
        thickness: 350,
        segmentIds: ['seg1'],
        visible: true
      }],
      ['wall2', {
        id: 'wall2',
        type: 'zone',
        thickness: 250,
        segmentIds: ['seg2'],
        visible: true
      }]
    ])

    const segments = new Map<string, Segment>([
      ['seg1', {
        id: 'seg1',
        startNodeId: 'node1',
        endNodeId: 'node2',
        length: 100,
        angle: 0
      }],
      ['seg2', {
        id: 'seg2',
        startNodeId: 'node3',
        endNodeId: 'node4',
        length: 100,
        angle: 0
      }]
    ])

    const nodes = new Map<string, Node>([
      ['node1', { id: 'node1', x: 100, y: 100, connectedSegments: ['seg1'], type: 'endpoint' }],
      ['node2', { id: 'node2', x: 200, y: 100, connectedSegments: ['seg1'], type: 'endpoint' }],
      ['node3', { id: 'node3', x: 1000, y: 1000, connectedSegments: ['seg2'], type: 'endpoint' }],
      ['node4', { id: 'node4', x: 1100, y: 1000, connectedSegments: ['seg2'], type: 'endpoint' }]
    ])

    const mockRenderCallback = vi.fn()

    const stats = optimizer.optimizeWallRendering(
      walls,
      segments,
      nodes,
      mockContainer,
      mockRenderCallback
    )

    expect(stats.totalWalls).toBe(2)
    expect(stats.visibleWalls).toBeGreaterThan(0)
    expect(stats.culledWalls).toBeGreaterThan(0)
    expect(stats.renderTime).toBeGreaterThan(0)
    expect(mockContainer.removeChildren).toHaveBeenCalled()
  })

  it('should track frame time correctly', () => {
    const initialMetrics = optimizer.getPerformanceMetrics()
    expect(initialMetrics.frameStats.averageFrameTime).toBe(0)

    // Simulate some rendering
    optimizer.optimizeWallRendering(
      new Map(),
      new Map(),
      new Map(),
      mockContainer,
      vi.fn()
    )

    const updatedMetrics = optimizer.getPerformanceMetrics()
    expect(updatedMetrics.frameStats.averageFrameTime).toBeGreaterThan(0)
  })

  it('should provide optimization recommendations', () => {
    const recommendations = optimizer.getOptimizationRecommendations()
    expect(Array.isArray(recommendations)).toBe(true)
  })

  it('should handle performance mode correctly', () => {
    const mockApp = {
      renderer: {
        antialias: true,
        resolution: 1
      }
    }
    
    const mockContainerWithApp = {
      ...mockContainer,
      parent: mockApp
    }

    expect(() => {
      optimizer.enablePerformanceMode(mockContainerWithApp)
    }).not.toThrow()

    expect(() => {
      optimizer.disablePerformanceMode(mockContainerWithApp)
    }).not.toThrow()
  })
})

describe('Performance Metrics', () => {
  let optimizer: PerformanceOptimizer

  beforeEach(() => {
    optimizer = new PerformanceOptimizer()
  })

  afterEach(() => {
    optimizer.destroy()
  })

  it('should calculate performance levels correctly', () => {
    const metrics = optimizer.getPerformanceMetrics()
    
    expect(metrics.frameStats.performanceLevel).toMatch(/^(good|warning|critical)$/)
    expect(typeof metrics.frameStats.fps).toBe('number')
    expect(typeof metrics.frameStats.averageFrameTime).toBe('number')
  })

  it('should track pool statistics', () => {
    const metrics = optimizer.getPerformanceMetrics()
    
    expect(typeof metrics.poolStats.poolSize).toBe('number')
    expect(typeof metrics.poolStats.inUse).toBe('number')
    expect(metrics.poolStats.poolSize).toBeGreaterThanOrEqual(0)
    expect(metrics.poolStats.inUse).toBeGreaterThanOrEqual(0)
  })
})