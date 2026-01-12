import * as fabric from 'fabric';
import {
  DocumentModel,
  EditorObject,
  ImageObject,
  PathObject,
  TextObject,
} from '../models/document.model';
import { AssetStoreService } from '../../services/asset-store.service';

/**
 * FabricRenderer - Syncs DocumentModel to Fabric canvas
 * Maintains bidirectional mapping between model and Fabric objects
 */
export class FabricRenderer {
  private canvas: fabric.Canvas | null = null;
  private objectMap = new Map<string, fabric.Object>();
  private imageCache = new Map<string, HTMLImageElement>();

  constructor(private assetStore: AssetStoreService) {}

  /**
   * Initialize renderer with a Fabric canvas
   */
  init(canvas: fabric.Canvas): void {
    this.canvas = canvas;
  }

  /**
   * Render a complete document to the canvas
   */
  async render(doc: DocumentModel): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Set canvas dimensions
    this.canvas.setDimensions({
      width: doc.width,
      height: doc.height,
    });

    // Set background
    if (doc.background.transparent) {
      this.canvas.backgroundColor = 'transparent';
    } else {
      this.canvas.backgroundColor = doc.background.color || '#ffffff';
    }

    // Clear canvas
    this.canvas.clear();
    this.objectMap.clear();

    // Add objects sorted by z-index
    const sortedObjects = [...doc.objects].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const obj of sortedObjects) {
      await this.addObject(obj);
    }

    this.canvas.requestRenderAll();
  }

  /**
   * Add a single object to the canvas
   */
  async addObject(obj: EditorObject): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    let fabricObj: fabric.Object | null = null;

    switch (obj.type) {
      case 'image':
        fabricObj = await this.createFabricImage(obj as ImageObject);
        break;
      case 'path':
        fabricObj = this.createFabricPath(obj as PathObject);
        break;
      case 'text':
        fabricObj = this.createFabricText(obj as TextObject);
        break;
    }

    if (fabricObj) {
      // Attach metadata
      fabricObj.set({
        data: { id: obj.id, type: obj.type },
      });

      this.canvas.add(fabricObj);
      this.objectMap.set(obj.id, fabricObj);
    }
  }

  /**
   * Update an existing object on the canvas
   */
  async updateObject(obj: EditorObject): Promise<void> {
    const fabricObj = this.objectMap.get(obj.id);
    if (!fabricObj) {
      console.warn(`Object not found in map: ${obj.id}`);
      return;
    }

    // Update transform properties
    fabricObj.set({
      left: obj.x,
      top: obj.y,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      visible: obj.visible,
    });
    
    // Update object coordinates (important for clipPath and other features)
    fabricObj.setCoords();

    // For image objects, update image-specific properties
    if (obj.type === 'image' && fabricObj instanceof fabric.Image) {
      const imageObj = obj as ImageObject;
      
      // Update flip properties
      fabricObj.set({
        flipX: imageObj.flipX || false,
        flipY: imageObj.flipY || false,
      });

      // Update blend mode
      if (imageObj.globalCompositeOperation) {
        fabricObj.globalCompositeOperation = imageObj.globalCompositeOperation as GlobalCompositeOperation;
      }

      // Update clipPath if present in the model
      if (imageObj.clipPath !== undefined) {
        fabricObj.set('clipPath', imageObj.clipPath);
        fabricObj.set('dirty', true);
        // Force coordinates update for proper clipPath rendering
        fabricObj.setCoords();
      } else if (imageObj.clipPath === undefined && fabricObj.clipPath) {
        // ClipPath was removed from model, clear it from Fabric object
        fabricObj.set('clipPath', null as any);
        fabricObj.set('dirty', true);
        fabricObj.setCoords();
      }

      const currentAssetId = (fabricObj.get('data') as any)?.assetId;
      
      if (currentAssetId !== imageObj.assetId) {
        // Asset changed, reload image
        const imgElement = await this.loadImage(imageObj.assetId);
        fabricObj.setElement(imgElement);
        fabricObj.set({ dirty: true });
        
        // Update asset ID in metadata
        const data = fabricObj.get('data') as any;
        fabricObj.set({ data: { ...data, assetId: imageObj.assetId } });
      }
    }

    this.canvas?.requestRenderAll();
  }

  /**
   * Remove an object from the canvas
   */
  removeObject(id: string): void {
    const fabricObj = this.objectMap.get(id);
    if (fabricObj && this.canvas) {
      this.canvas.remove(fabricObj);
      this.objectMap.delete(id);
      this.canvas.requestRenderAll();
    }
  }

  /**
   * Get the model object ID from a Fabric object
   */
  getFabricObjectId(fabricObj: fabric.Object): string | null {
    const data = fabricObj.get('data') as any;
    return data?.id ?? null;
  }

  /**
   * Get Fabric object by model ID
   */
  getFabricObject(id: string): fabric.Object | undefined {
    return this.objectMap.get(id);
  }

  /**
   * Clear the renderer
   */
  clear(): void {
    this.objectMap.clear();
    this.imageCache.clear();
    if (this.canvas) {
      this.canvas.clear();
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clear();
    this.canvas = null;
  }

  /**
   * Create a Fabric image from an ImageObject
   */
  private async createFabricImage(obj: ImageObject): Promise<fabric.Image> {
    const imgElement = await this.loadImage(obj.assetId);

    const fabricImage = new fabric.Image(imgElement, {
      left: obj.x,
      top: obj.y,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      visible: obj.visible,
      flipX: obj.flipX || false,
      flipY: obj.flipY || false,
      selectable: obj.selectable !== false,
      hasControls: true,
      hasBorders: true,
      lockMovementX: obj.lockMovementX || false,
      lockMovementY: obj.lockMovementY || false,
      lockScalingX: obj.lockScalingX || false,
      lockScalingY: obj.lockScalingY || false,
      lockRotation: obj.lockRotation || false,
      originX: 'center',
      originY: 'center',
    });

    // Apply blend mode if specified
    if (obj.globalCompositeOperation) {
      fabricImage.globalCompositeOperation = obj.globalCompositeOperation as GlobalCompositeOperation;
    }

    // Apply clipPath if specified
    if (obj.clipPath) {
      fabricImage.clipPath = obj.clipPath;
    }

    // Store asset ID in Fabric object data for tracking
    fabricImage.set({
      data: { id: obj.id, type: 'image', assetId: obj.assetId },
    });

    return fabricImage;
  }

  /**
   * Create a Fabric path from a PathObject
   */
  private createFabricPath(obj: PathObject): fabric.Path {
    const fabricPath = new fabric.Path(obj.path, {
      left: obj.x,
      top: obj.y,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      visible: obj.visible,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      fill: obj.fill,
      selectable: obj.selectable !== false,
      hasControls: true,
      hasBorders: true,
      lockMovementX: obj.lockMovementX || false,
      lockMovementY: obj.lockMovementY || false,
      lockScalingX: obj.lockScalingX || false,
      lockScalingY: obj.lockScalingY || false,
      lockRotation: obj.lockRotation || false,
      originX: 'center',
      originY: 'center',
    });

    return fabricPath;
  }

  /**
   * Create a Fabric text from a TextObject
   */
  private createFabricText(obj: TextObject): fabric.IText {
    const fabricText = new fabric.IText(obj.text, {
      left: obj.x,
      top: obj.y,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      visible: obj.visible,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      fontWeight: obj.fontWeight || 'normal',
      fontStyle: obj.fontStyle || 'normal',
      underline: obj.underline || false,
      lineHeight: obj.lineHeight || 1.16,
      charSpacing: obj.charSpacing || 0,
      fill: obj.fill,
      textAlign: obj.textAlign || 'left',
      selectable: obj.selectable !== false,
      hasControls: true,
      hasBorders: true,
      lockMovementX: obj.lockMovementX || false,
      lockMovementY: obj.lockMovementY || false,
      lockScalingX: obj.lockScalingX || false,
      lockScalingY: obj.lockScalingY || false,
      lockRotation: obj.lockRotation || false,
      originX: 'center',
      originY: 'center',
    });

    return fabricText;
  }

  /**
   * Load an image from the asset store
   * Caches HTMLImageElement to avoid repeated decoding
   */
  private async loadImage(assetId: string): Promise<HTMLImageElement> {
    // Check cache first
    if (this.imageCache.has(assetId)) {
      return this.imageCache.get(assetId)!;
    }

    // Load from asset store
    const objectUrl = await this.assetStore.getObjectUrl(assetId);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(assetId, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${assetId}`));
      };
      img.src = objectUrl;
    });
  }
}
