import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Keyboard, HelpCircle } from 'lucide-react'
import type { ShortcutGroup } from '@/lib/KeyboardShortcuts'

/**
 * Keyboard shortcuts help dialog
 * Requirements: 7.5 - Add keyboard shortcuts for common operations
 */

export interface KeyboardShortcutsHelpProps {
  shortcuts: ShortcutGroup[]
  className?: string
}

export function KeyboardShortcutsHelp({ shortcuts, className }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatShortcut = (shortcut: any) => {
    const parts: string[] = []
    
    if (shortcut.ctrlKey || shortcut.metaKey) {
      parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    }
    if (shortcut.altKey) {
      parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt')
    }
    if (shortcut.shiftKey) {
      parts.push('⇧')
    }
    
    parts.push(shortcut.key.toUpperCase())
    
    return parts
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${className}`}
          aria-label="Show keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {shortcuts.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {group.category}
              </h3>
              
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, shortcutIndex) => (
                  <div
                    key={shortcutIndex}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    
                    <div className="flex items-center gap-1">
                      {formatShortcut(shortcut).map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span className="text-xs text-muted-foreground mx-1">+</span>
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs font-mono px-2 py-1 min-w-[2rem] text-center"
                          >
                            {key}
                          </Badge>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {groupIndex < shortcuts.length - 1 && <Separator />}
            </div>
          ))}
          
          {shortcuts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No keyboard shortcuts available</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Tips:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Press <Badge variant="outline" className="text-xs mx-1">Esc</Badge> to cancel current operation</li>
            <li>• Hold <Badge variant="outline" className="text-xs mx-1">Space</Badge> to temporarily enable pan mode</li>
            <li>• Use <Badge variant="outline" className="text-xs mx-1">Tab</Badge> to navigate between UI elements</li>
            <li>• Shortcuts work when the canvas or UI elements are focused</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Floating keyboard shortcuts hint
 */
export interface ShortcutHintProps {
  shortcut: string
  description: string
  visible: boolean
  position?: { x: number; y: number }
  className?: string
}

export function ShortcutHint({ 
  shortcut, 
  description, 
  visible, 
  position = { x: 0, y: 0 },
  className 
}: ShortcutHintProps) {
  if (!visible) return null

  return (
    <div
      className={`fixed z-50 pointer-events-none transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg border text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {shortcut}
          </Badge>
          <span>{description}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Context-aware shortcut suggestions
 */
export interface ShortcutSuggestionsProps {
  context: 'canvas' | 'drawing' | 'selection' | 'idle'
  suggestions: Array<{
    shortcut: string
    description: string
    priority: number
  }>
  maxSuggestions?: number
  className?: string
}

export function ShortcutSuggestions({ 
  context, 
  suggestions, 
  maxSuggestions = 3,
  className 
}: ShortcutSuggestionsProps) {
  const sortedSuggestions = suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxSuggestions)

  if (sortedSuggestions.length === 0) return null

  return (
    <div className={`fixed bottom-20 left-4 z-40 ${className}`}>
      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border max-w-xs">
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {context} shortcuts
        </div>
        
        <div className="space-y-1">
          {sortedSuggestions.map((suggestion, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="truncate mr-2">{suggestion.description}</span>
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                {suggestion.shortcut}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}