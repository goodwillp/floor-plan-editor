import { useState, useRef, useEffect, useCallback } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MenuBar } from '@/components/MenuBar'
import { ToolPalette, type Tool } from '@/components/ToolPalette'
import type { WallTypeString } from '@/lib/types'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { Sidebar } from '@/components/Sidebar'
import { StatusBar } from '@/components/StatusBar'
import { PerformanceMonitor, usePerformanceMonitor } from '@/components/PerformanceMonitor'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { KeyboardShortcutManager, createDefaultShortcuts } from '@/lib/KeyboardShortcuts'
import { AccessibilityManager } from '@/lib/AccessibilityManager'
import { getWebGLInfo } from '@/lib/webgl-error-handler'

function App() {
  // Tool state
  const [activeWallType, setActiveWallType] = useState<WallTypeString | null>('layout')
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [gridVisible, setGridVisible] = useState(false)
  
  // Performance state
  const [isPerformanceModeEnabled, setIsPerformanceModeEnabled] = useState(false)
  const [renderStats, setRenderStats] = useState<any>(null)
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false)
  
  // Accessibility and keyboard shortcuts
  const [keyboardShortcutManager] = useState(() => new KeyboardShortcutManager())
  const [accessibilityManager] = useState(() => new AccessibilityManager())
  const [shortcutGroups, setShortcutGroups] = useState<any[]>([])
  
  // Performance monitoring
  const performanceMetrics = usePerformanceMonitor()
  
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
  // Walls layer visibility (separate from per-wall visibility)
  const [wallsVisible, setWallsVisible] = useState(true)
  const [wallLayerVisibility, setWallLayerVisibility] = useState<{ layout: boolean; zone: boolean; area: boolean }>({
    layout: true,
    zone: true,
    area: true
  })
  const [wallLayerDebug, setWallLayerDebug] = useState<{
    layout: { guides: boolean; shell: boolean }
    zone: { guides: boolean; shell: boolean }
    area: { guides: boolean; shell: boolean }
  }>({
    layout: { guides: false, shell: false },
    zone: { guides: false, shell: false },
    area: { guides: false, shell: false }
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

  // Menu handlers - wrapped in useCallback to prevent infinite re-renders
  const handleSave = useCallback(() => setStatusMessage('Save functionality not yet implemented'), [])
  const handleLoad = useCallback(() => setStatusMessage('Load functionality not yet implemented'), [])
  const handleExport = useCallback(() => setStatusMessage('Export functionality not yet implemented'), [])
  const handleUndo = useCallback(() => setStatusMessage('Undo functionality not yet implemented'), [])
  const handleRedo = useCallback(() => setStatusMessage('Redo functionality not yet implemented'), [])
  const handleZoomIn = useCallback(() => {
    setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }))
    setStatusMessage('Zoomed in')
  }, [])
  const handleZoomOut = useCallback(() => {
    setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }))
    setStatusMessage('Zoomed out')
  }, [])
  const handleReset = useCallback(() => {
    setViewport({ zoom: 1, panX: 0, panY: 0 })
    setStatusMessage('View reset')
  }, [])

  // Tool handlers - wrapped in useCallback to prevent infinite re-renders
  const handleActiveWallTypeChange = useCallback((type: WallTypeString | null) => {
    setActiveWallType(type)
    setStatusMessage(type ? `Selected ${type} wall type` : 'Wall type cleared')
  }, [])

  const handleToolChange = useCallback((tool: Tool) => {
    setActiveTool(tool)
    setStatusMessage(`Activated ${tool} tool`)
  }, [])

  const handleGridToggle = useCallback(() => {
    setGridVisible(prev => !prev)
    setStatusMessage(gridVisible ? 'Grid hidden' : 'Grid visible')
  }, [gridVisible])

  const handleWallsToggle = useCallback(() => {
    setWallsVisible(prev => !prev)
    setStatusMessage(wallsVisible ? 'Walls hidden' : 'Walls visible')
  }, [wallsVisible])

  const handleWallLayerVisibilityChange = useCallback((layer: 'layout' | 'zone' | 'area', visible: boolean) => {
    setWallLayerVisibility(prev => ({ ...prev, [layer]: visible }))
    setStatusMessage(`${visible ? 'Shown' : 'Hidden'} ${layer} walls`)
  }, [])

  const handleToggleGuides = useCallback((scope: 'all' | 'layout' | 'zone' | 'area') => {
    setWallLayerDebug(prev => {
      if (scope === 'all') {
        const next = !prev.layout.guides || !prev.zone.guides || !prev.area.guides
        return {
          layout: { ...prev.layout, guides: next },
          zone: { ...prev.zone, guides: next },
          area: { ...prev.area, guides: next }
        }
      }
      return { ...prev, [scope]: { ...prev[scope], guides: !prev[scope].guides } }
    })
  }, [])

  const handleToggleShell = useCallback((scope: 'all' | 'layout' | 'zone' | 'area') => {
    setWallLayerDebug(prev => {
      if (scope === 'all') {
        const next = !prev.layout.shell || !prev.zone.shell || !prev.area.shell
        return {
          layout: { ...prev.layout, shell: next },
          zone: { ...prev.zone, shell: next },
          area: { ...prev.area, shell: next }
        }
      }
      return { ...prev, [scope]: { ...prev[scope], shell: !prev[scope].shell } }
    })
  }, [])

  // Viewport handlers - wrapped in useCallback to prevent infinite re-renders
  const handleViewportChange = useCallback((newViewport: { zoom: number; panX: number; panY: number }) => {
    setViewport(newViewport)
  }, [])

  // Reference image handlers - wrapped in useCallback to prevent infinite re-renders
  const handleReferenceImageUpdate = useCallback((state: { hasImage: boolean; isLocked: boolean; isVisible: boolean }) => {
    setReferenceImage(state)
  }, [])

  const drawingCanvasRef = useRef<any>(null) // Will hold reference to DrawingCanvas functions
  const selectedWallIdsRef = useRef<string[]>([])
  
  // Update ref when selectedWallIds changes
  useEffect(() => {
    selectedWallIdsRef.current = selectedWallIds
  }, [selectedWallIds])
  
  // Check WebGL support on mount
  useEffect(() => {
    const webglInfo = getWebGLInfo()
    if (!webglInfo.supported) {
      setStatusMessage('WebGL not supported - using fallback renderer')
      console.warn('WebGL not supported, application will use canvas fallback')
    } else {
      console.log('WebGL supported:', webglInfo)
    }
  }, [])

  // Initialize keyboard shortcuts (only once)
  useEffect(() => {
    const shortcuts = createDefaultShortcuts({
      // File operations
      save: handleSave,
      load: handleLoad,
      export: handleExport,
      
      // Edit operations
      undo: handleUndo,
      redo: handleRedo,
      delete: () => {
        if (selectedWallIdsRef.current.length > 0) {
          handleWallDeleted(selectedWallIdsRef.current)
        }
      },
      selectAll: () => {
        // TODO: Implement select all
        setStatusMessage('Select all not yet implemented')
      },
      copy: () => setStatusMessage('Copy not yet implemented'),
      paste: () => setStatusMessage('Paste not yet implemented'),
      
      // View operations
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      zoomFit: () => setStatusMessage('Zoom fit not yet implemented'),
      zoomActual: () => setViewport({ zoom: 1, panX: 0, panY: 0 }),
      toggleGrid: handleGridToggle,
      resetView: handleReset,
      
      // Tool operations
      selectTool: () => handleToolChange('select'),
      drawTool: () => handleToolChange('draw'),
      moveTool: () => setStatusMessage('Move tool not implemented'),
      deleteTool: () => handleToolChange('delete'),
      
      // Wall type operations
      layoutWall: () => handleActiveWallTypeChange('layout'),
      zoneWall: () => handleActiveWallTypeChange('zone'),
      areaWall: () => handleActiveWallTypeChange('area')
    })
    
    shortcuts.forEach(shortcut => keyboardShortcutManager.register(shortcut))
    setShortcutGroups(keyboardShortcutManager.getShortcutGroups())
    
    return () => {
      keyboardShortcutManager.destroy()
      accessibilityManager.destroy()
    }
  }, []) // Empty dependency array - only run once
  
  // Performance mode handlers
  const handleEnablePerformanceMode = useCallback(() => {
    setIsPerformanceModeEnabled(true)
    setStatusMessage('Performance mode enabled')
  }, [])
  
  const handleDisablePerformanceMode = useCallback(() => {
    setIsPerformanceModeEnabled(false)
    setStatusMessage('Performance mode disabled')
  }, [])
  
  // Render stats update handler
  // const handleRenderStatsUpdate = useCallback((stats: any) => {
  //   setRenderStats(stats)
  // }, [])

  const handleReferenceImageLoad = useCallback(async (file: File) => {
    try {
      if (drawingCanvasRef.current?.loadReferenceImage) {
        await drawingCanvasRef.current.loadReferenceImage(file)
        setStatusMessage(`Reference image loaded: ${file.name}`)
      }
    } catch (error) {
      setStatusMessage(`Failed to load reference image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const handleReferenceImageToggleLock = useCallback(() => {
    if (drawingCanvasRef.current?.toggleReferenceImageLock) {
      const locked = drawingCanvasRef.current.toggleReferenceImageLock()
      setStatusMessage(`Reference image ${locked ? 'locked' : 'unlocked'}`)
    }
  }, [])

  const handleReferenceImageToggleVisibility = useCallback(() => {
    if (drawingCanvasRef.current?.toggleReferenceImageVisibility) {
      const visible = drawingCanvasRef.current.toggleReferenceImageVisibility()
      setStatusMessage(`Reference image ${visible ? 'shown' : 'hidden'}`)
    }
  }, [])

  const handleMouseMove = useCallback((coordinates: { x: number; y: number }) => {
    setMouseCoordinates(coordinates)
  }, [])

  const handleWallCreated = useCallback((wallId: string) => {
    setStatusMessage(`Wall created: ${wallId}`)
  }, [])

  const handleWallSelected = useCallback((wallIds: string[], properties: any[]) => {
    setSelectedWallIds(wallIds)
    setWallProperties(properties)
    if (wallIds.length > 0) {
      setStatusMessage(`Selected ${wallIds.length} wall(s)`)
    } else {
      setStatusMessage('Selection cleared')
    }
  }, [])

  const handleWallDeleted = useCallback((wallIds: string[]) => {
    setSelectedWallIds([])
    setWallProperties([])
    setStatusMessage(`Deleted ${wallIds.length} wall(s)`)
  }, [])

  const handleWallTypeChange = useCallback((wallIds: string[], newType: WallTypeString) => {
    setStatusMessage(`Updated ${wallIds.length} wall(s) to ${newType} type`)
    // Wall properties will be updated by the canvas
  }, [])

  const handleWallVisibilityChange = useCallback((wallIds: string[], visible: boolean) => {
    setStatusMessage(`${visible ? 'Showed' : 'Hidden'} ${wallIds.length} wall(s)`)
    // Wall properties will be updated by the canvas
  }, [])

  const handleSelectionClear = useCallback(() => {
    setSelectedWallIds([])
    setWallProperties([])
    setStatusMessage('Selection cleared')
  }, [])

  const handleProximityMergingUpdate = useCallback((merges: any[], stats: any) => {
    setActiveMerges(merges)
    setMergeStats(stats)
  }, [])

  const handleProximityMergingEnabledChange = useCallback((enabled: boolean) => {
    setProximityMergingEnabled(enabled)
    setStatusMessage(`Proximity merging ${enabled ? 'enabled' : 'disabled'}`)
  }, [])

  const handleProximityThresholdChange = useCallback((threshold: number) => {
    setProximityThreshold(threshold)
    setStatusMessage(`Proximity threshold set to ${threshold}px`)
  }, [])

  const handleProximityMergingRefresh = useCallback(() => {
    setStatusMessage('Proximity merges refreshed')
  }, [])

  const handleProximityMergingClearAll = useCallback(() => {
    setActiveMerges([])
    setMergeStats({ totalMerges: 0, averageDistance: 0, mergesByType: {} })
    setStatusMessage('All proximity merges cleared')
  }, [])

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Skip links for accessibility */}
        <div className="sr-only">
          <a href="#main-canvas" className="skip-link">Skip to canvas</a>
          <a href="#tool-palette" className="skip-link">Skip to tools</a>
          <a href="#sidebar" className="skip-link">Skip to sidebar</a>
        </div>

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
        
        {/* Additional controls */}
        <div className="flex items-center justify-end px-2 py-1 border-b bg-background">
          <div className="flex items-center gap-2">
            <KeyboardShortcutsHelp shortcuts={shortcutGroups} />
            
            <button
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle performance monitor"
            >
              Performance
            </button>
          </div>
        </div>

        {/* Tool Palette */}
        <div id="tool-palette">
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
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div id="main-canvas" className="flex-1">
            <DrawingCanvas 
              ref={drawingCanvasRef}
              className="flex-1"
              activeWallType={activeWallType}
              activeTool={activeTool}
              gridVisible={gridVisible}
              wallsVisible={wallsVisible}
              wallLayerVisibility={wallLayerVisibility}
              wallLayerDebug={wallLayerDebug}
              proximityMergingEnabled={proximityMergingEnabled}
              proximityThreshold={proximityThreshold}
              // isPerformanceModeEnabled is not a prop on DrawingCanvas
              onMouseMove={handleMouseMove}
              onWallCreated={handleWallCreated}
              onWallSelected={handleWallSelected}
              onWallDeleted={handleWallDeleted}
              // onGridToggle is not consumed by DrawingCanvas; grid visibility is controlled via gridVisible prop
              onProximityMergingUpdate={handleProximityMergingUpdate}
              onStatusMessage={setStatusMessage}
              onViewportChange={handleViewportChange}
              onReferenceImageUpdate={handleReferenceImageUpdate}
              // onRenderStatsUpdate is not a prop on DrawingCanvas
            />
          </div>
          
          {/* Sidebar */}
          <div id="sidebar">
            <Sidebar 
              selectedWallIds={selectedWallIds}
              wallProperties={wallProperties}
              onWallTypeChange={handleWallTypeChange}
              onWallVisibilityChange={handleWallVisibilityChange}
              onWallDelete={handleWallDeleted}
              onSelectionClear={handleSelectionClear}
              // Layers panel state/handlers
              hasReferenceImage={referenceImage.hasImage}
              wallsVisible={wallsVisible}
              wallLayerVisibility={wallLayerVisibility}
              wallLayerDebug={wallLayerDebug}
              gridVisible={gridVisible}
              referenceImageVisible={referenceImage.isVisible}
              referenceImageLocked={referenceImage.isLocked}
              onGridToggle={handleGridToggle}
              onWallsToggle={handleWallsToggle}
              onToggleGuides={handleToggleGuides}
              onToggleShell={handleToggleShell}
              onWallLayerVisibilityChange={handleWallLayerVisibilityChange}
              onReferenceImageToggleVisibility={handleReferenceImageToggleVisibility}
              onReferenceImageToggleLock={handleReferenceImageToggleLock}
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
        </div>

        {/* Status Bar */}
        <StatusBar
          message={statusMessage}
          coordinates={mouseCoordinates}
          zoom={viewport.zoom}
          selectedCount={selectedCount}
        />
        
        {/* Performance Monitor */}
        {showPerformanceMonitor && (
          <PerformanceMonitor
            renderStats={renderStats}
            frameStats={performanceMetrics.frameStats}
            memoryStats={performanceMetrics.memoryStats}
            recommendations={renderStats?.recommendations || []}
            onEnablePerformanceMode={handleEnablePerformanceMode}
            onDisablePerformanceMode={handleDisablePerformanceMode}
            isPerformanceModeEnabled={isPerformanceModeEnabled}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

export default App