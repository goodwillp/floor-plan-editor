export type ToleranceConfig = {
  // Distance to project endpoints onto nearest centerline and subdivide
  projectionMinPx: number
  projectionMultiplier: number // multiplied by WALL_THICKNESS[type]

  // Distance to reuse an existing node instead of creating a new one
  nodeReuseMinPx: number
  nodeReuseMultiplier: number

  // Threshold passed to mergeNearbyNodes after draw/merge
  mergeNearbyMinPx: number
  mergeNearbyMultiplier: number
}

// Conservative defaults to keep tests stable; can be raised in the UI panel
export const toleranceConfig: ToleranceConfig = {
  projectionMinPx: 40,
  projectionMultiplier: 1.2,
  nodeReuseMinPx: 30,
  nodeReuseMultiplier: 0.5,
  mergeNearbyMinPx: 10,
  mergeNearbyMultiplier: 0.5,
}

export function updateToleranceConfig(partial: Partial<ToleranceConfig>): void {
  Object.assign(toleranceConfig, partial)
  try {
    console.log('⚙️ ToleranceConfig updated', toleranceConfig)
    window.dispatchEvent(new CustomEvent('tolerance-config-changed', { detail: { ...toleranceConfig } }))
  } catch {}
}

export function getToleranceConfig(): ToleranceConfig {
  return { ...toleranceConfig }
}


