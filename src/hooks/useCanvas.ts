import { useContext, createContext, type ReactNode } from 'react'
import * as PIXI from 'pixi.js'
import type { CanvasLayers } from '@/components/CanvasContainer'

interface CanvasContextType {
  app: PIXI.Application | null
  layers: CanvasLayers | null
  isReady: boolean
}

export const CanvasContext = createContext<CanvasContextType>({
  app: null,
  layers: null,
  isReady: false
})

export function useCanvas() {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider')
  }
  return context
}

// Provider component will be implemented when needed for more complex canvas interactions
export interface CanvasProviderProps {
  children: ReactNode
  app: PIXI.Application | null
  layers: CanvasLayers | null
}