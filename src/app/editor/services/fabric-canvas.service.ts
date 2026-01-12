import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { filters } from 'fabric';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { AssetStoreService } from './asset-store.service';
import { PhotonFiltersService } from './photon-filters.service';
import {
  AddObjectCommand,
  RemoveObjectCommand,
  TransformObjectCommand,
  UpdateTextCommand,
  FlipObjectCommand,
} from '../core/commands/object.commands';
import {
  EditorObjectFactory,
  PathObject,
  TransformSnapshot,
  TextObject,
  ImageObject,
  EditorObject,
} from '../core/models/document.model';

/**
 * FabricCanvasService - Manages Fabric canvas interactions
 * Handles user input and synchronizes with document store via commands
 */
@Injectable({
  providedIn: 'root',
})
export class FabricCanvasService {
  private canvas: fabric.Canvas | null = null;
  private renderer: FabricRenderer;
  private currentTool: 'select' | 'draw' | 'text' | 'tuning' | 'crop' | 'shape' | 'icon' | 'filters' | 'corner' | 'watermark' = 'select';
  private isInitialized = false;
  
  // Store transform snapshots for undo/redo
  private transformSnapshots = new Map<string, TransformSnapshot>();

  constructor(
    private documentStore: DocumentStoreService,
    private history: HistoryService,
    private assetStore: AssetStoreService,
    private photonFilters: PhotonFiltersService
  ) {
    this.renderer = new FabricRenderer(assetStore);
  }

  /**
   * Initialize Fabric canvas by element ID (simple initialization for integration)
   */
  initializeCanvas(canvasElementId: string, width: number = 800, height: number = 600): void {
    const canvasEl = document.getElementById(canvasElementId) as HTMLCanvasElement;
    if (!canvasEl) {
      throw new Error(`Canvas element with id "${canvasElementId}" not found`);
    }

    this.canvas = new fabric.Canvas(canvasEl, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    this.setupEventHandlers();
    this.setupKeyboardHandlers();
  }

  /**
   * Initialize Fabric canvas
   */
  async init(
    htmlCanvasElement: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<void> {
    console.log('FabricCanvasService: Starting initialization');
    
    // Create Fabric canvas
    this.canvas = new fabric.Canvas(htmlCanvasElement, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
    });

    console.log('FabricCanvasService: Fabric canvas created');

    // Initialize renderer
    this.renderer.init(this.canvas);
    console.log('FabricCanvasService: Renderer initialized');

    // Wire up events
    this.setupEventHandlers();
    this.setupKeyboardHandlers();
    this.enableSnapping();
    this.enableMouseWheelZoom();
    this.enablePanning();

    // Render current document
    const doc = this.documentStore.getSnapshot();
    await this.renderer.render(doc);

    // Subscribe to document changes
    this.documentStore.document$.subscribe(async (doc) => {
      await this.syncCanvasToDocument();
    });

    // Mark as initialized
    this.isInitialized = true;
    console.log('FabricCanvasService: Initialization complete');
  }

  /**
   * Set the current tool
   */
  setTool(tool: 'select' | 'draw' | 'text' | 'tuning' | 'crop' | 'shape' | 'icon' | 'filters' | 'corner' | 'watermark'): void {
    this.currentTool = tool;

    if (!this.canvas) return;

    if (tool === 'draw') {
      // Initialize brush if it doesn't exist
      if (!this.canvas.freeDrawingBrush) {
        this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
        this.canvas.freeDrawingBrush.color = '#000000';
        this.canvas.freeDrawingBrush.width = 15;
      }
      this.canvas.isDrawingMode = true;
      this.canvas.selection = false;
      this.canvas.defaultCursor = 'crosshair';
    } else if (tool === 'text') {
      this.canvas.isDrawingMode = false;
      this.canvas.selection = false;
      this.canvas.defaultCursor = 'text';
    } else if (tool === 'shape') {
      this.canvas.isDrawingMode = false;
      this.canvas.selection = false;
      this.canvas.defaultCursor = 'crosshair';
    } else {
      this.canvas.isDrawingMode = false;
      this.canvas.selection = true;
      this.canvas.defaultCursor = 'default';
    }
  }

  /**
   * Set brush properties for drawing
   */
  setBrush(options: { 
    color?: string; 
    width?: number; 
    type?: 'pencil' | 'circle' | 'spray' | 'pattern';
    shadow?: { blur?: number; offsetX?: number; offsetY?: number; color?: string };
  }): void {
    if (!this.canvas) return;

    // Set brush type
    if (options.type) {
      switch (options.type) {
        case 'pencil':
          this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
          break;
        case 'circle':
          this.canvas.freeDrawingBrush = new fabric.CircleBrush(this.canvas);
          break;
        case 'spray':
          this.canvas.freeDrawingBrush = new fabric.SprayBrush(this.canvas);
          break;
        case 'pattern':
          // Pattern brush requires a pattern source
          this.canvas.freeDrawingBrush = new fabric.PatternBrush(this.canvas);
          break;
      }
    }

    if (!this.canvas.freeDrawingBrush) return;

    // Set color
    if (options.color) {
      this.canvas.freeDrawingBrush.color = options.color;
    }

    // Set width
    if (options.width) {
      this.canvas.freeDrawingBrush.width = options.width;
    }

    // Set shadow
    if (options.shadow) {
      const shadow = new fabric.Shadow({
        blur: options.shadow.blur || 0,
        offsetX: options.shadow.offsetX || 0,
        offsetY: options.shadow.offsetY || 0,
        color: options.shadow.color || 'rgba(0,0,0,0.3)',
      });
      this.canvas.freeDrawingBrush.shadow = shadow;
    }

    // Configure brush-specific properties
    const brush = this.canvas.freeDrawingBrush as any;
    
    // Circle brush specific
    if (options.type === 'circle' && brush.width) {
      // CircleBrush uses width as the point size
    }

    // Spray brush specific
    if (options.type === 'spray') {
      if (brush.density) brush.density = 20; // Points per spray
      if (brush.dotWidth) brush.dotWidth = 1; // Size of each dot
      if (brush.dotWidthVariance) brush.dotWidthVariance = 1; // Variation in dot size
      if (brush.randomOpacity) brush.randomOpacity = false;
    }
  }

  /**
   * Get current brush type
   */
  getBrushType(): string {
    if (!this.canvas || !this.canvas.freeDrawingBrush) return 'pencil';
    
    const brush = this.canvas.freeDrawingBrush;
    if (brush instanceof fabric.CircleBrush) return 'circle';
    if (brush instanceof fabric.SprayBrush) return 'spray';
    if (brush instanceof fabric.PatternBrush) return 'pattern';
    return 'pencil';
  }

  /**
   * Add an image from a Blob
   */
  async addImageFromBlob(blob: Blob): Promise<void> {
    // Ensure canvas is initialized before proceeding
    if (!this.canvas || !this.renderer) {
      throw new Error('Canvas not initialized. Please wait for canvas to be ready.');
    }

    // Store blob in asset store
    const { assetId } = await this.assetStore.put(blob);

    // Load image to get dimensions
    const img = await this.loadImageFromBlob(blob);

    // Get canvas center
    const canvasCenter = this.getCanvasCenter();

    // Create ImageObject
    const imageObject = EditorObjectFactory.createImageObject(
      assetId,
      blob.type,
      img.width,
      img.height,
      canvasCenter.x,
      canvasCenter.y
    );

    // Add via command
    await this.history.run(new AddObjectCommand(imageObject));

    // Render the new object
    await this.renderer.addObject(imageObject);
  }

  /**
   * Delete the selected object
   */
  async deleteSelected(): Promise<void> {
    const selectedId = this.documentStore.getSelectedObjectId();
    if (!selectedId) return;

    await this.history.run(new RemoveObjectCommand(selectedId));
    this.renderer.removeObject(selectedId);
    this.documentStore.selectObject(null);
  }

  /**
   * Bring selected object forward
   */
  async bringForward(): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || !this.canvas) return;

    // Simple implementation: bring to front
    this.canvas.bringObjectToFront(activeObj);
    this.canvas.requestRenderAll();
  }

  /**
   * Send selected object backward
   */
  async sendBackward(): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || !this.canvas) return;

    // Simple implementation: send to back
    this.canvas.sendObjectToBack(activeObj);
    this.canvas.requestRenderAll();
  }

  /**
   * Rotate selected object
   */
  async rotateSelected(deltaAngle: number): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj) return;

    const currentAngle = activeObj.angle || 0;
    activeObj.rotate(currentAngle + deltaAngle);
    this.canvas?.requestRenderAll();
  }

  /**
   * Add text at canvas center or clicked position
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
    await this.renderer.addObject(textObject);
  }

  /**
   * Update text properties of selected text object
   */
  async updateTextProperties(properties: Partial<TextObject>): Promise<void> {
    const selectedId = this.documentStore.getSelectedObjectId();
    if (!selectedId) return;

    const obj = this.documentStore.getObject(selectedId);
    if (!obj || obj.type !== 'text') return;

    // Create update command
    const textObj = obj as TextObject;
    const updatedText: TextObject = { ...textObj, ...properties };
    
    await this.history.run(new UpdateTextCommand(selectedId, updatedText));
    await this.renderer.updateObject(updatedText);
  }

  /**
   * Flip selected object horizontally
   */
  async flipX(): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || !this.canvas) return;

    const objectId = this.renderer.getFabricObjectId(activeObj);
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
    
    this.canvas.requestRenderAll();
    
    // Re-select the object after the canvas re-renders
    setTimeout(() => {
      this.selectObjectById(objectId);
    }, 0);
  }

  /**
   * Flip selected object vertically
   */
  async flipY(): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || !this.canvas) return;

    const objectId = this.renderer.getFabricObjectId(activeObj);
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
    
    this.canvas.requestRenderAll();
    
    // Re-select the object after the canvas re-renders
    setTimeout(() => {
      this.selectObjectById(objectId);
    }, 0);
  }

  /**
   * Set blend mode for selected image
   */
  async setBlendMode(mode: string): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj) return;

    const objectId = this.renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const imageObj = obj as ImageObject;
    const updated = { ...imageObj, globalCompositeOperation: mode };
    
    await this.renderer.updateObject(updated);
    this.canvas?.requestRenderAll();
  }

  /**
   * Apply rectangular crop to selected image
   */
  async cropImage(cropRect: { x: number; y: number; width: number; height: number }): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = this.renderer.getFabricObjectId(activeObj);
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
    
    await this.renderer.updateObject(updated);
    this.canvas?.requestRenderAll();
  }

  /**
   * Resize selected image to specific dimensions
   */
  async resizeImage(targetWidth: number, targetHeight: number): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = this.renderer.getFabricObjectId(activeObj);
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

    this.canvas?.requestRenderAll();
  }

  /**
   * Apply circular mask to selected image
   */
  async applyCircleMask(): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = this.renderer.getFabricObjectId(activeObj);
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
    
    await this.renderer.updateObject(updated);
    this.canvas?.requestRenderAll();
  }

  /**
   * Remove clip path from selected image
   */
  async removeClipPath(): Promise<void> {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj) return;

    const objectId = this.renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    const imageObj = obj as ImageObject;
    const updated = { ...imageObj, clipPath: undefined };
    
    await this.renderer.updateObject(updated);
    this.canvas?.requestRenderAll();
  }

  /**
   * Apply rounded corners to selected image using clipPath
   * Uses fabric.Rect with rx/ry properties for non-destructive rounded corners
   * 
   * @param radiusPercent - Corner radius as percentage (0-50)
   *                        0 = square corners (removes clipPath)
   *                        50 = maximum rounding (pill/circle shape)
   */
  async applyRoundedCorners(radiusPercent: number): Promise<void> {
    if (!this.canvas) return;

    const activeObj = this.canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = this.renderer.getFabricObjectId(activeObj);
    if (!objectId) return;

    const obj = this.documentStore.getObject(objectId);
    if (!obj || obj.type !== 'image') return;

    // Get image dimensions (use actual width/height, not scaled)
    const width = activeObj.width || 100;
    const height = activeObj.height || 100;

    // If radius is 0, remove clipPath
    if (radiusPercent === 0) {
      const imageObj = obj as ImageObject;
      const updated = { ...imageObj, clipPath: undefined };
      await this.renderer.updateObject(updated);
      this.canvas.requestRenderAll();
      return;
    }

    // Convert percentage to pixels
    // Use smaller dimension to prevent over-rounding
    const minDimension = Math.min(width, height);
    const radiusPixels = (radiusPercent / 100) * (minDimension / 2);

    // Create rounded rectangle clipPath
    // IMPORTANT: originX/originY 'center' makes the clipPath centered on the image
    // This ensures all corners are rounded equally regardless of image position
    const clipPath = new fabric.Rect({
      width: width,
      height: height,
      rx: radiusPixels,
      ry: radiusPixels,
      originX: 'center',
      originY: 'center',
    });

    // Update document store with new clipPath (same pattern as crop)
    const imageObj = obj as ImageObject;
    const updated = { ...imageObj, clipPath };
    
    await this.renderer.updateObject(updated);
    this.canvas.requestRenderAll();
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    if (!this.canvas) return;
    
    // Clamp zoom between 0.1 and 5
    zoom = Math.max(0.1, Math.min(5, zoom));
    
    this.canvas.setZoom(zoom);
    this.canvas.requestRenderAll();
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.canvas?.getZoom() || 1;
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    const currentZoom = this.getZoom();
    this.setZoom(currentZoom * 1.1);
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    const currentZoom = this.getZoom();
    this.setZoom(currentZoom / 1.1);
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    this.setZoom(1);
  }

  /**
   * Enable mouse wheel zoom
   */
  enableMouseWheelZoom(): void {
    if (!this.canvas) return;

    this.canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = this.canvas!.getZoom();
      zoom *= 0.999 ** delta;
      
      // Clamp zoom
      zoom = Math.max(0.1, Math.min(5, zoom));
      
      this.canvas!.setZoom(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  /**
   * Enable panning with Alt+drag
   */
  enablePanning(): void {
    if (!this.canvas) return;

    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    this.canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      if (evt.altKey === true) {
        isPanning = true;
        this.canvas!.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    this.canvas.on('mouse:move', (opt: any) => {
      if (isPanning) {
        const evt = opt.e;
        const vpt = this.canvas!.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          this.canvas!.requestRenderAll();
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
        }
      }
    });

    this.canvas.on('mouse:up', () => {
      isPanning = false;
      this.canvas!.selection = true;
    });
  }

  /**
   * Reset pan to center
   */
  resetPan(): void {
    if (!this.canvas) return;
    
    this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    this.canvas.requestRenderAll();
  }

  /**
   * Get all objects for layers panel
   */
  getObjects(): EditorObject[] {
    return this.documentStore.getSnapshot().objects;
  }

  /**
   * Toggle object visibility
   */
  async toggleObjectVisibility(objectId: string): Promise<void> {
    const obj = this.documentStore.getObject(objectId);
    if (!obj) return;

    const updated = { ...obj, visible: !obj.visible };
    await this.renderer.updateObject(updated);
    this.canvas?.requestRenderAll();
  }

  /**
   * Select object by ID
   */
  selectObjectById(objectId: string): void {
    const fabricObj = this.renderer.getFabricObject(objectId);
    if (fabricObj && this.canvas) {
      this.canvas.setActiveObject(fabricObj);
      this.canvas.requestRenderAll();
    }
  }

  /**
   * Align selected objects
   */
  alignObjects(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    const activeObjects = this.canvas?.getActiveObjects();
    if (!activeObjects || activeObjects.length === 0) return;

    const dims = this.documentStore.getDimensions();

    activeObjects.forEach((obj) => {
      switch (alignment) {
        case 'left':
          obj.set({ left: obj.width! / 2 });
          break;
        case 'center':
          obj.set({ left: dims.width / 2 });
          break;
        case 'right':
          obj.set({ left: dims.width - obj.width! / 2 });
          break;
        case 'top':
          obj.set({ top: obj.height! / 2 });
          break;
        case 'middle':
          obj.set({ top: dims.height / 2 });
          break;
        case 'bottom':
          obj.set({ top: dims.height - obj.height! / 2 });
          break;
      }
      obj.setCoords();
    });

    this.canvas?.requestRenderAll();
  }

  /**
   * Group selected objects
   */
  groupObjects(): void {
    const activeSelection = this.canvas?.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeSelection') return;

    // Get the selected objects
    const selection = activeSelection as fabric.ActiveSelection;
    const objects = selection.getObjects();
    
    // Remove selection
    this.canvas?.discardActiveObject();
    
    // Create group
    const group = new fabric.Group(objects, {
      selectable: true,
    });
    
    // Remove individual objects from canvas
    objects.forEach(obj => this.canvas?.remove(obj));
    
    // Add group to canvas
    this.canvas?.add(group);
    this.canvas?.setActiveObject(group);
    this.canvas?.requestRenderAll();
  }

  /**
   * Ungroup selected group
   */
  ungroupObjects(): void {
    const activeObject = this.canvas?.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') return;

    const group = activeObject as fabric.Group;
    const items = group.getObjects();
    
    // Remove group
    this.canvas?.remove(group);
    
    // Add items back individually
    items.forEach(obj => {
      this.canvas?.add(obj);
    });
    
    this.canvas?.requestRenderAll();
  }

  /**
   * Lock/unlock selected object
   */
  toggleLock(lockType: 'movement' | 'scaling' | 'rotation' | 'all'): void {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj) return;

    switch (lockType) {
      case 'movement':
        activeObj.lockMovementX = !activeObj.lockMovementX;
        activeObj.lockMovementY = !activeObj.lockMovementY;
        break;
      case 'scaling':
        activeObj.lockScalingX = !activeObj.lockScalingX;
        activeObj.lockScalingY = !activeObj.lockScalingY;
        break;
      case 'rotation':
        activeObj.lockRotation = !activeObj.lockRotation;
        break;
      case 'all':
        const locked = activeObj.lockMovementX || false;
        activeObj.lockMovementX = !locked;
        activeObj.lockMovementY = !locked;
        activeObj.lockScalingX = !locked;
        activeObj.lockScalingY = !locked;
        activeObj.lockRotation = !locked;
        activeObj.selectable = locked;
        break;
    }

    this.canvas?.requestRenderAll();
  }

  /**
   * Add watermark (text or image)
   */
  async addWatermark(
    type: 'text' | 'image',
    content: string | Blob,
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'center',
    opacity: number = 0.3
  ): Promise<void> {
    const dims = this.documentStore.getDimensions();
    let x = dims.width / 2;
    let y = dims.height / 2;

    // Calculate position
    const margin = 50;
    switch (position) {
      case 'top-left':
        x = margin;
        y = margin;
        break;
      case 'top-right':
        x = dims.width - margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = dims.height - margin;
        break;
      case 'bottom-right':
        x = dims.width - margin;
        y = dims.height - margin;
        break;
    }

    if (type === 'text') {
      const watermarkText = EditorObjectFactory.createTextObject(
        content as string,
        x,
        y,
        48,
        'Arial',
        '#ffffff'
      );
      watermarkText.opacity = opacity;

      await this.history.run(new AddObjectCommand(watermarkText));
      await this.renderer.addObject(watermarkText);
    } else {
      // Image watermark
      const blob = content as Blob;
      const { assetId } = await this.assetStore.put(blob);
      const img = await this.loadImageFromBlob(blob);

      // Auto-scale watermark if it's too large (max 20% of canvas dimensions)
      const maxWatermarkSize = Math.min(dims.width, dims.height) * 0.2;
      let scaleX = 1;
      let scaleY = 1;
      
      if (img.width > maxWatermarkSize || img.height > maxWatermarkSize) {
        const scale = maxWatermarkSize / Math.max(img.width, img.height);
        scaleX = scale;
        scaleY = scale;
      }

      const watermarkImage = EditorObjectFactory.createImageObject(
        assetId,
        blob.type,
        img.width,
        img.height,
        x,
        y
      );
      watermarkImage.scaleX = scaleX;
      watermarkImage.scaleY = scaleY;
      watermarkImage.opacity = opacity;

      await this.history.run(new AddObjectCommand(watermarkImage));
      await this.renderer.addObject(watermarkImage);
    }
  }

  /**
   * Enable snapping with visual guides
   */
  enableSnapping(threshold: number = 10): void {
    if (!this.canvas) return;

    const dims = this.documentStore.getDimensions();
    const centerX = dims.width / 2;
    const centerY = dims.height / 2;

    this.canvas.on('object:moving', (e: any) => {
      const obj = e.target;
      if (!obj) return;

      const objCenterX = obj.left || 0;
      const objCenterY = obj.top || 0;

      // Snap to center
      if (Math.abs(objCenterX - centerX) < threshold) {
        obj.set({ left: centerX });
        this.showGuideLine('vertical', centerX);
      } else {
        this.hideGuideLine('vertical');
      }

      if (Math.abs(objCenterY - centerY) < threshold) {
        obj.set({ top: centerY });
        this.showGuideLine('horizontal', centerY);
      } else {
        this.hideGuideLine('horizontal');
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

    this.canvas.on('object:modified', () => {
      this.hideGuideLine('vertical');
      this.hideGuideLine('horizontal');
    });
  }

  private guideLines: { vertical?: fabric.Line; horizontal?: fabric.Line } = {};

  private showGuideLine(orientation: 'vertical' | 'horizontal', position: number): void {
    if (!this.canvas) return;

    const dims = this.documentStore.getDimensions();

    // Remove existing guide
    if (this.guideLines[orientation]) {
      this.canvas.remove(this.guideLines[orientation]!);
    }

    // Create new guide
    const line = orientation === 'vertical'
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
    this.canvas.add(line);
    this.canvas.requestRenderAll();
  }

  private hideGuideLine(orientation: 'vertical' | 'horizontal'): void {
    if (!this.canvas || !this.guideLines[orientation]) return;

    this.canvas.remove(this.guideLines[orientation]!);
    delete this.guideLines[orientation];
    this.canvas.requestRenderAll();
  }

  /**
   * Setup keyboard event handlers for nudging
   */
  private setupKeyboardHandlers(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.canvas) return;

      const activeObj = this.canvas.getActiveObject();
      if (!activeObj) return;

      // Handle Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelected();
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
      this.canvas.requestRenderAll();
    });
  }

  /**
   * Get the Fabric canvas instance (public accessor)
   */
  getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }

  /**
   * Check if canvas is initialized
   */
  isCanvasReady(): boolean {
    const ready = this.canvas !== null && this.isInitialized;
    console.log('FabricCanvasService: isCanvasReady check:', ready, '(canvas:', !!this.canvas, ', isInitialized:', this.isInitialized, ')');
    return ready;
  }

  /**
   * Get canvas content as ImageData for compatibility with Photon filters
   */
  getCanvasAsImageData(): ImageData {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    const canvasElement = this.canvas.getElement();
    const ctx = canvasElement.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }

    return ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
  }

  /**
   * Apply ImageData back to the Fabric canvas (after Photon processing)
   */
  applyImageData(imageData: ImageData): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    const canvasElement = this.canvas.getElement();
    const ctx = canvasElement.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }

    // Put the image data on the canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Request render
    this.canvas.requestRenderAll();
  }

  /**
   * Clear the canvas (remove all objects)
   */
  clear(): void {
    if (!this.canvas) return;
    
    // Clear all objects from canvas
    this.canvas.clear();
    this.canvas.backgroundColor = '#ffffff';
    this.canvas.requestRenderAll();
    
    // Clear document store
    this.documentStore.clear();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this.renderer.dispose();
    this.isInitialized = false;
  }

  /**
   * Setup Fabric event handlers
   */
  private setupEventHandlers(): void {
    if (!this.canvas) return;

    // Text tool - click to add text
    this.canvas.on('mouse:down', async (e: any) => {
      if (this.currentTool !== 'text') return;

      const pointer = e.pointer;
      if (!pointer) return;

      await this.addText('Double-click to edit', {
        x: pointer.x,
        y: pointer.y,
      });

      // Switch back to select tool
      this.setTool('select');
    });

    // Selection events
    this.canvas.on('selection:created', (e: any) => {
      const obj = e.selected?.[0];
      if (obj) {
        const objectId = this.renderer.getFabricObjectId(obj);
        if (objectId) {
          this.documentStore.selectObject(objectId);
        }
      }
    });

    this.canvas.on('selection:updated', (e: any) => {
      const obj = e.selected?.[0];
      if (obj) {
        const objectId = this.renderer.getFabricObjectId(obj);
        if (objectId) {
          this.documentStore.selectObject(objectId);
        }
      }
    });

    this.canvas.on('selection:cleared', () => {
      this.documentStore.selectObject(null);
    });

    // Text editing events
    this.canvas.on('text:changed', async (e: any) => {
      const textObj = e.target;
      if (!textObj || textObj.type !== 'i-text') return;

      const objectId = this.renderer.getFabricObjectId(textObj);
      if (!objectId) return;

      // Update text content in model
      const obj = this.documentStore.getObject(objectId);
      if (obj && obj.type === 'text') {
        const updatedText = { ...(obj as TextObject), text: textObj.text };
        await this.updateTextProperties(updatedText);
      }
    });

    // Drawing events
    this.canvas.on('path:created', async (e: any) => {
      const path = e.path;
      if (!path) return;

      // Create PathObject from Fabric path
      const pathObject = EditorObjectFactory.createPathObject(
        path.path,
        path.stroke || '#000000',
        path.strokeWidth || 1,
        path.left || 0,
        path.top || 0
      );

      // Remove the Fabric path (we'll add it via command)
      this.canvas?.remove(path);

      // Add via command for undo/redo
      await this.history.run(new AddObjectCommand(pathObject));

      // Render the new object
      await this.renderer.addObject(pathObject);
    });

    // Transform events - capture before state
    this.canvas.on('object:rotating', (e: any) => this.captureTransformSnapshot(e));
    this.canvas.on('object:scaling', (e: any) => this.captureTransformSnapshot(e));
    this.canvas.on('object:moving', (e: any) => this.captureTransformSnapshot(e));

    // Transform complete - commit to history
    this.canvas.on('object:modified', async (e: any) => {
      const obj = e.target;
      if (!obj) return;

      const objectId = this.renderer.getFabricObjectId(obj);
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
    });
  }

  /**
   * Capture transform snapshot before modification
   */
  private captureTransformSnapshot(e: any): void {
    const obj = e.target;
    if (!obj) return;

    const objectId = this.renderer.getFabricObjectId(obj);
    if (!objectId) return;

    // Only capture once per gesture
    if (this.transformSnapshots.has(objectId)) return;

    const snapshot = this.captureCurrentTransform(obj);
    this.transformSnapshots.set(objectId, snapshot);
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
   * Sync canvas to document (called when document changes from commands)
   */
  private async syncCanvasToDocument(): Promise<void> {
    const doc = this.documentStore.getSnapshot();
    await this.renderer.render(doc);
  }

  /**
   * Get canvas center point
   */
  private getCanvasCenter(): { x: number; y: number } {
    const dims = this.documentStore.getDimensions();
    return {
      x: dims.width / 2,
      y: dims.height / 2,
    };
  }

  /**
   * Load image from blob to get dimensions
   */
  private async loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Add a shape to the canvas (circle, rectangle, or triangle)
   */
  async addShape(shapeType: 'circle' | 'rect' | 'triangle', options?: any): Promise<void> {
    if (!this.canvas) return;

    const canvasCenter = this.getCanvasCenter();
    let shape: fabric.Object;

    switch (shapeType) {
      case 'circle':
        shape = new fabric.Circle({
          left: canvasCenter.x,
          top: canvasCenter.y,
          radius: options?.radius || 50,
          fill: options?.fill || '#3b82f6',
          stroke: options?.stroke || '#1e40af',
          strokeWidth: options?.strokeWidth || 2,
        });
        break;
      case 'rect':
        shape = new fabric.Rect({
          left: canvasCenter.x,
          top: canvasCenter.y,
          width: options?.width || 100,
          height: options?.height || 100,
          fill: options?.fill || '#3b82f6',
          stroke: options?.stroke || '#1e40af',
          strokeWidth: options?.strokeWidth || 2,
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: canvasCenter.x,
          top: canvasCenter.y,
          width: options?.width || 100,
          height: options?.height || 100,
          fill: options?.fill || '#3b82f6',
          stroke: options?.stroke || '#1e40af',
          strokeWidth: options?.strokeWidth || 2,
        });
        break;
      default:
        return;
    }

    this.canvas.add(shape);
    this.canvas.setActiveObject(shape);
    this.canvas.requestRenderAll();
  }

  /**
   * Add an emoji/icon as text to the canvas
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
    await this.renderer.addObject(textObject);
  }

  /**
   * Get current tool
   */
  getCurrentTool(): string {
    return this.currentTool;
  }

  /**
   * Apply a Photon filter to the selected image or entire canvas
   * @param filterName Name of the Photon filter
   * @param params Optional filter parameters
   */
  async applyPhotonFilter(filterName: string, params?: any): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Get the active object
    const activeObj = this.canvas.getActiveObject();
    
    if (activeObj && activeObj instanceof fabric.Image) {
      // Apply filter to selected image
      await this.applyFilterToFabricImage(activeObj, filterName, params);
    } else {
      // Apply filter to entire canvas as ImageData
      const imageData = this.getCanvasAsImageData();
      const filteredImageData = await this.applyPhotonFilterToImageData(imageData, filterName, params);
      this.applyImageData(filteredImageData);
    }
  }

  /**
   * Apply Photon filter to a Fabric Image object
   */
  private async applyFilterToFabricImage(
    fabricImage: fabric.Image,
    filterName: string,
    params?: any
  ): Promise<void> {
    // Get the image as a blob
    const dataURL = fabricImage.toDataURL({ format: 'png' });
    const blob = await this.dataURLToBlob(dataURL);

    // Apply filter using PhotonFiltersService
    const filteredBlob = await this.photonFilters.applyFilter(blob, filterName, params);

    // Load filtered image
    const filteredImg = await this.loadImageFromBlob(filteredBlob);

    // Update the fabric image source
    fabricImage.setElement(filteredImg);
    fabricImage.set({ dirty: true });
    this.canvas?.requestRenderAll();
  }

  /**
   * Apply Photon filter to ImageData
   */
  private async applyPhotonFilterToImageData(
    imageData: ImageData,
    filterName: string,
    params?: any
  ): Promise<ImageData> {
    // Convert ImageData to Blob
    const blob = await this.imageDataToBlob(imageData);

    // Apply filter
    const filteredBlob = await this.photonFilters.applyFilter(blob, filterName, params);

    // Convert back to ImageData
    return await this.blobToImageData(filteredBlob);
  }

  /**
   * Get available Photon filters
   */
  getAvailableFilters() {
    return this.photonFilters.getAvailableFilters();
  }

  /**
   * Generate filter preview for a thumbnail
   */
  async generateFilterPreview(
    blob: Blob,
    filterName: string,
    params?: any
  ): Promise<Blob> {
    return await this.photonFilters.previewFilter(blob, filterName, params);
  }

  /**
   * Convert ImageData to Blob
   */
  private async imageDataToBlob(imageData: ImageData): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  }

  /**
   * Convert Blob to ImageData
   */
  private async blobToImageData(blob: Blob): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Convert data URL to Blob
   */
  private async dataURLToBlob(dataURL: string): Promise<Blob> {
    const response = await fetch(dataURL);
    return await response.blob();
  }

  /**
   * Apply brightness adjustment to the selected image
   * Uses Fabric.js Brightness filter for real-time, non-destructive editing
   * 
   * @param brightness - Brightness value from -1 to 1 (0 = neutral, -1 = darkest, 1 = brightest)
   */
  applyBrightnessFilter(brightness: number): void {
    if (!this.canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = this.canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) {
      console.warn('No image selected');
      return;
    }

    const fabricImage = activeObj as fabric.Image;

    // Initialize filters array if needed
    if (!fabricImage.filters) {
      fabricImage.filters = [];
    }

    // Remove existing brightness filters
    fabricImage.filters = fabricImage.filters.filter(
      (f: any) => f.type !== 'Brightness'
    );

    // Add new brightness filter if not neutral
    if (brightness !== 0) {
      fabricImage.filters.push(new filters.Brightness({ brightness }));
    }

    // Apply filters and re-render
    fabricImage.applyFilters();
    this.canvas.requestRenderAll();
  }

  /**
   * Apply contrast adjustment to the selected image
   * Uses Fabric.js Contrast filter for real-time, non-destructive editing
   * 
   * @param contrast - Contrast value from -1 to 1 (0 = neutral, -1 = less contrast, 1 = more contrast)
   */
  applyContrastFilter(contrast: number): void {
    if (!this.canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = this.canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) {
      console.warn('No image selected');
      return;
    }

    const fabricImage = activeObj as fabric.Image;

    if (!fabricImage.filters) {
      fabricImage.filters = [];
    }

    fabricImage.filters = fabricImage.filters.filter(
      (f: any) => f.type !== 'Contrast'
    );

    if (contrast !== 0) {
      fabricImage.filters.push(new filters.Contrast({ contrast }));
    }

    fabricImage.applyFilters();
    this.canvas.requestRenderAll();
  }

  /**
   * Apply saturation adjustment to the selected image
   * Uses Fabric.js Saturation filter for real-time, non-destructive editing
   * 
   * @param saturation - Saturation value from -1 to 1 (0 = neutral, -1 = grayscale, 1 = highly saturated)
   */
  applySaturationFilter(saturation: number): void {
    if (!this.canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = this.canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) {
      console.warn('No image selected');
      return;
    }

    const fabricImage = activeObj as fabric.Image;

    if (!fabricImage.filters) {
      fabricImage.filters = [];
    }

    fabricImage.filters = fabricImage.filters.filter(
      (f: any) => f.type !== 'Saturation'
    );

    if (saturation !== 0) {
      fabricImage.filters.push(new filters.Saturation({ saturation }));
    }

    fabricImage.applyFilters();
    this.canvas.requestRenderAll();
  }

  /**
   * Apply hue rotation adjustment to the selected image
   * Uses Fabric.js HueRotation filter for real-time, non-destructive editing
   * 
   * @param rotation - Hue rotation value from -1 to 1 (0 = neutral, corresponds to -180° to 180°)
   */
  applyHueRotationFilter(rotation: number): void {
    if (!this.canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = this.canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) {
      console.warn('No image selected');
      return;
    }

    const fabricImage = activeObj as fabric.Image;

    if (!fabricImage.filters) {
      fabricImage.filters = [];
    }

    fabricImage.filters = fabricImage.filters.filter(
      (f: any) => f.type !== 'HueRotation'
    );

    if (rotation !== 0) {
      // HueRotation expects rotation in radians
      // Convert -1 to 1 range to -π to π radians
      const rotationRadians = rotation * Math.PI;
      fabricImage.filters.push(new filters.HueRotation({ rotation: rotationRadians }));
    }

    fabricImage.applyFilters();
    this.canvas.requestRenderAll();
  }

  /**
   * Reset all image filters to neutral state
   */
  resetAllFilters(): void {
    if (!this.canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = this.canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) {
      console.warn('No image selected');
      return;
    }

    const fabricImage = activeObj as fabric.Image;
    fabricImage.filters = [];
    fabricImage.applyFilters();
    this.canvas.requestRenderAll();
  }
}
