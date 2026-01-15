import { Injectable, signal } from '@angular/core';
import * as fabric from 'fabric';
import { DrawingService } from './drawing.service';
import { TextService } from './text.service';

/**
 * ToolManagerService
 * 
 * SOLID Principle: Single Responsibility
 * This service handles ONLY tool state management and tool activation.
 * 
 * Purpose:
 * - Manage current tool state
 * - Activate/deactivate tools
 * - Configure tool-specific settings
 * - Coordinate with tool-specific services (DrawingService, TextService)
 * 
 * This service should NOT:
 * - Handle canvas initialization
 * - Apply transformations
 * - Handle events directly
 * - Manage document state
 */
@Injectable({
  providedIn: 'root',
})
export class ToolManagerService {
  private currentTool = signal<'select' | 'draw' | 'text' | 'tuning' | 'crop' | 'shape' | 'icon' | 'filters' | 'corner' | 'watermark'>('select');

  constructor(
    private drawingService: DrawingService,
    private textService: TextService
  ) {}

  /**
   * Get current tool as a signal
   */
  getCurrentTool() {
    return this.currentTool;
  }

  /**
   * Get current tool value
   */
  getCurrentToolValue(): string {
    return this.currentTool();
  }

  /**
   * Set the current tool
   */
  setTool(
    canvas: fabric.Canvas | null,
    tool: 'select' | 'draw' | 'text' | 'tuning' | 'crop' | 'shape' | 'icon' | 'filters' | 'corner' | 'watermark'
  ): void {
    this.currentTool.set(tool);

    if (!canvas) return;

    // Configure canvas based on tool
    switch (tool) {
      case 'draw':
        this.activateDrawTool(canvas);
        break;
      case 'text':
        this.activateTextTool(canvas);
        break;
      case 'shape':
        this.activateShapeTool(canvas);
        break;
      default:
        this.activateSelectTool(canvas);
        break;
    }
  }

  /**
   * Set brush properties for drawing tool
   */
  setBrush(canvas: fabric.Canvas | null, options: { 
    color?: string; 
    width?: number; 
    type?: 'pencil' | 'circle' | 'spray' | 'pattern';
    shadow?: { blur?: number; offsetX?: number; offsetY?: number; color?: string };
  }): void {
    if (!canvas) return;
    this.drawingService.setBrush(canvas, options);
  }

  /**
   * Get current brush type
   */
  getBrushType(canvas: fabric.Canvas | null): string {
    if (!canvas) return 'pencil';
    return this.drawingService.getBrushType(canvas);
  }

  /**
   * Activate select tool
   */
  private activateSelectTool(canvas: fabric.Canvas): void {
    this.drawingService.disableDrawingMode(canvas);
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';
  }

  /**
   * Activate draw tool
   */
  private activateDrawTool(canvas: fabric.Canvas): void {
    this.drawingService.enableDrawingMode(canvas);
    canvas.selection = false;
  }

  /**
   * Activate text tool
   */
  private activateTextTool(canvas: fabric.Canvas): void {
    this.textService.enableTextMode(canvas);
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'text';
  }

  /**
   * Activate shape tool
   */
  private activateShapeTool(canvas: fabric.Canvas): void {
    this.drawingService.disableDrawingMode(canvas);
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
  }
}
