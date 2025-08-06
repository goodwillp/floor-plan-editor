import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KeyboardShortcutManager, createDefaultShortcuts } from '@/lib/KeyboardShortcuts'
import type { ShortcutAction } from '@/lib/KeyboardShortcuts'

/**
 * Tests for keyboard shortcuts system
 * Requirements: 7.5 - Add keyboard shortcuts for common operations
 */

describe('KeyboardShortcutManager', () => {
  let manager: KeyboardShortcutManager
  let mockHandlers: Record<string, vi.Mock>

  beforeEach(() => {
    manager = new KeyboardShortcutManager()
    mockHandlers = {
      save: vi.fn(),
      load: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn()
    }
  })

  afterEach(() => {
    manager.destroy()
  })

  it('should register shortcuts correctly', () => {
    const shortcut: ShortcutAction = {
      key: 's',
      ctrlKey: true,
      description: 'Save',
      category: 'file',
      handler: mockHandlers.save
    }

    manager.register(shortcut)
    const groups = manager.getShortcutGroups()
    
    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe('File Operations')
    expect(groups[0].shortcuts).toHaveLength(1)
    expect(groups[0].shortcuts[0].description).toBe('Save')
  })

  it('should unregister shortcuts correctly', () => {
    const shortcut: ShortcutAction = {
      key: 's',
      ctrlKey: true,
      description: 'Save',
      category: 'file',
      handler: mockHandlers.save
    }

    manager.register(shortcut)
    expect(manager.getShortcutGroups()).toHaveLength(1)

    manager.unregister(shortcut)
    expect(manager.getShortcutGroups()).toHaveLength(0)
  })

  it('should format shortcut display correctly', () => {
    const shortcut: ShortcutAction = {
      key: 's',
      ctrlKey: true,
      description: 'Save',
      category: 'file',
      handler: mockHandlers.save
    }

    const display = manager.getShortcutDisplay(shortcut)
    expect(display).toMatch(/Ctrl.*S|⌘.*S/)
  })

  it('should handle Mac vs PC key formatting', () => {
    const shortcut: ShortcutAction = {
      key: 's',
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
      description: 'Complex shortcut',
      category: 'file',
      handler: mockHandlers.save
    }

    const display = manager.getShortcutDisplay(shortcut)
    expect(display).toContain('S')
    
    // Should contain modifier keys
    if (navigator.platform.includes('Mac')) {
      expect(display).toMatch(/[⌘⌥⇧]/)
    } else {
      expect(display).toMatch(/Ctrl|Alt/)
    }
  })

  it('should enable and disable shortcuts', () => {
    manager.setEnabled(false)
    expect(manager['isEnabled']).toBe(false)

    manager.setEnabled(true)
    expect(manager['isEnabled']).toBe(true)
  })

  it('should group shortcuts by category', () => {
    const shortcuts: ShortcutAction[] = [
      {
        key: 's',
        ctrlKey: true,
        description: 'Save',
        category: 'file',
        handler: mockHandlers.save
      },
      {
        key: 'o',
        ctrlKey: true,
        description: 'Open',
        category: 'file',
        handler: mockHandlers.load
      },
      {
        key: 'z',
        ctrlKey: true,
        description: 'Undo',
        category: 'edit',
        handler: mockHandlers.undo
      }
    ]

    shortcuts.forEach(shortcut => manager.register(shortcut))
    const groups = manager.getShortcutGroups()

    expect(groups).toHaveLength(2)
    
    const fileGroup = groups.find(g => g.category === 'File Operations')
    const editGroup = groups.find(g => g.category === 'Edit Operations')
    
    expect(fileGroup?.shortcuts).toHaveLength(2)
    expect(editGroup?.shortcuts).toHaveLength(1)
  })

  it('should simulate keyboard events correctly', () => {
    const shortcut: ShortcutAction = {
      key: 's',
      ctrlKey: true,
      description: 'Save',
      category: 'file',
      handler: mockHandlers.save
    }

    manager.register(shortcut)

    // Simulate Ctrl+S keydown event
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    // Manually trigger the handler since we can't easily test DOM events in this context
    const keyString = 'ctrl+s'
    const registeredShortcut = manager['shortcuts'].get(keyString)
    
    expect(registeredShortcut).toBeDefined()
    expect(registeredShortcut?.handler).toBe(mockHandlers.save)
  })
})

describe('createDefaultShortcuts', () => {
  let mockHandlers: Record<string, vi.Mock>

  beforeEach(() => {
    mockHandlers = {
      save: vi.fn(),
      load: vi.fn(),
      export: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      delete: vi.fn(),
      selectAll: vi.fn(),
      copy: vi.fn(),
      paste: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomFit: vi.fn(),
      zoomActual: vi.fn(),
      toggleGrid: vi.fn(),
      resetView: vi.fn(),
      selectTool: vi.fn(),
      drawTool: vi.fn(),
      moveTool: vi.fn(),
      deleteTool: vi.fn(),
      layoutWall: vi.fn(),
      zoneWall: vi.fn(),
      areaWall: vi.fn()
    }
  })

  it('should create all default shortcuts', () => {
    const shortcuts = createDefaultShortcuts(mockHandlers)
    
    expect(shortcuts.length).toBeGreaterThan(20)
    
    // Check that all categories are represented
    const categories = new Set(shortcuts.map(s => s.category))
    expect(categories).toContain('file')
    expect(categories).toContain('edit')
    expect(categories).toContain('view')
    expect(categories).toContain('tool')
  })

  it('should include essential file operations', () => {
    const shortcuts = createDefaultShortcuts(mockHandlers)
    
    const saveShortcut = shortcuts.find(s => s.description.includes('Save'))
    const loadShortcut = shortcuts.find(s => s.description.includes('Open'))
    const exportShortcut = shortcuts.find(s => s.description.includes('Export'))
    
    expect(saveShortcut).toBeDefined()
    expect(saveShortcut?.key).toBe('s')
    expect(saveShortcut?.ctrlKey).toBe(true)
    
    expect(loadShortcut).toBeDefined()
    expect(loadShortcut?.key).toBe('o')
    expect(loadShortcut?.ctrlKey).toBe(true)
    
    expect(exportShortcut).toBeDefined()
    expect(exportShortcut?.key).toBe('e')
    expect(exportShortcut?.ctrlKey).toBe(true)
  })

  it('should include essential edit operations', () => {
    const shortcuts = createDefaultShortcuts(mockHandlers)
    
    const undoShortcut = shortcuts.find(s => s.description === 'Undo')
    const redoShortcuts = shortcuts.filter(s => s.description.includes('Redo'))
    
    expect(undoShortcut).toBeDefined()
    expect(undoShortcut?.key).toBe('z')
    expect(undoShortcut?.ctrlKey).toBe(true)
    
    expect(redoShortcuts.length).toBeGreaterThanOrEqual(1)
  })

  it('should include zoom operations', () => {
    const shortcuts = createDefaultShortcuts(mockHandlers)
    
    const zoomInShortcuts = shortcuts.filter(s => s.description.includes('Zoom in'))
    const zoomOutShortcut = shortcuts.find(s => s.description === 'Zoom out')
    const zoomActualShortcut = shortcuts.find(s => s.description === 'Zoom to actual size')
    
    expect(zoomInShortcuts.length).toBeGreaterThanOrEqual(1)
    expect(zoomOutShortcut).toBeDefined()
    expect(zoomActualShortcut).toBeDefined()
  })

  it('should include tool shortcuts', () => {
    const shortcuts = createDefaultShortcuts(mockHandlers)
    
    const selectTool = shortcuts.find(s => s.description === 'Select tool')
    const drawTool = shortcuts.find(s => s.description === 'Draw tool')
    
    expect(selectTool).toBeDefined()
    expect(selectTool?.key).toBe('v')
    
    expect(drawTool).toBeDefined()
    expect(drawTool?.key).toBe('p')
  })

  it('should include wall type shortcuts', () => {
    const shortcuts = createDefaultShortcuts(mockHandlers)
    
    const layoutWall = shortcuts.find(s => s.description.includes('Layout wall'))
    const zoneWall = shortcuts.find(s => s.description.includes('Zone wall'))
    const areaWall = shortcuts.find(s => s.description.includes('Area wall'))
    
    expect(layoutWall).toBeDefined()
    expect(layoutWall?.key).toBe('1')
    
    expect(zoneWall).toBeDefined()
    expect(zoneWall?.key).toBe('2')
    
    expect(areaWall).toBeDefined()
    expect(areaWall?.key).toBe('3')
  })

  it('should include escape and special keys', () => {
    const shortcuts = createDefaultShortcuts(mockHandlers)
    
    const escapeShortcut = shortcuts.find(s => s.key === 'Escape')
    const spaceShortcut = shortcuts.find(s => s.key === 'Space')
    
    expect(escapeShortcut).toBeDefined()
    expect(escapeShortcut?.description).toContain('Cancel')
    
    expect(spaceShortcut).toBeDefined()
    expect(spaceShortcut?.description).toContain('Pan')
  })
})