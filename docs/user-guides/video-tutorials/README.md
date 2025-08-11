# Video Tutorial Scripts

This directory contains scripts and resources for creating video tutorials for the BIM wall system. Each tutorial includes a detailed script, visual aids, and production notes.

## Tutorial Series Overview

### Getting Started Series
1. **Introduction to BIM Walls** (5 minutes)
   - What is BIM mode and why use it
   - Comparison with basic mode
   - When to use each mode

2. **Creating Your First BIM Wall** (7 minutes)
   - Enabling BIM mode
   - Basic wall creation workflow
   - Understanding quality metrics

3. **Working with Wall Properties** (6 minutes)
   - Wall types and thickness settings
   - Join type selection
   - Custom tolerance adjustment

### Advanced Operations Series
4. **Mastering Wall Intersections** (10 minutes)
   - T-junctions and L-junctions
   - Complex multi-wall intersections
   - Troubleshooting intersection issues

5. **Quality Management and Optimization** (8 minutes)
   - Understanding quality metrics
   - Using healing operations
   - Performance optimization techniques

6. **Advanced Geometric Operations** (12 minutes)
   - Custom offset operations
   - Shape healing and simplification
   - Tolerance management strategies

### Troubleshooting Series
7. **Common Issues and Solutions** (9 minutes)
   - Mode switching problems
   - Geometric quality issues
   - Performance troubleshooting

8. **Advanced Troubleshooting** (11 minutes)
   - Complex geometric problems
   - System-level issues
   - Using diagnostic tools

## Production Guidelines

### Video Specifications
- **Resolution**: 1920x1080 (1080p)
- **Frame Rate**: 30 fps
- **Audio**: 48kHz, stereo
- **Format**: MP4 (H.264)
- **Duration**: 5-12 minutes per tutorial

### Visual Standards
- **Screen Recording**: Use high-quality screen recording software
- **Cursor Highlighting**: Make cursor movements clearly visible
- **Zoom Effects**: Use zoom to highlight important UI elements
- **Annotations**: Add callouts and arrows for clarity
- **Consistent Branding**: Use consistent intro/outro and styling

### Audio Standards
- **Clear Narration**: Professional voice recording
- **Background Music**: Subtle, non-distracting
- **Sound Effects**: Minimal, only for emphasis
- **Audio Levels**: Consistent throughout

### Content Structure
Each tutorial should follow this structure:
1. **Introduction** (30 seconds)
   - Tutorial topic and objectives
   - Prerequisites and setup

2. **Main Content** (4-10 minutes)
   - Step-by-step demonstration
   - Key concepts and explanations
   - Common pitfalls and tips

3. **Summary** (30 seconds)
   - Key takeaways
   - Next steps or related tutorials

## Tutorial Scripts

### Tutorial 1: Introduction to BIM Walls

**Duration**: 5 minutes  
**Audience**: New users  
**Prerequisites**: Basic familiarity with the floor plan editor

#### Script

**[INTRO - 0:00-0:30]**

*[Screen shows floor plan editor with basic walls]*

"Welcome to the BIM Wall System tutorial series. I'm going to show you how to create professional-quality architectural floor plans using our advanced BIM functionality.

In this first tutorial, we'll cover what BIM mode is, how it differs from basic mode, and when you should use each approach."

**[MAIN CONTENT - 0:30-4:30]**

*[Screen shows side-by-side comparison]*

"Let's start by understanding the difference between Basic and BIM modes.

Basic mode uses simple polygon expansion to create walls. It's fast and works well for rough sketches and simple layouts. However, it has limitations when dealing with complex intersections and precise geometric requirements.

*[Demonstrate basic mode wall creation]*

BIM mode, on the other hand, uses professional-grade geometric algorithms similar to those found in AutoCAD, Revit, and ArchiCAD. It creates mathematically precise wall geometry using:

- Proper baseline curve offsetting
- Boolean operations for intersections
- Adaptive tolerance management
- Shape healing and optimization

*[Demonstrate BIM mode wall creation]*

Notice how BIM mode automatically resolves the intersection with precise geometry, while basic mode might leave gaps or overlaps.

*[Show quality metrics]*

BIM mode also provides quality metrics that tell you exactly how accurate your geometry is. This is crucial for manufacturing and construction applications.

So when should you use each mode?

Use Basic mode for:
- Quick sketches and concept development
- Simple rectangular layouts
- When speed is more important than precision

Use BIM mode for:
- Professional architectural drawings
- Complex intersections and junctions
- When you need manufacturing-quality geometry
- Integration with other CAD systems"

**[SUMMARY - 4:30-5:00]**

"In summary, BIM mode provides professional-quality geometric operations at the cost of some additional processing time. For most architectural work, the improved accuracy and quality are worth it.

In the next tutorial, we'll walk through creating your first BIM wall step by step. Thanks for watching!"

#### Production Notes
- Use split-screen to show basic vs BIM mode comparisons
- Highlight quality metrics with zoom effects
- Include visual examples of intersection differences
- Use consistent color coding (green for BIM, blue for basic)

### Tutorial 2: Creating Your First BIM Wall

**Duration**: 7 minutes  
**Audience**: New BIM users  
**Prerequisites**: Tutorial 1 completed

#### Script

**[INTRO - 0:00-0:30]**

*[Screen shows empty floor plan editor]*

"Welcome back! In this tutorial, we'll create your first BIM wall from start to finish. We'll cover enabling BIM mode, setting up wall properties, creating the wall geometry, and understanding the quality feedback.

By the end of this tutorial, you'll be comfortable with the basic BIM wall creation workflow."

**[MAIN CONTENT - 0:30-6:30]**

"Let's start by enabling BIM mode. Look for the BIM Mode toggle in the toolbar.

*[Highlight BIM mode toggle]*

Before we switch, notice the compatibility indicator. Green means it's safe to switch, yellow indicates potential approximations, and red means there are issues to resolve first.

*[Click BIM mode toggle]*

Great! Now we're in BIM mode. Notice the enhanced interface with additional quality indicators and geometric controls.

Next, let's select the Wall tool and configure our wall properties.

*[Select wall tool, open properties panel]*

In the properties panel, we have:
- Wall Type: Layout, Zone, or Area
- Thickness: Set to 6 inches for this example
- Join Type: This is new in BIM mode - we'll use Miter for standard corners

*[Configure properties]*

Now let's create our wall. I'll create an L-shaped wall to demonstrate how BIM mode handles corners.

*[Create L-shaped wall by clicking points]*

Click to place the first point... then the second point for our horizontal segment... and the third point for our vertical segment. Double-click to finish.

*[Wall appears with quality indicators]*

Excellent! Notice several things:

1. The corner is perfectly resolved with precise miter geometry
2. Quality metrics show 98% accuracy - that's excellent
3. The wall thickness is exactly 6 inches throughout
4. No gaps or overlaps at the corner

*[Zoom in on corner, show quality metrics]*

Let's examine the quality metrics in detail. Click on the wall to see:
- Geometric Accuracy: 98% - very high precision
- Topological Consistency: 100% - perfect geometric validity
- Manufacturability: 95% - ready for construction

These metrics tell us our wall meets professional standards.

*[Show different visualization modes]*

We can also change visualization modes to see the underlying geometry. Here's the offset curves mode, showing the baseline and the offset curves that create the wall thickness."

**[SUMMARY - 6:30-7:00]**

"That's it! You've created your first BIM wall with professional-quality geometry. The key steps are:
1. Enable BIM mode
2. Configure wall properties
3. Create the wall geometry
4. Verify quality metrics

In the next tutorial, we'll explore wall properties in more detail. Thanks for watching!"

#### Production Notes
- Use cursor highlighting for all clicks
- Zoom in on quality metrics for clarity
- Show before/after comparison with basic mode
- Include callouts for important UI elements

### Tutorial 3: Working with Wall Properties

**Duration**: 6 minutes  
**Audience**: BIM users ready for more detail  
**Prerequisites**: Tutorials 1-2 completed

#### Script

**[INTRO - 0:00-0:30]**

*[Screen shows BIM wall with properties panel open]*

"In this tutorial, we'll dive deep into BIM wall properties. We'll explore wall types, thickness settings, join type selection, and custom tolerance adjustment.

Understanding these properties is key to creating exactly the geometry you need for your projects."

**[MAIN CONTENT - 0:30-5:30]**

"Let's start with wall types. BIM mode supports three types:

*[Highlight wall type dropdown]*

Layout walls are your primary structural elements - exterior walls, load-bearing walls, and major partitions.

Zone walls define spaces and areas - interior partitions, room dividers, and non-structural elements.

Area walls are specialized boundaries - property lines, setback lines, and other reference elements.

The type affects how walls interact with each other and how they're processed by the BIM system.

*[Change wall type, show visual differences]*

Next, let's look at thickness settings. Unlike basic mode, BIM mode maintains exact thickness throughout the wall, even at complex intersections.

*[Adjust thickness slider, show real-time preview]*

Notice how the geometry updates in real-time, and the quality metrics adjust automatically.

Now for join types - this is where BIM mode really shines:

*[Show join type options]*

Miter joins create sharp corners by extending the wall faces until they meet. This is ideal for most architectural applications.

*[Create miter join example]*

Bevel joins cut the corner at an angle. This is useful for very sharp angles where miter joins might create problems.

*[Create bevel join example]*

Round joins create curved corners. These are great for aesthetic purposes or when you need to avoid sharp edges.

*[Create round join example]*

The system automatically selects the best join type based on the angle, but you can override this for specific design requirements.

Finally, let's look at custom tolerance adjustment. Normally, BIM mode calculates tolerances automatically based on wall thickness and document precision.

*[Open advanced properties]*

But sometimes you need custom control. The tolerance slider lets you adjust precision vs. performance:

- Tighter tolerances: Higher precision, slower processing
- Looser tolerances: Faster processing, lower precision

*[Adjust tolerance, show impact on quality metrics]*

Notice how the quality metrics change as we adjust tolerance. Find the sweet spot for your specific needs."

**[SUMMARY - 5:30-6:00]**

"Wall properties give you precise control over BIM geometry:
- Choose the right wall type for your application
- Set exact thickness requirements
- Select appropriate join types for your design
- Adjust tolerances when needed

Next, we'll tackle complex wall intersections. Thanks for watching!"

#### Production Notes
- Use split-screen to show property changes and geometry updates
- Include close-ups of different join types
- Show tolerance impact with before/after comparisons
- Use consistent visual highlighting for UI elements

## Additional Resources

### Visual Assets
- **UI Mockups**: High-resolution screenshots of all interface elements
- **Diagrams**: Technical diagrams explaining geometric concepts
- **Icons**: Consistent iconography for tutorials
- **Animations**: Short animations for complex concepts

### Audio Resources
- **Voice Talent**: Professional narrator with clear diction
- **Background Music**: Subtle, professional background tracks
- **Sound Effects**: Minimal click sounds and transitions
- **Audio Templates**: Consistent intro/outro audio

### Distribution Platforms
- **YouTube**: Primary distribution platform
- **Documentation Site**: Embedded in user guides
- **Help System**: Integrated with contextual help
- **Training Portal**: Part of comprehensive training program

## Maintenance and Updates

### Regular Updates
- Update tutorials when UI changes
- Add new tutorials for new features
- Refresh content based on user feedback
- Maintain consistent quality standards

### Analytics and Feedback
- Track tutorial completion rates
- Monitor user feedback and questions
- Identify areas needing additional coverage
- Optimize based on usage patterns

### Localization
- Plan for multiple language versions
- Consider cultural differences in presentation
- Maintain consistency across languages
- Update all versions simultaneously