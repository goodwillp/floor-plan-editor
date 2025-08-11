/**
 * PixiJS BIM Renderer Extensions
 * Specialized rendering for BIM geometric data visualization
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import * as PIXI from 'pixi.js';
import type {
  VisualizationRenderData,
  PixiGraphicsData,
  PixiLabelData,
  PixiAnimationData,
  PixiInteractiveData,
  BIMVisualizationModes
} from '../types/VisualizationTypes';

/**
 * PixiJS renderer extensions for BIM visualization
 */
export class PixiJSBIMRenderer {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private graphicsObjects: Map<string, PIXI.Graphics>;
  private textObjects: Map<string, PIXI.Text>;
  private animations: Map<string, PIXI.Ticker>;
  private interactiveElements: Map<string, PIXI.Container>;

  constructor(app: PIXI.Application, container: PIXI.Container) {
    this.app = app;
    this.container = container;
    this.graphicsObjects = new Map();
    this.textObjects = new Map();
    this.animations = new Map();
    this.interactiveElements = new Map();
  }

  /**
   * Render BIM visualization data
   */
  render(data: VisualizationRenderData): void {
    this.clearPreviousRender();
    
    // Render graphics elements
    data.graphics.forEach(graphicsData => {
      const graphics = this.createGraphicsObject(graphicsData);
      if (graphics && graphicsData.id) {
        this.graphicsObjects.set(graphicsData.id, graphics);
        this.container.addChild(graphics);
      }
    });

    // Render labels
    data.labels.forEach(labelData => {
      const text = this.createTextObject(labelData);
      if (text && labelData.id) {
        this.textObjects.set(labelData.id, text);
        this.container.addChild(text);
      }
    });

    // Setup animations
    data.animations.forEach(animationData => {
      this.createAnimation(animationData);
    });

    // Setup interactive elements
    data.interactiveElements.forEach(interactiveData => {
      this.createInteractiveElement(interactiveData);
    });

    // Sort children by z-index
    this.container.children.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }

  /**
   * Create PIXI Graphics object from data
   */
  private createGraphicsObject(data: PixiGraphicsData): PIXI.Graphics | null {
    const graphics = new PIXI.Graphics();
    graphics.zIndex = data.zIndex;
    graphics.interactive = data.interactive;

    // Set line style
    graphics.lineStyle({
      width: data.style.lineWidth,
      color: data.style.color,
      alpha: data.style.alpha
    });

    // Set fill style if specified
    if (data.style.fillColor !== undefined) {
      graphics.beginFill(data.style.fillColor, data.style.fillAlpha || 1.0);
    }

    try {
      switch (data.type) {
        case 'line':
          this.drawLine(graphics, data.points, data.style.dashPattern);
          break;
        
        case 'polygon':
          this.drawPolygon(graphics, data.points);
          break;
        
        case 'circle':
          this.drawCircle(graphics, data.points[0], 5); // Default radius
          break;
        
        case 'arc':
          this.drawArc(graphics, data.points);
          break;
        
        case 'bezier':
          this.drawBezier(graphics, data.points);
          break;
        
        default:
          console.warn(`Unknown graphics type: ${data.type}`);
          return null;
      }

      if (data.style.fillColor !== undefined) {
        graphics.endFill();
      }

      return graphics;
    } catch (error) {
      console.error('Error creating graphics object:', error);
      return null;
    }
  }

  /**
   * Draw line with optional dash pattern
   */
  private drawLine(graphics: PIXI.Graphics, points: { x: number; y: number }[], dashPattern?: number[]): void {
    if (points.length < 2) return;

    if (dashPattern && dashPattern.length > 0) {
      this.drawDashedLine(graphics, points, dashPattern);
    } else {
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
    }
  }

  /**
   * Draw dashed line
   */
  private drawDashedLine(graphics: PIXI.Graphics, points: { x: number; y: number }[], dashPattern: number[]): void {
    let dashIndex = 0;
    let dashLength = 0;
    let isDash = true;
    let currentPoint = points[0];
    
    graphics.moveTo(currentPoint.x, currentPoint.y);

    for (let i = 1; i < points.length; i++) {
      const nextPoint = points[i];
      const segmentLength = Math.sqrt(
        Math.pow(nextPoint.x - currentPoint.x, 2) + 
        Math.pow(nextPoint.y - currentPoint.y, 2)
      );
      
      let remainingLength = segmentLength;
      let segmentStart = currentPoint;

      while (remainingLength > 0) {
        const currentDashLength = dashPattern[dashIndex % dashPattern.length];
        const drawLength = Math.min(remainingLength, currentDashLength - dashLength);
        
        const ratio = drawLength / segmentLength;
        const segmentEnd = {
          x: segmentStart.x + (nextPoint.x - currentPoint.x) * ratio,
          y: segmentStart.y + (nextPoint.y - currentPoint.y) * ratio
        };

        if (isDash) {
          graphics.lineTo(segmentEnd.x, segmentEnd.y);
        } else {
          graphics.moveTo(segmentEnd.x, segmentEnd.y);
        }

        dashLength += drawLength;
        remainingLength -= drawLength;
        segmentStart = segmentEnd;

        if (dashLength >= currentDashLength) {
          dashLength = 0;
          dashIndex++;
          isDash = !isDash;
        }
      }

      currentPoint = nextPoint;
    }
  }

  /**
   * Draw polygon
   */
  private drawPolygon(graphics: PIXI.Graphics, points: { x: number; y: number }[]): void {
    if (points.length < 3) return;

    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
  }

  /**
   * Draw circle
   */
  private drawCircle(graphics: PIXI.Graphics, center: { x: number; y: number }, radius: number): void {
    graphics.drawCircle(center.x, center.y, radius);
  }

  /**
   * Draw arc
   */
  private drawArc(graphics: PIXI.Graphics, points: { x: number; y: number }[]): void {
    if (points.length < 3) return;
    
    // Simple arc implementation - in a real scenario, this would be more sophisticated
    const center = points[0];
    const start = points[1];
    const end = points[2];
    
    const radius = Math.sqrt(Math.pow(start.x - center.x, 2) + Math.pow(start.y - center.y, 2));
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    
    graphics.arc(center.x, center.y, radius, startAngle, endAngle);
  }

  /**
   * Draw bezier curve
   */
  private drawBezier(graphics: PIXI.Graphics, points: { x: number; y: number }[]): void {
    if (points.length < 4) return;
    
    graphics.moveTo(points[0].x, points[0].y);
    
    // Draw cubic bezier curve
    for (let i = 0; i < points.length - 3; i += 3) {
      graphics.bezierCurveTo(
        points[i + 1].x, points[i + 1].y,
        points[i + 2].x, points[i + 2].y,
        points[i + 3].x, points[i + 3].y
      );
    }
  }

  /**
   * Create PIXI Text object from data
   */
  private createTextObject(data: PixiLabelData): PIXI.Text | null {
    try {
      const style = new PIXI.TextStyle({
        fontSize: data.style.fontSize,
        fontFamily: data.style.fontFamily,
        fill: data.style.color,
        backgroundColor: data.style.backgroundColor,
        padding: data.style.padding || 0,
        borderRadius: data.style.borderRadius || 0
      });

      const text = new PIXI.Text(data.text, style);
      text.position.set(data.position.x, data.position.y);
      text.anchor.set(data.anchor.x, data.anchor.y);
      text.visible = data.visible;

      return text;
    } catch (error) {
      console.error('Error creating text object:', error);
      return null;
    }
  }

  /**
   * Create animation
   */
  private createAnimation(data: PixiAnimationData): void {
    const target = this.findObjectById(data.targetId);
    if (!target) return;

    const ticker = new PIXI.Ticker();
    let startTime = 0;
    let isStarted = false;

    ticker.add(() => {
      if (!isStarted) {
        startTime = Date.now();
        isStarted = true;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / data.duration, 1);
      const easedProgress = this.applyEasing(progress, data.easing);

      this.applyAnimationProperties(target, data, easedProgress);

      if (progress >= 1) {
        if (data.loop) {
          isStarted = false;
        } else {
          ticker.stop();
          this.animations.delete(data.targetId);
        }
      }
    });

    if (data.autoStart) {
      ticker.start();
    }

    this.animations.set(data.targetId, ticker);
  }

  /**
   * Apply easing function to progress
   */
  private applyEasing(progress: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      default:
        return progress;
    }
  }

  /**
   * Apply animation properties to target
   */
  private applyAnimationProperties(target: PIXI.DisplayObject, data: PixiAnimationData, progress: number): void {
    switch (data.type) {
      case 'fade':
        target.alpha = data.properties.startAlpha + 
          (data.properties.endAlpha - data.properties.startAlpha) * progress;
        break;
      
      case 'scale':
        const scale = data.properties.startScale + 
          (data.properties.endScale - data.properties.startScale) * progress;
        target.scale.set(scale);
        break;
      
      case 'move':
        target.position.x = data.properties.startX + 
          (data.properties.endX - data.properties.startX) * progress;
        target.position.y = data.properties.startY + 
          (data.properties.endY - data.properties.startY) * progress;
        break;
      
      case 'rotate':
        target.rotation = data.properties.startRotation + 
          (data.properties.endRotation - data.properties.startRotation) * progress;
        break;
      
      case 'pulse':
        const pulseScale = 1 + Math.sin(progress * Math.PI * 2) * data.properties.amplitude;
        target.scale.set(pulseScale);
        break;
    }
  }

  /**
   * Create interactive element
   */
  private createInteractiveElement(data: PixiInteractiveData): void {
    const element = new PIXI.Container();
    element.interactive = true;
    element.cursor = data.cursor;
    element.hitArea = new PIXI.Rectangle(data.bounds.x, data.bounds.y, data.bounds.width, data.bounds.height);

    if (data.onClick) {
      element.on('click', data.onClick);
    }
    
    if (data.onHover) {
      element.on('mouseover', data.onHover);
    }
    
    if (data.onHoverOut) {
      element.on('mouseout', data.onHoverOut);
    }

    this.interactiveElements.set(data.id, element);
    this.container.addChild(element);
  }

  /**
   * Find object by ID
   */
  private findObjectById(id: string): PIXI.DisplayObject | null {
    return this.graphicsObjects.get(id) || this.textObjects.get(id) || null;
  }

  /**
   * Clear previous render
   */
  private clearPreviousRender(): void {
    // Remove all graphics objects
    this.graphicsObjects.forEach(graphics => {
      this.container.removeChild(graphics);
      graphics.destroy();
    });
    this.graphicsObjects.clear();

    // Remove all text objects
    this.textObjects.forEach(text => {
      this.container.removeChild(text);
      text.destroy();
    });
    this.textObjects.clear();

    // Stop all animations
    this.animations.forEach(ticker => {
      ticker.stop();
      ticker.destroy();
    });
    this.animations.clear();

    // Remove interactive elements
    this.interactiveElements.forEach(element => {
      this.container.removeChild(element);
      element.destroy();
    });
    this.interactiveElements.clear();
  }

  /**
   * Update visualization mode
   */
  updateVisualizationMode(mode: BIMVisualizationModes): void {
    // Apply mode-specific rendering optimizations
    switch (mode) {
      case 'quality_heatmap':
        // Enable color blending for smooth gradients
        this.container.blendMode = PIXI.BLEND_MODES.NORMAL;
        break;
      
      case 'offset_curves':
        // Enable anti-aliasing for smooth curves
        this.app.renderer.antialias = true;
        break;
      
      case 'intersection_data':
        // Enable high precision rendering
        this.app.renderer.resolution = 2;
        break;
      
      default:
        // Reset to default settings
        this.container.blendMode = PIXI.BLEND_MODES.NORMAL;
        this.app.renderer.antialias = true;
        this.app.renderer.resolution = 1;
        break;
    }
  }

  /**
   * Get rendering statistics
   */
  getRenderingStats(): {
    graphicsCount: number;
    textCount: number;
    animationCount: number;
    interactiveCount: number;
    totalObjects: number;
  } {
    return {
      graphicsCount: this.graphicsObjects.size,
      textCount: this.textObjects.size,
      animationCount: this.animations.size,
      interactiveCount: this.interactiveElements.size,
      totalObjects: this.container.children.length
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearPreviousRender();
    this.container.destroy({ children: true });
  }
}