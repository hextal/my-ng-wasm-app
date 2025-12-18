import { Injectable } from '@angular/core';
import { CanvasService } from './canvas.service';

/**
 * HistoryService manages undo/redo history for image editing.
 * Follows Single Responsibility Principle - ONLY handles history management.
 */
@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private history: ImageData[] = [];
  private historyIndex: number = -1;
  private readonly MAX_HISTORY_SIZE = 20;

  constructor(private canvasService: CanvasService) {}

  /**
   * Initialize history with an initial image
   */
  initialize(imageData: ImageData): void {
    this.history = [this.canvasService.copyImageData(imageData)];
    this.historyIndex = 0;
  }

  /**
   * Save current state to history
   */
  save(imageData: ImageData): void {
    // Remove any history after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add current state
    const copy = this.canvasService.copyImageData(imageData);
    this.history.push(copy);
    this.historyIndex++;
    
    // Limit history size
    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Undo to previous state
   */
  undo(): ImageData | null {
    if (!this.canUndo()) return null;
    
    this.historyIndex--;
    const state = this.history[this.historyIndex];
    return this.canvasService.copyImageData(state);
  }

  /**
   * Redo to next state
   */
  redo(): ImageData | null {
    if (!this.canRedo()) return null;
    
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    return this.canvasService.copyImageData(state);
  }

  /**
   * Get current state without modifying history
   */
  getCurrent(): ImageData | null {
    if (this.historyIndex < 0 || this.historyIndex >= this.history.length) {
      return null;
    }
    return this.canvasService.copyImageData(this.history[this.historyIndex]);
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Get history statistics
   */
  getStats(): { size: number; index: number; canUndo: boolean; canRedo: boolean } {
    return {
      size: this.history.length,
      index: this.historyIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }
}
