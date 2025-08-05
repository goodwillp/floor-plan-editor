# Floor Plan Editor Components

This directory contains the React components for the Floor Plan Editor application layout.

## Component Overview

### Layout Components

- **App.tsx** - Main application component that orchestrates the entire layout
- **MenuBar.tsx** - Top menu bar with file, edit, and view actions
- **ToolPalette.tsx** - Tool selection bar with wall types and drawing tools
- **Canvas.tsx** - Main drawing area (placeholder for PixiJS integration)
- **Sidebar.tsx** - Collapsible sidebar with layers, properties, and reference panels
- **StatusBar.tsx** - Bottom status bar showing coordinates, zoom, and messages

### Component Architecture

```
App
├── MenuBar (File, Edit, View actions)
├── ToolPalette (Wall types, Drawing tools, View tools)
├── Main Content Area
│   ├── Canvas (Drawing area - maximized)
│   └── Sidebar (Collapsible panels)
└── StatusBar (Status messages, coordinates, zoom)
```

### Key Features

1. **Icon-based Interface**: All components use descriptive icons with tooltips
2. **Toggle States**: Tools show active/inactive states with visual feedback
3. **Maximized Canvas**: Layout prioritizes canvas space over UI elements
4. **Collapsible Sidebar**: Sidebar can be collapsed to maximize canvas area
5. **Real-time Feedback**: Status bar provides immediate feedback for all actions

### State Management

The App component manages:
- Active wall type (layout, zone, area)
- Active tool (select, draw, delete)
- Grid visibility
- Mouse coordinates
- Zoom level
- Status messages

### Requirements Satisfied

- **6.1**: React framework for UI rendering ✓
- **6.2**: ShadCN components for consistent styling ✓
- **7.1**: Maximized canvas area ✓
- **7.2**: Compact menu bars ✓
- **7.3**: Collapsible sidebars ✓

### Next Steps

- Task 4: Implement icon-based UI components with tooltips
- Task 5: Set up PixiJS canvas integration
- Task 6: Implement wall type system and thickness management