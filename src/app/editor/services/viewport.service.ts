import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

/**
 * ViewportService - Manages canvas viewport operations
 * Handles zoom and pan functionality following Single Responsibility Principle
 */
@Injectable({
  providedIn: 'root',
})
export class ViewportService {
  /**
   * Set zoom level
   * @param canvas - Fabric canvas instance
   * @param zoom - Zoom level (clamped between 0.1 and 5)
   */
  setZoom(canvas: fabric.Canvas, zoom: number): void {
    if (!canvas) return;
    
    // Clamp zoom between 0.1 and 5
    zoom = Math.max(0.1, Math.min(5, zoom));
    
    canvas.setZoom(zoom);
    canvas.requestRenderAll();
  }

  /**
   * Get current zoom level
   * @param canvas - Fabric canvas instance
   * @returns Current zoom level (defaults to 1)
   */
  getZoom(canvas: fabric.Canvas): number {
    return canvas?.getZoom() || 1;
  }

  /**
   * Zoom in by 10%
   * @param canvas - Fabric canvas instance
   */
  zoomIn(canvas: fabric.Canvas): void {
    const currentZoom = this.getZoom(canvas);
    this.setZoom(canvas, currentZoom * 1.1);
  }

  /**
   * Zoom out by 10%
   * @param canvas - Fabric canvas instance
   */
  zoomOut(canvas: fabric.Canvas): void {
    const currentZoom = this.getZoom(canvas);
    this.setZoom(canvas, currentZoom / 1.1);
  }

  /**
   * Reset zoom to 100%
   * @param canvas - Fabric canvas instance
   */
  resetZoom(canvas: fabric.Canvas): void {
    this.setZoom(canvas, 1);
  }

  /**
   * Enable mouse wheel zoom
   * @param canvas - Fabric canvas instance
   */
  enableMouseWheelZoom(canvas: fabric.Canvas): void {
    if (!canvas) return;

    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      
      // Clamp zoom
      zoom = Math.max(0.1, Math.min(5, zoom));
      
      canvas.setZoom(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  /**
   * Enable panning with Alt+drag
   * @param canvas - Fabric canvas instance
   */
  enablePanning(canvas: fabric.Canvas): void {
    if (!canvas) return;

    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      if (evt.altKey === true) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', (opt: any) => {
      if (isPanning) {
        const evt = opt.e;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          canvas.requestRenderAll();
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
        }
      }
    });

    canvas.on('mouse:up', () => {
      isPanning = false;
      canvas.selection = true;
    });
  }

  /**
   * Reset pan to center
   * @param canvas - Fabric canvas instance
   */
  resetPan(canvas: fabric.Canvas): void {
    if (!canvas) return;
    
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    canvas.requestRenderAll();
  }
}
