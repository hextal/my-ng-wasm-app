import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { FabricRenderer } from '../core/renderer/fabric-renderer';

/**
 * KeyboardService
 * 
 * SOLID Principle: Single Responsibility
 * This service handles ONLY keyboard event management.
 * 
 * Purpose:
 * - Listen to keyboard events
 * - Handle object nudging (arrow keys)
 * - Handle delete/backspace for object deletion
 * - Provide keyboard shortcuts
 * 
 * This service should NOT:
 * - Initialize canvas
 * - Manage tool state
 * - Apply transformations directly
 * - Handle mouse events
 */
@Injectable({
  providedIn: 'root',
})
export class KeyboardService {
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {}

  /**
   * Setup keyboard event handlers
   */
  setupKeyboardHandlers(
    canvas: fabric.Canvas,
    renderer: FabricRenderer,
    onDelete: () => void
  ): void {
    // Remove existing listener if any
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }

    // Create new listener
    this.keydownListener = (e: KeyboardEvent) => {
      this.handleKeydown(e, canvas, renderer, onDelete);
    };

    // Add listener
    document.addEventListener('keydown', this.keydownListener);
  }

  /**
   * Remove keyboard event handlers
   */
  removeKeyboardHandlers(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
  }

  /**
   * Handle keydown event
   */
  private handleKeydown(
    e: KeyboardEvent,
    canvas: fabric.Canvas,
    renderer: FabricRenderer,
    onDelete: () => void
  ): void {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    // Handle Delete key
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete();
      return;
    }

    // Prevent default for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }

    const step = e.shiftKey ? 10 : 1;

    switch (e.key) {
      case 'ArrowUp':
        activeObj.set({ top: (activeObj.top || 0) - step });
        break;
      case 'ArrowDown':
        activeObj.set({ top: (activeObj.top || 0) + step });
        break;
      case 'ArrowLeft':
        activeObj.set({ left: (activeObj.left || 0) - step });
        break;
      case 'ArrowRight':
        activeObj.set({ left: (activeObj.left || 0) + step });
        break;
      default:
        return;
    }

    activeObj.setCoords();
    canvas.requestRenderAll();
  }
}
