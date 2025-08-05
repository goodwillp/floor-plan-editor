import { useState, useRef } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MenuBar } from '@/components/MenuBar'
import { ToolPalette, type Tool } from '@/components/ToolPalette'
import type { WallTypeString } from '@/lib/types'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { Sidebar } from '@/components/Sidebar'
import { StatusBar } from '@/components/StatusBar'
import { useErrorHandler } from '@/hooks/useErrorHandler'

function App() {
  // Tool state
  const [activeWallType, setActiveWallType] = useState<WallTypeString>('layout')
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [gridVisible, setGridVisible] = useState(false)
  
  // Viewport state
  const [viewport, setViewport] = useState({
    zoom: 1.0,
    panX: 0,
    panY: 0
  })
  
  // Reference image state
  const [referenceImage, setReferenceImage] = useState({
    hasImage: false,
    isLocked: true,
    isVisible: true
  })
  
  // Canvas state
  const [mouseCoordinates, setMouseCoordinates] = useState({ x: 0, y: 0 })
  const [statusMessage, setStatusMessage] = useState('Ready')
  
  // Wall selection state
  const [selectedWallIds, setSelectedWallIds] = useState<string[]>([])
  const [wallProperties, setWallProperties] = useState<any[]>([])
  
  // Proximity merging state
  const [proximityMergingEnabled, setProximityMergingEnabled] = useState(false)
  const [proximityThreshold, setProximityThreshold] = useState(15)
  const [activeMerges, setActiveMerges] = useState<any[]>([])
  const [mergeStats, setMergeStats] = useState({ totalMerges: 0, averageDistance: 0, mergesByType: {} })
  
  // Error handling state
  const {
    errorLog,
    memoryInfo,
    isRecovering,
    errorStats,
    clearErrorLog,
    setMemoryThresholds
  } = useErrorHandler({
    onError: (errorInfo) => {
      setStatusMessage(`Error: ${errorInfo.userMessage || errorInfo.message}`)
    },
    onMemoryWarning: (memoryInfo) => {
      setStatusMessage(`Memory usage high: ${(memoryInfo.percentage * 100).toFixed(1)}%`)
    },
    onRecoveryAttempt: (errorInfo) => {
      setStatusMessage(`Recovering from ${errorInfo.type} error...`)
    }
  })
  
  const selectedCount = selectedWallIds.length

  // Menu handlers
  const handleSave = () => setStatusMessage('Save functionality not yet implemented')
  const handleLoad = () => setStatusMessage('Load functionality not yet implemented')
  const handleExport = () => setStatusMessage('Export functionality not yet implemented')
  const handleUndo = () => setStatusMessage('Undo functionality not yet implemented')
  const handleRedo = () => setStatusMessage('Redo functionality not yet implemented')
  const handleZoomIn = () => {
    setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }))
    setStatusMessage('Zoomed in')
  }
  const handleZoomOut = () => {
    setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }))
    setStatusMessage('Zoomed out')
  }
  const handleReset = () => {
    setViewport({ zoom: 1, panX: 0, panY: 0 })
    setStatusMessage('View reset')
  }

  // Tool handlers
  const handleActiveWallTypeChange = (type: WallTypeString) => {
    setActiveWallType(type)
    setStatusMessage(`Selected ${type} wall type`)
  }

  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool)
    setStatusMessage(`Activated ${tool} tool`)
  }

  const handleGridToggle = () => {
    setGridVisible(prev => !prev)
    setStatusMessage(gridVisible ? 'Grid hidden' : 'Grid visible')
  }

  // Viewport handlers
  const handleViewportChange = (newViewport: { zoom: number; panX: number; panY: number }) => {
    setViewport(newViewport)
  }

  // Reference image handlers
  const handleReferenceImageUpdate = (state: { hasImage: boolean; isLocked: boolean; isVisible: boolean }) => {
    setReferenceImage(state)
  }

  const drawingCanvasRef = useRef<any>(null) // Will hold reference to DrawingCanvas functions

  const handleReferenceImageLoad = async (file: File) => {
    try {
      if (drawingCanvasRef.current?.loadReferenceImage) {
        await drawingCanvasRef.current.loadReferenceImage(file)
        setStatusMessage(`Reference image loaded: ${file.name}`)
      }
    } catch (error) {
      setStatusMessage(`Failed to load reference image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleReferenceImageToggleLock = () => {
    if (drawingCanvasRef.current?.toggleReferenceImageLock) {
      const locked = drawingCanvasRef.current.toggleReferenceImageLock()
      setStatusMessage(`Reference image ${locked ? 'locked' : 'unlocked'}`)
    }
  }

  const handleReferenceImageToggleVisibility = () => {
    if (drawingCanvasRef.current?.toggleReferenceImageVisibility) {
      const visible = drawingCanvasRef.current.toggleReferenceImageVisibility()
      setStatusMessage(`Reference image ${visible ? 'shown' : 'hidden'}`)
    }
  }



  const handleMouseMove = (coordinates: { x: number; y: number }) => {
    setMouseCoordinates(coordinates)
  }

  const handleWallCreated = (wallId: string) => {
    setStatusMessage(`Wall created: ${wallId}`)
  }

  const handleWallSelected = (wallIds: string[], properties: any[]) => {
    setSelectedWallIds(wallIds)
    setWallProperties(properties)
    if (wallIds.length > 0) {
      setStatusMessage(`Selected ${wallIds.length} wall(s)`)
    } else {
      setStatusMessage('Selection cleared')
    }
  }

  const handleWallDeleted = (wallIds: string[]) => {
    setSelectedWallIds([])
    setWallProperties([])
    setStatusMessage(`Deleted ${wallIds.length} wall(s)`)
  }

  const handleWallTypeChange = (wallIds: string[], newType: WallTypeString) => {
    setStatusMessage(`Updated ${wallIds.length} wall(s) to ${newType} type`)
    // Wall properties will be updated by the canvas
  }

  const handleWallVisibilityChange = (wallIds: string[], visible: boolean) => {
    setStatusMessage(`${visible ? 'Showed' : 'Hidden'} ${wallIds.length} wall(s)`)
    // Wall properties will be updated by the canvas
  }

  const handleSelectionClear = () => {
    setSelectedWallIds([])
    setWallProperties([])
    setStatusMessage('Selection cleared')
  }

  const handleProximityMergingUpdate = (merges: any[], stats: any) => {
    setActiveMerges(merges)
    setMergeStats(stats)
  }

  const handleProximityMergingEnabledChange = (enabled: boolean) => {
    setProximityMergingEnabled(enabled)
    setStatusMessage(`Proximity merging ${enabled ? 'enabled' : 'disabled'}`)
  }

  const handleProximityThresholdChange = (threshold: number) => {
    setProximityThreshold(threshold)
    setStatusMessage(`Proximity threshold set to ${threshold}px`)
  }

  const handleProximityMergingRefresh = () => {
    setStatusMessage('Proximity merges refreshed')
  }

  const handleProximityMergingClearAll = () => {
    setActiveMerges([])
    setMergeStats({ totalMerges: 0, averageDistance: 0, mergesByType: {} })
    setStatusMessage('All proximity merges cleared')
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Menu Bar */}
        <MenuBar
          onSave={handleSave}
          onLoad={handleLoad}
          onExport={handleExport}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
        />

        {/* Tool Palette */}
        <ToolPalette 
          activeWallType={activeWallType}
          activeTool={activeTool}
          gridVisible={gridVisible}
          zoom={viewport.zoom}
          zoomPercentage={Math.round(viewport.zoom * 100)}
          canZoomIn={viewport.zoom < 5}
          canZoomOut={viewport.zoom > 0.1}
          hasReferenceImage={referenceImage.hasImage}
          referenceImageLocked={referenceImage.isLocked}
          referenceImageVisible={referenceImage.isVisible}
          onWallTypeChange={handleActiveWallTypeChange}
          onToolChange={handleToolChange}
          onGridToggle={handleGridToggle}
          onReferenceImageLoad={handleReferenceImageLoad}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={() => setViewport(prev => ({ ...prev, zoom: 1 }))}
          onResetViewport={handleReset}
          onReferenceImageToggleLock={handleReferenceImageToggleLock}
          onReferenceImageToggleVisibility={handleReferenceImageToggleVisibility}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <DrawingCanvas 
            className="flex-1"
            activeWallType={activeWallType}
            activeTool={activeTool}
            gridVisible={gridVisible}
            proximityMergingEnabled={proximityMergingEnabled}
            proximityThreshold={proximityThreshold}
            onMouseMove={handleMouseMove}
            onWallCreated={handleWallCreated}
            onWallSelected={handleWallSelected}
            onWallDeleted={handleWallDeleted}
            onGridToggle={handleGridToggle}
            onProximityMergingUpdate={handleProximityMergingUpdate}
            onStatusMessage={setStatusMessage}
            onViewportChange={handleViewportChange}
            onReferenceImageUpdate={handleReferenceImageUpdate}
          />
          
          {/* Sidebar */}
          <Sidebar 
            selectedWallIds={selectedWallIds}
            wallProperties={wallProperties}
            onWallTypeChange={handleWallTypeChange}
            onWallVisibilityChange={handleWallVisibilityChange}
            onWallDelete={handleWallDeleted}
            onSelectionClear={handleSelectionClear}
            proximityMergingEnabled={proximityMergingEnabled}
            proximityThreshold={proximityThreshold}
            activeMerges={activeMerges}
            mergeStats={mergeStats}
            onProximityMergingEnabledChange={handleProximityMergingEnabledChange}
            onProximityThresholdChange={handleProximityThresholdChange}
            onProximityMergingRefresh={handleProximityMergingRefresh}
            onProximityMergingClearAll={handleProximityMergingClearAll}
            // Error handling props
            errorLog={errorLog}
            memoryInfo={memoryInfo}
            isRecovering={isRecovering}
            errorStats={errorStats}
            onClearErrors={clearErrorLog}
            onSetMemoryThresholds={setMemoryThresholds}
          />
        </div>

        {/* Status Bar */}
        <StatusBar
          message={statusMessage}
          coordinates={mouseCoordinates}
          zoom={viewport.zoom}
          selectedCount={selectedCount}
        />
      </div>
    </TooltipProvider>
  )
}

export default App