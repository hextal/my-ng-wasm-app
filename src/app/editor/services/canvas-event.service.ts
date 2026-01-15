import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { TextService } from './text.service';
import { ObjectTransformService } from './object-transform.service';
import {
  AddObjectCommand,
} from '../core/commands/object.commands';
import {
  EditorObjectFactory,
  TextObject,
} from '../core/models/document.model';

/**
 * CanvasEventService
 * 
 * SOLID Principle: Single Responsibility
 * This service handles ONLY Fabric.js canvas event management.
 * 
 * Purpose:
 * - Setup and manage Fabric canvas event listeners
 * - Handle selection events
 * - Handle text editing events
 * - Handle drawing (path:created) events
 * - Handle transform events (rotating, scaling, moving)
 * - Coordinate with other services for event actions
 * 
 * This service should NOT:
 * - Initialize canvas
 * - Manage tool state
 * - Apply transformations directly (delegates to ObjectTransformService)
 * - Handle keyboard events (delegates to KeyboardService)
 */
@Injectable({
  providedIn: 'root',
})
export class CanvasEventService {
  constructor(
    private documentStore: DocumentStoreService,
    private history: HistoryService,
    private textService: TextService,
    private objectTransformService: ObjectTransformService
  ) {}

  /**
   * Setup all Fabric event handlers
   */
  setupEventHandlers(
    canvas: fabric.Canvas,
    renderer: FabricRenderer,
    currentTool: () => string,
    onTextClick: (x: number, y: number) => Promise<void>
  ): void {
    // Text tool - click to add text
    canvas.on('mouse:down', async (e: any) => {
      if (currentTool() !== 'text') return;

      const pointer = e.pointer;
      if (!pointer) return;

      await onTextClick(pointer.x, pointer.y);
    });

    // Selection events
    this.setupSelectionEvents(canvas, renderer);

    // Text editing events
    this.setupTextEvents(canvas, renderer);

    // Drawing events
    this.setupDrawingEvents(canvas, renderer);

    // Transform events
    this.setupTransformEvents(canvas, renderer);
  }

  /**
   * Setup selection event handlers
   */
  private setupSelectionEvents(canvas: fabric.Canvas, renderer: FabricRenderer): void {
    canvas.on('selection:created', (e: any) => {
      const obj = e.selected?.[0];
      if (obj) {
        const objectId = renderer.getFabricObjectId(obj);
        if (objectId) {
          this.documentStore.selectObject(objectId);
        }
      }
    });

    canvas.on('selection:updated', (e: any) => {
      const obj = e.selected?.[0];
      if (obj) {
        const objectId = renderer.getFabricObjectId(obj);
        if (objectId) {
          this.documentStore.selectObject(objectId);
        }
      }
    });

    canvas.on('selection:cleared', () => {
      this.documentStore.selectObject(null);
    });
  }

  /**
   * Setup text editing event handlers
   */
  private setupTextEvents(canvas: fabric.Canvas, renderer: FabricRenderer): void {
    canvas.on('text:changed', async (e: any) => {
      const textObj = e.target;
      if (!textObj || textObj.type !== 'i-text') return;

      const objectId = renderer.getFabricObjectId(textObj);
      if (!objectId) return;

      // Update text content in model
      const obj = this.documentStore.getObject(objectId);
      if (obj && obj.type === 'text') {
        const updatedText = { ...(obj as TextObject), text: textObj.text };
        await this.textService.updateSelectedTextProperties(updatedText);
      }
    });
  }

  /**
   * Setup drawing event handlers
   */
  private setupDrawingEvents(canvas: fabric.Canvas, renderer: FabricRenderer): void {
    canvas.on('path:created', async (e: any) => {
      const fabricObj = e.path;
      if (!fabricObj) return;

      // CircleBrush and SprayBrush create Groups, PencilBrush creates Paths
      // We need to handle both cases
      
      if (fabricObj.type === 'group') {
        // CircleBrush and SprayBrush return a Group
        // Keep the group as-is (don't remove it) since these brushes already added it
        // Just attach our metadata for tracking
        const objectId = crypto.randomUUID();
        fabricObj.set({
          data: { id: objectId, type: 'group' },
        });
        
        // Add to object map so it can be tracked
        renderer['objectMap'].set(objectId, fabricObj);
        
        // Note: Groups aren't stored in document model yet, but they're on the canvas
        // This is a simplified approach - ideally we'd create a GroupObject type
      } else if (fabricObj.type === 'path') {
        // PencilBrush returns a Path - handle as before
        const pathObject = EditorObjectFactory.createPathObject(
          fabricObj.path,
          fabricObj.stroke || '#000000',
          fabricObj.strokeWidth || 1,
          fabricObj.left || 0,
          fabricObj.top || 0
        );

        // Remove the Fabric path (we'll add it via command)
        canvas.remove(fabricObj);

        // Add via command for undo/redo
        await this.history.run(new AddObjectCommand(pathObject));

        // Render the new object
        await renderer.addObject(pathObject);
      }
    });
  }

  /**
   * Setup transform event handlers
   */
  private setupTransformEvents(canvas: fabric.Canvas, renderer: FabricRenderer): void {
    // Transform events - capture before state
    canvas.on('object:rotating', (e: any) => {
      this.objectTransformService.captureTransformSnapshot(renderer, e.target);
    });
    
    canvas.on('object:scaling', (e: any) => {
      this.objectTransformService.captureTransformSnapshot(renderer, e.target);
    });
    
    canvas.on('object:moving', (e: any) => {
      this.objectTransformService.captureTransformSnapshot(renderer, e.target);
    });

    // Transform complete - commit to history
    canvas.on('object:modified', async (e: any) => {
      const obj = e.target;
      if (!obj) return;

      await this.objectTransformService.handleObjectModified(renderer, obj);
    });
  }

  /**
   * Remove all event handlers
   */
  removeEventHandlers(canvas: fabric.Canvas): void {
    canvas.off('mouse:down');
    canvas.off('selection:created');
    canvas.off('selection:updated');
    canvas.off('selection:cleared');
    canvas.off('text:changed');
    canvas.off('path:created');
    canvas.off('object:rotating');
    canvas.off('object:scaling');
    canvas.off('object:moving');
    canvas.off('object:modified');
  }
}
