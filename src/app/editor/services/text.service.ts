import { Injectable } from '@angular/core';
import { HistoryService } from './history.service';
import { DocumentStoreService } from './document-store.service';
import { AddObjectCommand, UpdateTextCommand } from '../core/commands/object.commands';
import { EditorObjectFactory, TextObject } from '../core/models/document.model';

/**
 * TextService - Handles text object creation and editing
 * 
 * Responsibilities:
 * - Text object creation
 * - Text property updates
 * - Emoji/icon as text creation
 * - Text positioning calculations
 */
@Injectable({
  providedIn: 'root',
})
export class TextService {
  constructor(
    private documentStore: DocumentStoreService,
    private history: HistoryService
  ) {}

  /**
   * Add text at specified position or canvas center
   * 
   * @param text - The text content
   * @param options - Optional text properties
   */
  async addText(text: string = 'Double-click to edit', options?: Partial<TextObject>): Promise<void> {
    const canvasCenter = this.getCanvasCenter();
    
    const textObject = EditorObjectFactory.createTextObject(
      text,
      options?.x || canvasCenter.x,
      options?.y || canvasCenter.y,
      options?.fontSize || 32,
      options?.fontFamily || 'Arial',
      options?.fill || '#000000'
    );

    // Apply any additional options
    if (options) {
      Object.assign(textObject, options);
    }

    await this.history.run(new AddObjectCommand(textObject));
  }

  /**
   * Update text properties of a specific text object
   * 
   * @param objectId - The ID of the text object to update
   * @param properties - The properties to update
   */
  async updateTextProperties(objectId: string, properties: Partial<TextObject>): Promise<void> {
    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'text') return;

    // Create update command
    const textObj = obj as TextObject;
    const updatedText: TextObject = { ...textObj, ...properties };
    
    await this.history.run(new UpdateTextCommand(objectId, updatedText));
  }

  /**
   * Update text properties of the currently selected text object
   * 
   * @param properties - The properties to update
   */
  async updateSelectedTextProperties(properties: Partial<TextObject>): Promise<void> {
    const selectedId = this.documentStore.getSelectedObjectId();
    if (!selectedId) return;

    await this.updateTextProperties(selectedId, properties);
  }

  /**
   * Add an emoji/icon as text to the canvas
   * 
   * @param emoji - The emoji character
   * @param options - Optional positioning and size
   */
  async addEmoji(emoji: string, options?: { x?: number; y?: number; size?: number }): Promise<void> {
    const canvasCenter = this.getCanvasCenter();
    
    const textObject = EditorObjectFactory.createTextObject(
      emoji,
      options?.x || canvasCenter.x,
      options?.y || canvasCenter.y,
      options?.size || 64,
      'Arial',
      '#000000'
    );

    await this.history.run(new AddObjectCommand(textObject));
  }

  /**
   * Set text mode cursor on canvas (for UI coordination)
   * 
   * @param canvas - The Fabric canvas instance
   */
  enableTextMode(canvas: any): void {
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'text';
  }

  /**
   * Disable text mode and restore selection mode
   * 
   * @param canvas - The Fabric canvas instance
   */
  disableTextMode(canvas: any): void {
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';
  }

  /**
   * Get canvas center point for positioning
   */
  private getCanvasCenter(): { x: number; y: number } {
    const dims = this.documentStore.getDimensions();
    return {
      x: dims.width / 2,
      y: dims.height / 2,
    };
  }
}
