import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { ShapeService } from './shape.service';
import { TransformObjectCommand } from '../core/commands/object.commands';
import { ImageObject } from '../core/models/document.model';

/**
 * ImageManipulationService - Handles image-specific operations
 * 
 * Responsibilities:
 * - Blend mode management
 * - Opacity adjustments
 * - Image cropping
 * - Image resizing
 * - Mask application (circle, shapes, rounded corners)
 * - Mask removal
 */
@Injectable({
  providedIn: 'root',
})
export class ImageManipulationService {
  constructor(
    private documentStore: DocumentStoreService,
    private history: HistoryService,
    private shapeService: ShapeService
  ) {}

  /**
   * Set blend mode for selected image
   * 
   * @param canvas - The Fabric canvas instance
   * @param getFabricObjectId - Function to get object ID from Fabric object
   * @param updateObject - Function to update object in renderer
   * @param mode - The blend mode string
   */
  async setBlendMode(
    canvas: fabric.Canvas,
    getFabricObjectId: (obj: fabric.Object) => string | null,
    updateObject: (obj: any) => Promise<void>,
    mode: string
  ): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const objectId = getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const imageObj = obj as ImageObject;
    const updated = { ...imageObj, globalCompositeOperation: mode };
    
    await updateObject(updated);
    canvas.requestRenderAll();
  }

  /**
   * Set opacity of selected object
   * 
   * @param canvas - The Fabric canvas instance
   * @param getFabricObjectId - Function to get object ID from Fabric object
   * @param updateObject - Function to update object in renderer
   * @param opacity - Opacity value (0-1)
   */
  async setOpacity(
    canvas: fabric.Canvas,
    getFabricObjectId: (obj: fabric.Object) => string | null,
    updateObject: (obj: any) => Promise<void>,
    opacity: number
  ): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const objectId = getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj) return;

    const updated = { ...obj, opacity };
    
    await updateObject(updated);
    canvas.requestRenderAll();
  }

  /**
   * Apply rectangular crop to selected image
   * 
   * @param canvas - The Fabric canvas instance
   * @param getFabricObjectId - Function to get object ID from Fabric object
   * @param updateObject - Function to update object in renderer
   * @param cropRect - The crop rectangle {x, y, width, height}
   */
  async cropImage(
    canvas: fabric.Canvas,
    getFabricObjectId: (obj: fabric.Object) => string | null,
    updateObject: (obj: any) => Promise<void>,
    cropRect: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    // Create clipPath
    const clipPath = new fabric.Rect({
      left: cropRect.x - (activeObj.left || 0),
      top: cropRect.y - (activeObj.top || 0),
      width: cropRect.width,
      height: cropRect.height,
      absolutePositioned: true,
    });

    const imageObj = obj as ImageObject;
    const updated = { ...imageObj, clipPath };
    
    await updateObject(updated);
    canvas.requestRenderAll();
  }

  /**
   * Resize selected image to specific dimensions
   * 
   * @param canvas - The Fabric canvas instance
   * @param getFabricObjectId - Function to get object ID from Fabric object
   * @param targetWidth - Target width
   * @param targetHeight - Target height
   */
  async resizeImage(
    canvas: fabric.Canvas,
    getFabricObjectId: (obj: fabric.Object) => string | null,
    targetWidth: number,
    targetHeight: number
  ): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = getFabricObjectId(activeObj);
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
   * Apply circular mask to selected image
   * 
   * @param canvas - The Fabric canvas instance
   * @param getFabricObjectId - Function to get object ID from Fabric object
   * @param updateObject - Function to update object in renderer
   */
  async applyCircleMask(
    canvas: fabric.Canvas,
    getFabricObjectId: (obj: fabric.Object) => string | null,
    updateObject: (obj: any) => Promise<void>
  ): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = getFabricObjectId(activeObj);
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
    
    await updateObject(updated);
    canvas.requestRenderAll();
  }

  /**
   * Remove clip path from selected image
   * 
   * @param canvas - The Fabric canvas instance
   * @param getFabricObjectId - Function to get object ID from Fabric object
   * @param selectObjectById - Function to reselect object after update
   * @param setIsProgrammaticUpdate - Function to set/unset programmatic update flag
   */
  async removeClipPath(
    canvas: fabric.Canvas,
    getFabricObjectId: (obj: fabric.Object) => string | null,
    selectObjectById: (id: string) => void,
    setIsProgrammaticUpdate: (value: boolean) => void
  ): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const objectId = getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    // Use history service with UpdateClipPathCommand
    const { UpdateClipPathCommand } = await import('../core/commands/object.commands');
    
    // Set flag to prevent object:modified from firing during programmatic update
    setIsProgrammaticUpdate(true);
    try {
      await this.history.run(new UpdateClipPathCommand(objectId, undefined));
      canvas.requestRenderAll();
      
      // Re-select the object to keep it selected after removing mask
      setTimeout(() => {
        selectObjectById(objectId);
      }, 0);
    } finally {
      setIsProgrammaticUpdate(false);
    }
  }

  /**
   * Apply shape mask to selected image
   * 
   * @param canvas - The Fabric canvas instance
   * @param getFabricObjectId - Function to get object ID from Fabric object
   * @param selectObjectById - Function to reselect object after update
   * @param setIsProgrammaticUpdate - Function to set/unset programmatic update flag
   * @param shapeType - The shape type for the mask
   */
  async applyShapeMask(
    canvas: fabric.Canvas,
    getFabricObjectId: (obj: fabric.Object) => string | null,
    selectObjectById: (id: string) => void,
    setIsProgrammaticUpdate: (value: boolean) => void,
    shapeType: 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'heart' | 'diamond'
  ): Promise<void> {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const width = activeObj.width || 100;
    const height = activeObj.height || 100;

    const clipPath = this.shapeService.createShapeClipPath(shapeType, width, height);

    // Use history service with UpdateClipPathCommand
    const { UpdateClipPathCommand } = await import('../core/commands/object.commands');
    
    // Set flag to prevent object:modified from firing during programmatic update
    setIsProgrammaticUpdate(true);
    try {
      await this.history.run(new UpdateClipPathCommand(objectId, clipPath));
      canvas.requestRenderAll();
      
      // Re-select the object to keep it selected after shape change
      setTimeout(() => {
        selectObjectById(objectId);
      }, 0);
    } finally {
      setIsProgrammaticUpdate(false);
    }
  }

  /**
   * Apply rounded corners to selected image using clipPath
   * 
   * @param canvas - The Fabric canvas instance
   * @param getFabricObjectId - Function to get object ID from Fabric object
   * @param selectObjectById - Function to reselect object after update
   * @param setIsProgrammaticUpdate - Function to set/unset programmatic update flag
   * @param radiusPercent - Corner radius as percentage
   */
  async applyRoundedCorners(
    canvas: fabric.Canvas,
    getFabricObjectId: (obj: fabric.Object) => string | null,
    selectObjectById: (id: string) => void,
    setIsProgrammaticUpdate: (value: boolean) => void,
    radiusPercent: number
  ): Promise<void> {
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const width = activeObj.width || 100;
    const height = activeObj.height || 100;

    const clipPath = this.shapeService.createRoundedRectClipPath(width, height, radiusPercent);

    // Use history service with UpdateClipPathCommand
    const { UpdateClipPathCommand } = await import('../core/commands/object.commands');
    
    setIsProgrammaticUpdate(true);
    try {
      await this.history.run(new UpdateClipPathCommand(objectId, clipPath));
      canvas.requestRenderAll();
      
      setTimeout(() => {
        selectObjectById(objectId);
      }, 0);
    } finally {
      setIsProgrammaticUpdate(false);
    }
  }
}
