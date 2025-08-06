# Floor Plan Editor - User Guide

Welcome to the Floor Plan Editor! This comprehensive guide will help you create professional architectural floor plans using our intuitive web-based CAD application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Wall Types and Drawing](#wall-types-and-drawing)
4. [Selection and Editing](#selection-and-editing)
5. [Grid System](#grid-system)
6. [Zoom and Navigation](#zoom-and-navigation)
7. [Reference Images](#reference-images)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Performance Features](#performance-features)
10. [Tips and Best Practices](#tips-and-best-practices)
11. [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing the Application

1. **Web Browser**: Open your web browser and navigate to the application URL
2. **Supported Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
3. **System Requirements**: Modern computer with 4GB+ RAM for optimal performance

### First Launch

When you first open the application, you'll see:
- A large drawing canvas in the center
- Tool palette at the top
- Sidebar on the right (collapsible)
- Status bar at the bottom
- Menu bar with file operations

## Interface Overview

### Main Components

**Drawing Canvas**
- Primary work area for creating floor plans
- Supports mouse and touch interactions
- Real-time visual feedback
- Layered rendering system

**Tool Palette**
- Wall type selection (Layout, Zone, Area)
- Drawing tools (Select, Draw, Move, Delete)
- View controls (Grid, Zoom, Reference Image)
- Quick access to common functions

**Sidebar**
- Wall properties panel
- Layer management
- Proximity merging controls
- Error handling information

**Status Bar**
- Mouse coordinates
- Current zoom level
- Selection count
- Status messages

**Menu Bar**
- File operations (Save, Load, Export)
- Edit operations (Undo, Redo)
- View controls (Zoom, Reset)

### Accessibility Features

- **Skip Links**: Jump to main sections using Tab key
- **Keyboard Navigation**: Full keyboard support for all functions
- **Screen Reader Support**: ARIA labels and descriptions
- **High Contrast**: Optimized for accessibility tools
- **Tooltips**: Helpful descriptions for all tools

## Wall Types and Drawing

### Wall Types

The application supports three types of walls, each with specific thickness:

**Layout Walls (350mm)**
- Primary structural walls
- Exterior walls and main load-bearing walls
- Thickest wall type for major architectural elements
- Color-coded for easy identification

**Zone Walls (250mm)**
- Interior partition walls
- Room dividers and secondary structural elements
- Medium thickness for functional separation
- Ideal for creating room boundaries

**Area Walls (150mm)**
- Detail walls and minor partitions
- Decorative elements and thin dividers
- Thinnest wall type for fine details
- Perfect for furniture layouts and annotations

### Drawing Walls

1. **Select Wall Type**: Click on Layout, Zone, or Area wall button
2. **Activate Draw Tool**: Click the "Draw Wall" button or press 'D'
3. **Draw on Canvas**: Click to place start point, click again for end point
4. **Continue Drawing**: Each click creates a new wall segment
5. **Finish Drawing**: Press Escape or select another tool

**Drawing Tips:**
- Hold Shift while drawing for straight horizontal/vertical lines
- Use the grid for precise alignment
- Walls automatically snap to existing walls and intersections
- Visual feedback shows wall thickness as you draw

### Wall Rendering

- **Outer Shell Display**: Walls show their full thickness outline
- **Core Line Hidden**: Internal construction lines are not visible
- **Layer System**: Walls render above reference images but below UI elements
- **Real-time Updates**: Changes appear immediately on canvas

## Selection and Editing

### Selecting Walls

1. **Activate Select Tool**: Click "Select Tool" button or press 'S'
2. **Click on Wall**: Click anywhere on a wall to select it
3. **Multiple Selection**: Hold Ctrl/Cmd and click additional walls
4. **Selection Feedback**: Selected walls highlight with selection color

### Editing Wall Properties

**In the Sidebar:**
- **Wall Type**: Change between Layout, Zone, and Area
- **Visibility**: Show or hide selected walls
- **Properties**: View wall dimensions and connections

**Direct Editing:**
- **Move Walls**: Use Move tool to reposition walls
- **Delete Walls**: Use Delete tool or press Delete key
- **Modify Endpoints**: Drag wall endpoints to resize

### Wall Management

**Automatic Features:**
- **Intersection Detection**: Walls automatically split at intersections
- **Node Cleanup**: Unnecessary connection points are removed
- **Proximity Merging**: Nearby walls can merge visually
- **Geometric Integrity**: System maintains proper wall connections

## Grid System

### Grid Controls

**Toggle Grid**: Click the grid button or press 'G'
- Grid starts hidden by default
- Regular pattern helps with alignment
- Visual feedback shows grid state

**Grid Features:**
- **Alignment Aid**: Helps position walls precisely
- **Visual Reference**: Shows measurement units
- **Toggle State**: Button shows active/inactive state
- **Performance**: Grid can be hidden for better performance

### Using the Grid

1. **Enable Grid**: Click grid toggle button
2. **Align Elements**: Use grid lines as guides for wall placement
3. **Precise Positioning**: Snap walls to grid intersections
4. **Disable When Done**: Turn off grid to reduce visual clutter

## Zoom and Navigation

### Zoom Controls

**Mouse Wheel Zoom:**
- Scroll up to zoom in
- Scroll down to zoom out
- Zoom centers on cursor position
- Smooth zoom transitions

**Button Controls:**
- **Zoom In**: Click + button or press Ctrl/Cmd + Plus
- **Zoom Out**: Click - button or press Ctrl/Cmd + Minus
- **Reset Zoom**: Click reset button or press Ctrl/Cmd + 0

**Zoom Features:**
- **Zoom Limits**: Prevents excessive zoom in/out
- **Proportional Scaling**: All elements scale together
- **Status Display**: Current zoom level shown in status bar
- **Keyboard Support**: Full keyboard zoom control

### Pan and Navigation

**Mouse Pan:**
- Click and drag to pan around the canvas
- Works in any tool mode
- Smooth panning motion
- No zoom level restrictions

**Keyboard Pan:**
- Arrow keys for precise movement
- Page Up/Down for larger movements
- Home key to center view

### View Management

**Reset View**: Returns to default zoom and position
**Fit to Content**: Automatically frames all drawn elements
**Center View**: Centers the drawing on screen

## Reference Images

### Loading Reference Images

1. **Click Image Button**: Select "Load Reference Image"
2. **Choose File**: Select PNG, JPG, or other image formats
3. **Image Placement**: Image appears at bottom layer of canvas
4. **Default State**: Image loads in locked position

### Image Controls

**Lock/Unlock Toggle:**
- **Locked**: Prevents accidental movement during drawing
- **Unlocked**: Allows repositioning and scaling
- **Visual Feedback**: Button shows current lock state

**Visibility Toggle:**
- **Show/Hide**: Toggle image visibility
- **Drawing Aid**: Hide image to see walls clearly
- **Layer Control**: Image always renders below walls

### Working with Reference Images

**Best Practices:**
1. Load image before starting to draw
2. Keep image locked while drawing walls
3. Use image as tracing guide for accuracy
4. Hide image periodically to check wall clarity
5. Unlock only when repositioning is needed

**Supported Formats:**
- PNG (recommended for line drawings)
- JPG (good for photographs)
- GIF (basic support)
- WebP (modern format support)

## Keyboard Shortcuts

### File Operations
- **Ctrl/Cmd + S**: Save (placeholder)
- **Ctrl/Cmd + O**: Open (placeholder)
- **Ctrl/Cmd + E**: Export (placeholder)

### Edit Operations
- **Ctrl/Cmd + Z**: Undo (placeholder)
- **Ctrl/Cmd + Y**: Redo (placeholder)
- **Delete**: Delete selected walls
- **Ctrl/Cmd + A**: Select all (placeholder)
- **Ctrl/Cmd + C**: Copy (placeholder)
- **Ctrl/Cmd + V**: Paste (placeholder)

### View Operations
- **Ctrl/Cmd + Plus**: Zoom in
- **Ctrl/Cmd + Minus**: Zoom out
- **Ctrl/Cmd + 0**: Reset zoom
- **G**: Toggle grid
- **R**: Reset view

### Tool Operations
- **S**: Select tool
- **D**: Draw tool
- **M**: Move tool
- **X**: Delete tool

### Wall Types
- **1**: Layout wall
- **2**: Zone wall
- **3**: Area wall

### Navigation
- **Arrow Keys**: Pan view
- **Page Up/Down**: Large pan movements
- **Home**: Center view
- **Space**: Temporary pan mode (hold)

### Accessibility
- **Tab**: Navigate between UI elements
- **Enter**: Activate focused button
- **Escape**: Cancel current operation

## Performance Features

### Performance Monitor

**Access**: Click "Performance" button in top bar
**Features:**
- Real-time FPS display
- Memory usage tracking
- Frame time analysis
- Performance recommendations

### Performance Mode

**Enable**: Click "Enable Performance Mode" in performance monitor
**Benefits:**
- Reduced visual effects
- Optimized rendering
- Better performance on slower devices
- Automatic optimization suggestions

**When to Use:**
- Large floor plans with many walls
- Older or slower computers
- When experiencing lag or stuttering
- During intensive drawing sessions

### Optimization Tips

**For Better Performance:**
1. Enable performance mode for large projects
2. Hide grid when not needed
3. Minimize zoom level changes
4. Close performance monitor when not needed
5. Use reference images sparingly

**Memory Management:**
- Application monitors memory usage
- Warnings appear for high usage
- Automatic cleanup of unused resources
- Performance recommendations provided

## Tips and Best Practices

### Drawing Workflow

**Recommended Process:**
1. Load reference image (if available)
2. Enable grid for alignment
3. Start with layout walls (exterior)
4. Add zone walls (interior partitions)
5. Finish with area walls (details)
6. Review and edit as needed

### Precision Drawing

**For Accurate Plans:**
- Use grid alignment consistently
- Start from a corner or reference point
- Work systematically (clockwise or counterclockwise)
- Check intersections and connections
- Use zoom for detailed work

### Organization

**Keep Plans Organized:**
- Use consistent wall types
- Group related elements
- Name and save versions regularly
- Document changes and revisions
- Plan before drawing

### Performance

**Maintain Good Performance:**
- Enable performance mode for large plans
- Hide unnecessary visual elements
- Save work regularly
- Monitor memory usage
- Close unused browser tabs

## Troubleshooting

### Common Issues

**Application Won't Load:**
- Check internet connection
- Try refreshing the page
- Clear browser cache
- Try a different browser
- Check browser console for errors

**Slow Performance:**
- Enable performance mode
- Close other browser tabs
- Check available memory
- Reduce zoom level
- Hide grid and reference images

**Drawing Issues:**
- Ensure correct tool is selected
- Check wall type selection
- Verify mouse/touch input
- Try refreshing the page
- Check browser compatibility

**Selection Problems:**
- Switch to select tool
- Click directly on wall
- Check if wall is visible
- Try zooming in for precision
- Clear selection and try again

### Browser Compatibility

**Recommended Browsers:**
- Chrome 90+ (best performance)
- Firefox 88+
- Safari 14+
- Edge 90+

**Known Issues:**
- Older browsers may have limited support
- Mobile browsers have touch-specific behavior
- Some features require modern JavaScript support

### Getting Help

**Self-Help:**
1. Check this user guide
2. Try keyboard shortcuts
3. Use performance monitor
4. Check browser console
5. Refresh the application

**Error Messages:**
- Read status bar messages
- Check error panel in sidebar
- Look for visual indicators
- Try the suggested solutions

### Performance Troubleshooting

**If Application is Slow:**
1. Enable performance mode
2. Close other applications
3. Check system resources
4. Reduce browser zoom
5. Clear browser cache

**If Memory Usage is High:**
1. Check performance monitor
2. Reduce number of walls
3. Hide reference images
4. Restart the application
5. Use a more powerful device

## Advanced Features

### Proximity Merging

**What it Does:**
- Automatically merges nearby walls visually
- Maintains individual wall properties
- Improves visual appearance
- Reduces visual clutter

**Controls:**
- Enable/disable in sidebar
- Adjust threshold distance
- View merge statistics
- Clear all merges

### Error Handling

**Automatic Features:**
- Geometric error recovery
- Memory usage monitoring
- Performance optimization
- Visual feedback for issues

**Manual Controls:**
- Clear error log
- Adjust memory thresholds
- View error statistics
- Recovery options

### Accessibility

**Built-in Features:**
- Screen reader support
- Keyboard navigation
- High contrast support
- Focus management
- ARIA labels

**Customization:**
- Adjust for reduced motion
- Modify color preferences
- Change font sizes
- Configure input methods

## Conclusion

The Floor Plan Editor provides a powerful yet intuitive platform for creating architectural floor plans. With its comprehensive tool set, intelligent automation features, and performance optimizations, you can create professional-quality floor plans efficiently.

Remember to:
- Start with reference images when available
- Use appropriate wall types for different elements
- Take advantage of keyboard shortcuts for efficiency
- Monitor performance for large projects
- Save your work regularly

For additional help or to report issues, refer to the troubleshooting section or check the application's error handling features.

---

**Happy Drawing!**

*Floor Plan Editor Team*  
*Version 1.0.0 - January 2024*