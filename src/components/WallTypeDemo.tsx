import { useState, useEffect, useRef } from 'react'
import { CanvasContainer } from './CanvasContainer'
import { ToolPalette } from './ToolPalette'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
// import { WallRenderer } from '@/lib/WallRenderer' // Future: For rendering walls
import type { WallTypeString } from '@/lib/types'
import type { Tool } from './ToolPalette'

/**
 * Demo component showing wall type system integration
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export function WallTypeDemo() {
  const [activeWallType, setActiveWallType] = useState<WallTypeString>('layout')
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [gridVisible, setGridVisible] = useState(false)
  
  const modelRef = useRef(new FloorPlanModel())
  // Future: Will be used for rendering walls on canvas
  // const rendererRef = useRef(new WallRenderer())
  // const layersRef = useRef<CanvasLayers | null>(null)

  // Demo: Create sample walls of different types
  useEffect(() => {
    const model = modelRef.current
    
    // Create sample nodes
    const node1 = model.createNode(50, 100)
    const node2 = model.createNode(200, 100)
    const node3 = model.createNode(50, 200)
    const node4 = model.createNode(200, 200)
    const node5 = model.createNode(50, 300)
    const node6 = model.createNode(200, 300)
    
    // Create sample segments
    const segment1 = model.createSegment(node1.id, node2.id) // Layout wall
    const segment2 = model.createSegment(node3.id, node4.id) // Zone wall
    const segment3 = model.createSegment(node5.id, node6.id) // Area wall
    
    if (segment1 && segment2 && segment3) {
      // Create walls of different types
      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])
      model.createWall('area', [segment3.id])
    }
  }, [])

  const handleWallTypeChange = (type: WallTypeString) => {
    setActiveWallType(type)
    console.log(`Selected wall type: ${type} (${type === 'layout' ? '350mm' : type === 'zone' ? '250mm' : '150mm'})`)
  }

  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool)
    console.log(`Selected tool: ${tool}`)
  }

  const handleGridToggle = () => {
    setGridVisible(!gridVisible)
    console.log(`Grid visibility: ${!gridVisible}`)
  }

  const handleReferenceImageLoad = () => {
    console.log('Reference image load requested')
  }

  const handleMouseMove = () => {
    // Future: Update status or handle mouse movement
  }

  return (
    <div className="flex flex-col h-screen">
      <ToolPalette
        activeWallType={activeWallType}
        activeTool={activeTool}
        gridVisible={gridVisible}
        onWallTypeChange={handleWallTypeChange}
        onToolChange={handleToolChange}
        onGridToggle={handleGridToggle}
        onReferenceImageLoad={handleReferenceImageLoad}
      />
      
      <div className="flex-1 flex">
        <CanvasContainer
          className="flex-1"
          onMouseMove={handleMouseMove}
        />
        
        <div className="w-64 p-4 border-l bg-muted/50">
          <h3 className="font-semibold mb-3">Wall Type System</h3>
          
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm">Active Wall Type</h4>
              <p className="text-sm text-muted-foreground">
                {activeWallType === 'layout' && 'Layout Wall (350mm)'}
                {activeWallType === 'zone' && 'Zone Wall (250mm)'}
                {activeWallType === 'area' && 'Area Wall (150mm)'}
              </p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm">Active Tool</h4>
              <p className="text-sm text-muted-foreground capitalize">{activeTool}</p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm">Grid</h4>
              <p className="text-sm text-muted-foreground">
                {gridVisible ? 'Visible' : 'Hidden'}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="font-medium text-sm mb-2">Wall Types</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-700 border"></div>
                <span>Layout (350mm)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 border"></div>
                <span>Zone (250mm)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 border"></div>
                <span>Area (150mm)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}