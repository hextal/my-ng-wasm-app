import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { AssetStoreService } from './asset-store.service';
import { ShapeService } from './shape.service';
import {
  TransformObjectCommand,
  FlipObjectCommand,
} from '../core/commands/object.commands';
import {
  EditorObject,
  ImageObject,
  TransformSnapshot,
} from '../core/models/document.model';

/**
 * ObjectTransformService
 * 
 * SOLID Principle: Single Responsibility
 * This service handles ONLY object transformation operations.
 * 
 * Purpose:
 * - Rotate objects
 * - Flip objects (horizontal/vertical)
 * - Scale/resize objects
 * - Apply masks and clip paths
 * - Set opacity and blend modes
 * - Manage z-order (bring forward/send backward)
 * - Capture and manage transform snapshots for undo/redo
 * 
 * This service should NOT:
 * - Initialize canvas
 * - Handle events
 * - Manage tool state
 * - Add/remove objects (that's for other services)
 */
@Injectable({
  providedIn: 'root',
})
export class ObjectTransformService {
  // Store transform snapshots for undo/redo
  private transformSnapshots = new Map<string, TransformSnapshot>();
  private isProgrammaticUpdate = false; // Flag to prevent event loops

  constructor(
    private documentStore: DocumentStoreService,
    private history: HistoryService,
    private assetStore: AssetStoreService,
    private shapeService: ShapeService
  ) {}

  /**
   * Set flag to prevent object:modified events during programmatic updates
   */
  setIsProgrammaticUpdate(value: boolean): void {
    this.isProgrammaticUpdate = value;
  }

  /**
   * Get isProgrammaticUpdate flag
   */
  getIsProgrammaticUpdate(): boolean {
    return this.isProgrammaticUpdate;
  }

  /**
   * Bring selected object forward
   */
  async bringForward(canvas: fabric.Canvas, renderer: FabricRenderer): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    // Simple implementation: bring to front
    canvas.bringObjectToFront(activeObj);
    canvas.requestRenderAll();
  }

  /**
   * Send selected object backward
   */
  async sendBackward(canvas: fabric.Canvas, renderer: FabricRenderer): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    // Simple implementation: send to back
    canvas.sendObjectToBack(activeObj);
    canvas.requestRenderAll();
  }

  /**
   * Rotate selected object
   */
  async rotateSelected(canvas: fabric.Canvas, deltaAngle: number): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const currentAngle = activeObj.angle || 0;
    activeObj.rotate(currentAngle + deltaAngle);
    canvas.requestRenderAll();
  }

  /**
   * Flip selected object horizontally
   */
  async flipX(canvas: fabric.Canvas, renderer: FabricRenderer): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    // Capture before state
    const beforeFlip = { flipX: activeObj.flipX || false, flipY: activeObj.flipY || false };
    
    // Directly modify the Fabric object
    activeObj.set('flipX', !activeObj.flipX);
    activeObj.setCoords();
    
    // Capture after state
    const afterFlip = { flipX: activeObj.flipX || false, flipY: activeObj.flipY || false };
    
    // Update document store and add to history
    await this.history.run(
      new FlipObjectCommand(objectId, beforeFlip, afterFlip)
    );
    
    canvas.requestRenderAll();
    
    // Re-select the object after the canvas re-renders
    setTimeout(() => {
      this.selectObjectById(canvas, renderer, objectId);
    }, 0);
  }

  /**
   * Flip selected object vertically
   */
  async flipY(canvas: fabric.Canvas, renderer: FabricRenderer): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    // Capture before state
    const beforeFlip = { flipX: activeObj.flipX || false, flipY: activeObj.flipY || false };
    
    // Directly modify the Fabric object
    activeObj.set('flipY', !activeObj.flipY);
    activeObj.setCoords();
    
    // Capture after state
    const afterFlip = { flipX: activeObj.flipX || false, flipY: activeObj.flipY || false };
    
    // Update document store and add to history
    await this.history.run(
      new FlipObjectCommand(objectId, beforeFlip, afterFlip)
    );
    
    canvas.requestRenderAll();
    
    // Re-select the object after the canvas re-renders
    setTimeout(() => {
      this.selectObjectById(canvas, renderer, objectId);
    }, 0);
  }

  /**
   * Set blend mode for selected image
   */
  async setBlendMode(canvas: fabric.Canvas, renderer: FabricRenderer, mode: string): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const imageObj = obj as ImageObject;
    const updated = { ...imageObj, globalCompositeOperation: mode };
    
    await renderer.updateObject(updated);
    canvas.requestRenderAll();
  }

  /**
   * Set opacity of selected object
   */
  async setOpacity(canvas: fabric.Canvas, renderer: FabricRenderer, opacity: number): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj) return;

    const updated = { ...obj, opacity };
    
    await renderer.updateObject(updated);
    canvas.requestRenderAll();
  }

  /**
   * Apply circular mask to selected image
   */
  async applyCircleMask(canvas: fabric.Canvas, renderer: FabricRenderer): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const width = activeObj.getScaledWidth();
    const height = activeObj.getScaledHeight();
    const radius = Math.min(width, height) / 2;

    // Create circular clipPath
    const clipPath = new fabric.Circle({
      radius,
      originX: 'center',
      originY: 'center',
    });

    const imageObj = obj as ImageObject;
    const updated = { ...imageObj, clipPath };
    
    await renderer.updateObject(updated);
    canvas.requestRenderAll();
  }

  /**
   * Remove clip path from selected image
   */
  async removeClipPath(canvas: fabric.Canvas, renderer: FabricRenderer): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    // Use history service with UpdateClipPathCommand
    const { UpdateClipPathCommand } = await import('../core/commands/object.commands');
    
    // Set flag to prevent object:modified from firing during programmatic update
    this.isProgrammaticUpdate = true;
    try {
      await this.history.run(new UpdateClipPathCommand(objectId, undefined));
      canvas.requestRenderAll();
      
      // Re-select the object to keep it selected after removing mask
      setTimeout(() => {
        this.selectObjectById(canvas, renderer, objectId);
      }, 0);
    } finally {
      this.isProgrammaticUpdate = false;
    }
  }

  /**
   * Apply shape mask to selected image
   */
  async applyShapeMask(
    canvas: fabric.Canvas,
    renderer: FabricRenderer,
    shapeType: 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'heart' | 'diamond'
  ): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const width = activeObj.width || 100;
    const height = activeObj.height || 100;

    const clipPath = this.shapeService.createShapeClipPath(shapeType, width, height);

    // Use history service with UpdateClipPathCommand
    const { UpdateClipPathCommand } = await import('../core/commands/object.commands');
    
    // Set flag to prevent object:modified from firing during programmatic update
    this.isProgrammaticUpdate = true;
    try {
      await this.history.run(new UpdateClipPathCommand(objectId, clipPath));
      canvas.requestRenderAll();
      
      // Re-select the object to keep it selected after shape change
      setTimeout(() => {
        this.selectObjectById(canvas, renderer, objectId);
      }, 0);
    } finally {
      this.isProgrammaticUpdate = false;
    }
  }

  /**
   * Apply rounded corners to selected image using clipPath
   */
  async applyRoundedCorners(canvas: fabric.Canvas, renderer: FabricRenderer, radiusPercent: number): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const width = activeObj.width || 100;
    const height = activeObj.height || 100;

    const clipPath = this.shapeService.createRoundedRectClipPath(width, height, radiusPercent);

    // Use history service with UpdateClipPathCommand
    const { UpdateClipPathCommand } = await import('../core/commands/object.commands');
    
    this.isProgrammaticUpdate = true;
    try {
      await this.history.run(new UpdateClipPathCommand(objectId, clipPath));
      canvas.requestRenderAll();
      
      setTimeout(() => {
        this.selectObjectById(canvas, renderer, objectId);
      }, 0);
    } finally {
      this.isProgrammaticUpdate = false;
    }
  }

  /**
   * Resize selected image to specific dimensions
   */
  async resizeImage(canvas: fabric.Canvas, renderer: FabricRenderer, targetWidth: number, targetHeight: number): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    // Calculate the scale factors needed to achieve target dimensions
    const currentWidth = activeObj.width || 1;
    const currentHeight = activeObj.height || 1;
    const currentScaleX = activeObj.scaleX || 1;
    const currentScaleY = activeObj.scaleY || 1;

    // New scale factors to achieve target dimensions
    const newScaleX = (targetWidth / currentWidth) * (currentScaleX / currentScaleX);
    const newScaleY = (targetHeight / currentHeight) * (currentScaleY / currentScaleY);

    // Capture before state for undo
    const beforeTransform = {
      x: activeObj.left || 0,
      y: activeObj.top || 0,
      scaleX: currentScaleX,
      scaleY: currentScaleY,
      angle: activeObj.angle || 0,
      opacity: activeObj.opacity ?? 1,
    };

    // Apply new scale
    activeObj.set({
      scaleX: newScaleX,
      scaleY: newScaleY,
    });
    activeObj.setCoords();

    // Capture after state
    const afterTransform = {
      x: activeObj.left || 0,
      y: activeObj.top || 0,
      scaleX: newScaleX,
      scaleY: newScaleY,
      angle: activeObj.angle || 0,
      opacity: activeObj.opacity ?? 1,
    };

    // Update document store via history
    await this.history.run(
      new TransformObjectCommand(objectId, beforeTransform, afterTransform)
    );

    canvas.requestRenderAll();
  }

  /**
   * Capture transform snapshot before modification
   */
  captureTransformSnapshot(renderer: FabricRenderer, obj: fabric.Object): void {
    const objectId = renderer.getFabricObjectId(obj);
    if (!objectId) return;

    // Only capture once per gesture
    if (this.transformSnapshots.has(objectId)) return;

    const snapshot = this.captureCurrentTransform(obj);
    this.transformSnapshots.set(objectId, snapshot);
  }

  /**
   * Handle object modification completion
   */
  async handleObjectModified(renderer: FabricRenderer, obj: fabric.Object): Promise<void> {
    // Skip if this is a programmatic update (from history/commands)
    if (this.isProgrammaticUpdate) return;

    const objectId = renderer.getFabricObjectId(obj);
    if (!objectId) return;

    const beforeTransform = this.transformSnapshots.get(objectId);
    if (!beforeTransform) return;

    const afterTransform = this.captureCurrentTransform(obj);

    // Only create command if transform actually changed
    if (this.hasTransformChanged(beforeTransform, afterTransform)) {
      await this.history.run(
        new TransformObjectCommand(objectId, beforeTransform, afterTransform)
      );
    }

    // Clear snapshot
    this.transformSnapshots.delete(objectId);
  }

  /**
   * Capture current transform state of a Fabric object
   */
  private captureCurrentTransform(obj: fabric.Object): TransformSnapshot {
    return {
      x: obj.left || 0,
      y: obj.top || 0,
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      angle: obj.angle || 0,
      opacity: obj.opacity ?? 1,
    };
  }

  /**
   * Check if transform has actually changed
   */
  private hasTransformChanged(
    before: TransformSnapshot,
    after: TransformSnapshot
  ): boolean {
    return (
      Math.abs(before.x - after.x) > 0.01 ||
      Math.abs(before.y - after.y) > 0.01 ||
      Math.abs(before.scaleX - after.scaleX) > 0.001 ||
      Math.abs(before.scaleY - after.scaleY) > 0.001 ||
      Math.abs(before.angle - after.angle) > 0.01 ||
      Math.abs((before.opacity || 1) - (after.opacity || 1)) > 0.001
    );
  }

  /**
   * Select object by ID
   */
  private selectObjectById(canvas: fabric.Canvas, renderer: FabricRenderer, objectId: string): void {
    const fabricObj = renderer.getFabricObject(objectId);
    if (fabricObj) {
      canvas.setActiveObject(fabricObj);
      canvas.requestRenderAll();
    }
  }
}
