import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { DocumentStoreService } from './document-store.service';

/**
 * SnappingService - Manages canvas snapping and guide lines
 * Handles snap-to-center, snap-to-edges, and visual guide lines
 * Following Single Responsibility Principle
 */
@Injectable({
  providedIn: 'root',
})
export class SnappingService {
  private guideLines: { vertical?: fabric.Line; horizontal?: fabric.Line } = {};

  constructor(private documentStore: DocumentStoreService) {}

  /**
   * Enable snapping with visual guides
   * @param canvas - Fabric canvas instance
   * @param threshold - Snap threshold in pixels (default: 10)
   */
  enableSnapping(canvas: fabric.Canvas, threshold: number = 10): void {
    if (!canvas) return;

    const dims = this.documentStore.getDimensions();
    const centerX = dims.width / 2;
    const centerY = dims.height / 2;

    canvas.on('object:moving', (e: any) => {
      const obj = e.target;
      if (!obj) return;

      const objCenterX = obj.left || 0;
      const objCenterY = obj.top || 0;

      // Snap to center
      if (Math.abs(objCenterX - centerX) < threshold) {
        obj.set({ left: centerX });
        this.showGuideLine(canvas, 'vertical', centerX);
      } else {
        this.hideGuideLine(canvas, 'vertical');
      }

      if (Math.abs(objCenterY - centerY) < threshold) {
        obj.set({ top: centerY });
        this.showGuideLine(canvas, 'horizontal', centerY);
      } else {
        this.hideGuideLine(canvas, 'horizontal');
      }

      // Snap to edges
      if (Math.abs(objCenterX) < threshold) {
        obj.set({ left: 0 });
      }
      if (Math.abs(objCenterX - dims.width) < threshold) {
        obj.set({ left: dims.width });
      }
      if (Math.abs(objCenterY) < threshold) {
        obj.set({ top: 0 });
      }
      if (Math.abs(objCenterY - dims.height) < threshold) {
        obj.set({ top: dims.height });
      }

      obj.setCoords();
    });

    canvas.on('object:modified', () => {
      this.hideGuideLine(canvas, 'vertical');
      this.hideGuideLine(canvas, 'horizontal');
    });
  }

  /**
   * Disable snapping by removing event listeners
   * @param canvas - Fabric canvas instance
   */
  disableSnapping(canvas: fabric.Canvas): void {
    if (!canvas) return;

    // Remove event listeners
    canvas.off('object:moving');
    canvas.off('object:modified');

    // Clear any existing guide lines
    this.hideGuideLine(canvas, 'vertical');
    this.hideGuideLine(canvas, 'horizontal');
  }

  /**
   * Show a guide line at a specific position
   * @param canvas - Fabric canvas instance
   * @param orientation - 'vertical' or 'horizontal'
   * @param position - Position in pixels
   */
  private showGuideLine(
    canvas: fabric.Canvas,
    orientation: 'vertical' | 'horizontal',
    position: number
  ): void {
    if (!canvas) return;

    const dims = this.documentStore.getDimensions();

    // Remove existing guide
    if (this.guideLines[orientation]) {
      canvas.remove(this.guideLines[orientation]!);
    }

    // Create new guide
    const line =
      orientation === 'vertical'
        ? new fabric.Line([position, 0, position, dims.height], {
            stroke: '#00ff00',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          })
        : new fabric.Line([0, position, dims.width, position], {
            stroke: '#00ff00',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          });

    this.guideLines[orientation] = line;
    canvas.add(line);
    canvas.requestRenderAll();
  }

  /**
   * Hide a guide line
   * @param canvas - Fabric canvas instance
   * @param orientation - 'vertical' or 'horizontal'
   */
  private hideGuideLine(
    canvas: fabric.Canvas,
    orientation: 'vertical' | 'horizontal'
  ): void {
    if (!canvas || !this.guideLines[orientation]) return;

    canvas.remove(this.guideLines[orientation]!);
    delete this.guideLines[orientation];
    canvas.requestRenderAll();
  }

  /**
   * Clear all guide lines
   * @param canvas - Fabric canvas instance
   */
  clearGuideLines(canvas: fabric.Canvas): void {
    this.hideGuideLine(canvas, 'vertical');
    this.hideGuideLine(canvas, 'horizontal');
  }
}
