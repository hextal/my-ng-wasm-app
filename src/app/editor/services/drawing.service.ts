import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

/**
 * DrawingService - Handles drawing/brush tools and configuration
 * 
 * Responsibilities:
 * - Drawing mode management
 * - Brush type selection (pencil, circle, spray, pattern)
 * - Brush properties (color, width, shadow)
 * - Brush-specific configuration
 */
@Injectable({
  providedIn: 'root',
})
export class DrawingService {
  /**
   * Enable drawing mode on the canvas
   * Initializes the brush if it doesn't exist
   * 
   * @param canvas - The Fabric canvas instance
   */
  enableDrawingMode(canvas: fabric.Canvas): void {
    if (!canvas) return;

    // Initialize brush if it doesn't exist
    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = '#000000';
      canvas.freeDrawingBrush.width = 15;
    }

    canvas.isDrawingMode = true;
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
  }

  /**
   * Disable drawing mode on the canvas
   * 
   * @param canvas - The Fabric canvas instance
   */
  disableDrawingMode(canvas: fabric.Canvas): void {
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';
  }

  /**
   * Set brush properties for drawing
   * 
   * @param canvas - The Fabric canvas instance
   * @param options - Brush configuration options
   */
  setBrush(
    canvas: fabric.Canvas,
    options: {
      color?: string;
      width?: number;
      type?: 'pencil' | 'circle' | 'spray' | 'pattern';
      shadow?: { blur?: number; offsetX?: number; offsetY?: number; color?: string };
    }
  ): void {
    if (!canvas) return;

    // Set brush type
    if (options.type) {
      switch (options.type) {
        case 'pencil':
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          break;
        case 'circle':
          canvas.freeDrawingBrush = new fabric.CircleBrush(canvas);
          break;
        case 'spray':
          canvas.freeDrawingBrush = new fabric.SprayBrush(canvas);
          break;
        case 'pattern':
          // Pattern brush requires a pattern source
          canvas.freeDrawingBrush = new fabric.PatternBrush(canvas);
          break;
      }
    }

    if (!canvas.freeDrawingBrush) return;

    // Set color
    if (options.color) {
      canvas.freeDrawingBrush.color = options.color;
    }

    // Set width
    if (options.width) {
      canvas.freeDrawingBrush.width = options.width;
    }

    // Set shadow
    if (options.shadow) {
      const shadow = new fabric.Shadow({
        blur: options.shadow.blur || 0,
        offsetX: options.shadow.offsetX || 0,
        offsetY: options.shadow.offsetY || 0,
        color: options.shadow.color || 'rgba(0,0,0,0.3)',
      });
      canvas.freeDrawingBrush.shadow = shadow;
    }

    // Configure brush-specific properties
    const brush = canvas.freeDrawingBrush as any;

    // Circle brush specific
    if (options.type === 'circle' && brush.width) {
      // CircleBrush uses width as the point size
    }

    // Spray brush specific
    if (options.type === 'spray') {
      if (brush.density) brush.density = 20; // Points per spray
      if (brush.dotWidth) brush.dotWidth = 1; // Size of each dot
      if (brush.dotWidthVariance) brush.dotWidthVariance = 1; // Variation in dot size
      if (brush.randomOpacity) brush.randomOpacity = false;
    }
  }

  /**
   * Get current brush type
   * 
   * @param canvas - The Fabric canvas instance
   * @returns The brush type name
   */
  getBrushType(canvas: fabric.Canvas): string {
    if (!canvas || !canvas.freeDrawingBrush) return 'pencil';

    const brush = canvas.freeDrawingBrush;
    if (brush instanceof fabric.CircleBrush) return 'circle';
    if (brush instanceof fabric.SprayBrush) return 'spray';
    if (brush instanceof fabric.PatternBrush) return 'pattern';
    return 'pencil';
  }

  /**
   * Get current brush color
   * 
   * @param canvas - The Fabric canvas instance
   * @returns The brush color
   */
  getBrushColor(canvas: fabric.Canvas): string {
    if (!canvas || !canvas.freeDrawingBrush) return '#000000';
    return canvas.freeDrawingBrush.color;
  }

  /**
   * Get current brush width
   * 
   * @param canvas - The Fabric canvas instance
   * @returns The brush width
   */
  getBrushWidth(canvas: fabric.Canvas): number {
    if (!canvas || !canvas.freeDrawingBrush) return 15;
    return canvas.freeDrawingBrush.width;
  }

  /**
   * Set brush color only
   * 
   * @param canvas - The Fabric canvas instance
   * @param color - The color value
   */
  setBrushColor(canvas: fabric.Canvas, color: string): void {
    if (!canvas || !canvas.freeDrawingBrush) return;
    canvas.freeDrawingBrush.color = color;
  }

  /**
   * Set brush width only
   * 
   * @param canvas - The Fabric canvas instance
   * @param width - The width value
   */
  setBrushWidth(canvas: fabric.Canvas, width: number): void {
    if (!canvas || !canvas.freeDrawingBrush) return;
    canvas.freeDrawingBrush.width = width;
  }
}
