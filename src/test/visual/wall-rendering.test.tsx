import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { WallRenderer } from '@/lib/WallRenderer'
import { WallType } from '@/lib/types'
import { captureCanvasSnapshot } from '../visual-setup'

describe('Wall Rendering Visual Tests', () => {
  let model: FloorPlanModel
  let renderer: WallRenderer
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    model = new FloorPlanModel()
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    renderer = new WallRenderer(canvas.getContext('2d')!)
  })

  it('should render layout walls with correct thickness', () => {
    // Create a layout wall
    const node1 = model.createNode(100, 100)
    const node2 = model.createNode(300, 100)
    const segment = model.createSegment(node1.id, node2.id)
    const wall = model.createWall(WallType.LAYOUT, [segment.id])

    // Render the wall
    renderer.renderWall(wall, model.getSegmentsByIds(wall.segmentIds), model)

    // Capture snapshot
    const snapshot = captureCanvasSnapshot(canvas)
    
    // This would compare against a stored baseline image
    expect(snapshot).toMatchSnapshot('layout-wall-350mm.png')
  })

  it('should render zone walls with correct thickness', () => {
    const node1 = model.createNode(100, 200)
    const node2 = model.createNode(300, 200)
    const segment = model.createSegment(node1.id, node2.id)
    const wall = model.createWall(WallType.ZONE, [segment.id])

    renderer.renderWall(wall, model.getSegmentsByIds(wall.segmentIds), model)
    const snapshot = captureCanvasSnapshot(canvas)
    
    expect(snapshot).toMatchSnapshot('zone-wall-250mm.png')
  })

  it('should render area walls with correct thickness', () => {
    const node1 = model.createNode(100, 300)
    const node2 = model.createNode(300, 300)
    const segment = model.createSegment(node1.id, node2.id)
    const wall = model.createWall(WallType.AREA, [segment.id])

    renderer.renderWall(wall, model.getSegmentsByIds(wall.segmentIds), model)
    const snapshot = captureCanvasSnapshot(canvas)
    
    expect(snapshot).toMatchSnapshot('area-wall-150mm.png')
  })

  it('should render wall intersections correctly', () => {
    // Create intersecting walls
    const node1 = model.createNode(100, 100)
    const node2 = model.createNode(300, 100)
    const node3 = model.createNode(200, 50)
    const node4 = model.createNode(200, 150)
    
    const segment1 = model.createSegment(node1.id, node2.id)
    const segment2 = model.createSegment(node3.id, node4.id)
    
    const wall1 = model.createWall(WallType.LAYOUT, [segment1.id])
    const wall2 = model.createWall(WallType.ZONE, [segment2.id])

    // Process intersection
    model.processIntersections()

    // Render both walls
    const walls = model.getAllWalls()
    walls.forEach(wall => {
      renderer.renderWall(wall, model.getSegmentsByIds(wall.segmentIds), model)
    })

    const snapshot = captureCanvasSnapshot(canvas)
    expect(snapshot).toMatchSnapshot('wall-intersection.png')
  })

  it('should render multi-segment walls correctly', () => {
    // Create L-shaped wall
    const node1 = model.createNode(100, 100)
    const node2 = model.createNode(200, 100)
    const node3 = model.createNode(200, 200)
    
    const segment1 = model.createSegment(node1.id, node2.id)
    const segment2 = model.createSegment(node2.id, node3.id)
    
    const wall = model.createWall(WallType.LAYOUT, [segment1.id, segment2.id])

    renderer.renderWall(wall, model.getSegmentsByIds(wall.segmentIds), model)
    const snapshot = captureCanvasSnapshot(canvas)
    
    expect(snapshot).toMatchSnapshot('l-shaped-wall.png')
  })

  it('should render selected walls with highlight', () => {
    const node1 = model.createNode(100, 100)
    const node2 = model.createNode(300, 100)
    const segment = model.createSegment(node1.id, node2.id)
    const wall = model.createWall(WallType.LAYOUT, [segment.id])

    // Render wall as selected
    renderer.renderWall(wall, model.getSegmentsByIds(wall.segmentIds), model, true)
    
    const snapshot = captureCanvasSnapshot(canvas)
    expect(snapshot).toMatchSnapshot('selected-wall.png')
  })

  it('should render proximity merged walls correctly', () => {
    // Create two parallel walls close together
    const node1 = model.createNode(100, 100)
    const node2 = model.createNode(300, 100)
    const node3 = model.createNode(100, 110)
    const node4 = model.createNode(300, 110)
    
    const segment1 = model.createSegment(node1.id, node2.id)
    const segment2 = model.createSegment(node3.id, node4.id)
    
    const wall1 = model.createWall(WallType.LAYOUT, [segment1.id])
    const wall2 = model.createWall(WallType.LAYOUT, [segment2.id])

    // Render both walls (proximity merging would be handled by the service)
    renderer.renderWall(wall1, model.getSegmentsByIds(wall1.segmentIds), model)
    renderer.renderWall(wall2, model.getSegmentsByIds(wall2.segmentIds), model)
    
    const snapshot = captureCanvasSnapshot(canvas)
    expect(snapshot).toMatchSnapshot('proximity-merged-walls.png')
  })
})