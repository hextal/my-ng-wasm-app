import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { AssetStoreService } from './asset-store.service';
import { PhotonFiltersService } from './photon-filters.service';
import { ImageDataUtilityService } from '../../core/services/image-data-utility.service';
import { CanvasUtilityService } from '../../core/services/canvas-utility.service';
import { ViewportService } from './viewport.service';
import { WatermarkService } from './watermark.service';
import { ShapeService } from './shape.service';
import { TextService } from './text.service';
import { FilterManagementService } from './filter-management.service';
import { CanvasInitializationService } from './canvas-initialization.service';
import { ToolManagerService } from './tool-manager.service';
import { ObjectTransformService } from './object-transform.service';
import { CanvasEventService } from './canvas-event.service';
import { KeyboardService } from './keyboard.service';
import {
  AddObjectCommand,
  RemoveObjectCommand,
} from '../core/commands/object.commands';
import {
  EditorObjectFactory,
  TextObject,
  ImageObject,
  EditorObject,
} from '../core/models/document.model';

/**
 * FabricCanvasService - Main Facade for Canvas Operations
 * 
 * SOLID Principle: Single Responsibility (Coordinator/Facade)
 * This service acts as a FACADE that coordinates between specialized services.
 * It delegates specific responsibilities to focused services.
 * 
 * Purpose:
 * - Provide a unified API for canvas operations
 * - Coordinate between specialized services
 * - Handle high-level image operations (add/delete)
 * - Manage layer operations
 * - Provide viewport controls
 * - Handle filter operations
 * 
 * Delegates to:
 * - CanvasInitializationService: Canvas setup and lifecycle
 * - ToolManagerService: Tool state management
 * - ObjectTransformService: Transform operations
 * - CanvasEventService: Event handling
 * - KeyboardService: Keyboard event handling
 * - Other specialized services: Drawing, Text, Shape, Watermark, Filters, etc.
 */
@Injectable({
  providedIn: 'root',
})
export class FabricCanvasService {
  constructor(
    private documentStore: DocumentStoreService,
    private history: HistoryService,
    private assetStore: AssetStoreService,
    private photonFilters: PhotonFiltersService,
    private imageDataUtil: ImageDataUtilityService,
    private canvasUtil: CanvasUtilityService,
    private viewportService: ViewportService,
    private watermarkService: WatermarkService,
    private shapeService: ShapeService,
    private textService: TextService,
    private filterManagementService: FilterManagementService,
    private canvasInitService: CanvasInitializationService,
    private toolManager: ToolManagerService,
    private objectTransform: ObjectTransformService,
    private canvasEvents: CanvasEventService,
    private keyboardService: KeyboardService
  ) {}

  // ===== INITIALIZATION =====

  /**
   * Initialize Fabric canvas by element ID (simple initialization for integration)
   */
  initializeCanvas(canvasElementId: string, width: number = 800, height: number = 600): void {
    const canvas = this.canvasInitService.initializeCanvas(canvasElementId, width, height);
    this.setupServices(canvas);
  }

  /**
   * Initialize Fabric canvas with full configuration
   */
  async init(
    htmlCanvasElement: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<void> {
    const canvas = await this.canvasInitService.init(htmlCanvasElement, width, height);
    this.setupServices(canvas);
  }

  /**
   * Setup services after canvas initialization
   */
  private setupServices(canvas: fabric.Canvas): void {
    const renderer = this.canvasInitService.getRenderer();
    
    // Setup event handlers
    this.canvasEvents.setupEventHandlers(
      canvas,
      renderer,
      () => this.toolManager.getCurrentToolValue(),
      (x, y) => this.addText('Double-click to edit', { x, y })
    );

    // Setup keyboard handlers
    this.keyboardService.setupKeyboardHandlers(
      canvas,
      renderer,
      () => this.deleteSelected()
    );
  }

  // ===== TOOL MANAGEMENT =====

  /**
   * Set the current tool
   */
  setTool(tool: 'select' | 'draw' | 'text' | 'tuning' | 'crop' | 'shape' | 'icon' | 'filters' | 'corner' | 'watermark'): void {
    const canvas = this.canvasInitService.getCanvas();
    this.toolManager.setTool(canvas, tool);
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
    const canvas = this.canvasInitService.getCanvas();
    this.toolManager.setBrush(canvas, options);
  }

  /**
   * Get current brush type
   */
  getBrushType(): string {
    const canvas = this.canvasInitService.getCanvas();
    return this.toolManager.getBrushType(canvas);
  }

  /**
   * Get current tool
   */
  getCurrentTool(): string {
    return this.toolManager.getCurrentToolValue();
  }

  // ===== IMAGE OPERATIONS =====

  /**
   * Add an image from a Blob
   */
  async addImageFromBlob(blob: Blob): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    
    if (!canvas || !renderer) {
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
    await renderer.addObject(imageObject);
  }

  /**
   * Delete the selected object
   */
  async deleteSelected(): Promise<void> {
    const selectedId = this.documentStore.getSelectedObjectId();
    if (!selectedId) return;

    const renderer = this.canvasInitService.getRenderer();
    await this.history.run(new RemoveObjectCommand(selectedId));
    renderer.removeObject(selectedId);
    this.documentStore.selectObject(null);
  }

  // ===== TRANSFORM OPERATIONS (Delegated to ObjectTransformService) =====

  /**
   * Bring selected object forward
   */
  async bringForward(): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.bringForward(canvas, renderer);
  }

  /**
   * Send selected object backward
   */
  async sendBackward(): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.sendBackward(canvas, renderer);
  }

  /**
   * Rotate selected object
   */
  async rotateSelected(deltaAngle: number): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    
    await this.objectTransform.rotateSelected(canvas, deltaAngle);
  }

  /**
   * Flip selected object horizontally
   */
  async flipX(): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.flipX(canvas, renderer);
  }

  /**
   * Flip selected object vertically
   */
  async flipY(): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.flipY(canvas, renderer);
  }

  /**
   * Set blend mode for selected image
   */
  async setBlendMode(mode: string): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.setBlendMode(canvas, renderer, mode);
  }

  /**
   * Set opacity of selected object
   */
  async setOpacity(opacity: number): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.setOpacity(canvas, renderer, opacity);
  }

  /**
   * Apply circular mask to selected image
   */
  async applyCircleMask(): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.applyCircleMask(canvas, renderer);
  }

  /**
   * Remove clip path from selected image
   */
  async removeClipPath(): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.removeClipPath(canvas, renderer);
  }

  /**
   * Apply shape mask to selected image
   */
  async applyShapeMask(shapeType: 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'heart' | 'diamond'): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.applyShapeMask(canvas, renderer, shapeType);
  }

  /**
   * Apply rounded corners to selected image
   */
  async applyRoundedCorners(radiusPercent: number): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.applyRoundedCorners(canvas, renderer, radiusPercent);
  }

  /**
   * Resize selected image to specific dimensions
   */
  async resizeImage(targetWidth: number, targetHeight: number): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    await this.objectTransform.resizeImage(canvas, renderer, targetWidth, targetHeight);
  }

  // ===== CROP OPERATIONS =====

  /**
   * Apply rectangular crop to selected image
   */
  async cropImage(cropRect: { x: number; y: number; width: number; height: number }): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) return;

    const objectId = renderer.getFabricObjectId(activeObj);
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
    
    await renderer.updateObject(updated);
    canvas.requestRenderAll();
  }

  // ===== TEXT OPERATIONS =====

  /**
   * Add text at canvas center or clicked position
   */
  async addText(text: string = 'Double-click to edit', options?: Partial<TextObject>): Promise<void> {
    const renderer = this.canvasInitService.getRenderer();
    
    await this.textService.addText(text, options);
    
    // Render the new text object
    const doc = this.documentStore.getSnapshot();
    const lastObject = doc.objects[doc.objects.length - 1];
    if (lastObject) {
      await renderer.addObject(lastObject);
    }
  }

  /**
   * Update text properties of selected text object
   */
  async updateTextProperties(properties: Partial<TextObject>): Promise<void> {
    const renderer = this.canvasInitService.getRenderer();
    
    await this.textService.updateSelectedTextProperties(properties);
    
    // Re-render the updated object
    const selectedId = this.documentStore.getSelectedObjectId();
    if (selectedId) {
      const obj = this.documentStore.getObject(selectedId);
      if (obj) {
        await renderer.updateObject(obj);
      }
    }
  }

  /**
   * Add an emoji/icon as text to the canvas
   */
  async addEmoji(emoji: string, options?: { x?: number; y?: number; size?: number }): Promise<void> {
    const renderer = this.canvasInitService.getRenderer();
    
    await this.textService.addEmoji(emoji, options);
    
    // Render the new emoji object
    const doc = this.documentStore.getSnapshot();
    const lastObject = doc.objects[doc.objects.length - 1];
    if (lastObject) {
      await renderer.addObject(lastObject);
    }
  }

  // ===== SHAPE OPERATIONS =====

  /**
   * Add a shape to the canvas
   */
  async addShape(shapeType: 'circle' | 'rect' | 'triangle', options?: any): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;

    const canvasCenter = this.getCanvasCenter();
    this.shapeService.createBasicShape(
      canvas,
      shapeType,
      canvasCenter.x,
      canvasCenter.y,
      options
    );
  }

  // ===== WATERMARK OPERATIONS =====

  /**
   * Add watermark (text or image)
   */
  async addWatermark(
    type: 'text' | 'image',
    content: string | Blob,
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'center',
    opacity: number = 0.3
  ): Promise<void> {
    const renderer = this.canvasInitService.getRenderer();
    
    await this.watermarkService.addWatermark(type, content, position, opacity);
    
    // Render the new watermark object
    const doc = this.documentStore.getSnapshot();
    const lastObject = doc.objects[doc.objects.length - 1];
    if (lastObject) {
      await renderer.addObject(lastObject);
    }
  }

  // ===== FILTER OPERATIONS =====

  /**
   * Apply a Photon filter to the selected image or entire canvas
   */
  async applyPhotonFilter(filterName: string, params?: any): Promise<void> {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }
    await this.filterManagementService.applyPhotonFilter(canvas, filterName, params);
  }

  /**
   * Get available Photon filters
   */
  getAvailableFilters() {
    return this.filterManagementService.getAvailableFilters();
  }

  /**
   * Generate filter preview for a thumbnail
   */
  async generateFilterPreview(
    blob: Blob,
    filterName: string,
    params?: any
  ): Promise<Blob> {
    return await this.filterManagementService.generateFilterPreview(blob, filterName, params);
  }

  /**
   * Apply brightness adjustment to the selected image
   */
  applyBrightnessFilter(brightness: number): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.filterManagementService.applyBrightnessFilter(canvas, brightness);
  }

  /**
   * Apply contrast adjustment to the selected image
   */
  applyContrastFilter(contrast: number): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.filterManagementService.applyContrastFilter(canvas, contrast);
  }

  /**
   * Apply saturation adjustment to the selected image
   */
  applySaturationFilter(saturation: number): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.filterManagementService.applySaturationFilter(canvas, saturation);
  }

  /**
   * Apply hue rotation adjustment to the selected image
   */
  applyHueRotationFilter(rotation: number): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.filterManagementService.applyHueRotationFilter(canvas, rotation);
  }

  /**
   * Reset all image filters to neutral state
   */
  resetAllFilters(): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.filterManagementService.resetAllFilters(canvas);
  }

  // ===== VIEWPORT OPERATIONS =====

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.viewportService.setZoom(canvas, zoom);
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return 1;
    return this.viewportService.getZoom(canvas);
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.viewportService.zoomIn(canvas);
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.viewportService.zoomOut(canvas);
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.viewportService.resetZoom(canvas);
  }

  /**
   * Reset pan to center
   */
  resetPan(): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    this.viewportService.resetPan(canvas);
  }

  // ===== LAYER OPERATIONS =====

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
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    
    const obj = this.documentStore.getObject(objectId);
    if (!obj) return;

    const updated = { ...obj, visible: !obj.visible };
    await renderer.updateObject(updated);
    canvas?.requestRenderAll();
  }

  /**
   * Select object by ID
   */
  selectObjectById(objectId: string): void {
    const canvas = this.canvasInitService.getCanvas();
    const renderer = this.canvasInitService.getRenderer();
    if (!canvas) return;
    
    const fabricObj = renderer.getFabricObject(objectId);
    if (fabricObj) {
      canvas.setActiveObject(fabricObj);
      canvas.requestRenderAll();
    }
  }

  /**
   * Align selected objects
   */
  alignObjects(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
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

    canvas.requestRenderAll();
  }

  /**
   * Group selected objects
   */
  groupObjects(): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    
    const activeSelection = canvas.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeSelection') return;

    // Get the selected objects
    const selection = activeSelection as fabric.ActiveSelection;
    const objects = selection.getObjects();
    
    // Remove selection
    canvas.discardActiveObject();
    
    // Create group
    const group = new fabric.Group(objects, {
      selectable: true,
    });
    
    // Remove individual objects from canvas
    objects.forEach(obj => canvas.remove(obj));
    
    // Add group to canvas
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
  }

  /**
   * Ungroup selected group
   */
  ungroupObjects(): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') return;

    const group = activeObject as fabric.Group;
    const items = group.getObjects();
    
    // Remove group
    canvas.remove(group);
    
    // Add items back individually
    items.forEach(obj => {
      canvas.add(obj);
    });
    
    canvas.requestRenderAll();
  }

  /**
   * Lock/unlock selected object
   */
  toggleLock(lockType: 'movement' | 'scaling' | 'rotation' | 'all'): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) return;
    
    const activeObj = canvas.getActiveObject();
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

    canvas.requestRenderAll();
  }

  // ===== UTILITY METHODS =====

  /**
   * Get the Fabric canvas instance (public accessor)
   */
  getCanvas(): fabric.Canvas | null {
    return this.canvasInitService.getCanvas();
  }

  /**
   * Check if canvas is initialized
   */
  isCanvasReady(): boolean {
    return this.canvasInitService.isCanvasReady();
  }

  /**
   * Get canvas content as ImageData for compatibility with Photon filters
   */
  getCanvasAsImageData(): ImageData {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }

    const canvasElement = canvas.getElement();
    const ctx = this.canvasUtil.getContext2D(canvasElement);
    
    return this.canvasUtil.getImageData(ctx, 0, 0, canvasElement.width, canvasElement.height);
  }

  /**
   * Apply ImageData back to the Fabric canvas (after Photon processing)
   */
  applyImageData(imageData: ImageData): void {
    const canvas = this.canvasInitService.getCanvas();
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }

    const canvasElement = canvas.getElement();
    const ctx = this.canvasUtil.getContext2D(canvasElement);
    
    // Put the image data on the canvas
    this.canvasUtil.putImageData(ctx, imageData, 0, 0);
    
    // Request render
    canvas.requestRenderAll();
  }

  /**
   * Clear the canvas (remove all objects)
   */
  clear(): void {
    this.canvasInitService.clear();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    const canvas = this.canvasInitService.getCanvas();
    if (canvas) {
      this.canvasEvents.removeEventHandlers(canvas);
      this.keyboardService.removeKeyboardHandlers();
    }
    this.canvasInitService.dispose();
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
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(blob);
    });
  }
}
