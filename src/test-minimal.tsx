import { useCallback } from 'react'
import { OptimizedIconButton } from '@/components/ui/optimized-icon-button'
import { Save } from 'lucide-react'

export function TestMinimal() {
  const handleSave = useCallback(() => {
    console.log('Save clicked')
  }, [])

  return (
    <div className="p-4">
      <h1>Minimal Test</h1>
      <OptimizedIconButton
        icon={Save}
        tooltip="Save"
        onClick={handleSave}
        size="sm"
      />
    </div>
  )
}