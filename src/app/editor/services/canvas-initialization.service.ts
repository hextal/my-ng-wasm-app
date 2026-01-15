import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import { DocumentStoreService } from './document-store.service';
import { AssetStoreService } from './asset-store.service';
import { ViewportService } from './viewport.service';
import { SnappingService } from './snapping.service';

/**
 * CanvasInitializationService
 * 
 * SOLID Principle: Single Responsibility
 * This service handles ONLY canvas initialization and lifecycle management.
 * 
 * Purpose:
 * - Initialize Fabric canvas with proper configuration
 * - Setup renderer
 * - Enable viewport features (zoom, pan)
 * - Enable snapping
 * - Manage canvas lifecycle (dispose)
 * 
 * This service should NOT:
 * - Handle user interactions
 * - Manage tool state
 * - Apply transformations
 * - Handle events
 */
@Injectable({
  providedIn: 'root',
})
export class CanvasInitializationService {
  private canvas: fabric.Canvas | null = null;
  private renderer: FabricRenderer;
  private isInitialized = false;

  constructor(
    private documentStore: DocumentStoreService,
    private assetStore: AssetStoreService,
    private viewportService: ViewportService,
    private snappingService: SnappingService
  ) {
    this.renderer = new FabricRenderer(assetStore);
  }

  /**
   * Initialize Fabric canvas (simple initialization for integration tests)
   */
  initializeCanvas(canvasElementId: string, width: number = 800, height: number = 600): fabric.Canvas {
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

    this.isInitialized = true;
    return this.canvas;
  }

  /**
   * Initialize Fabric canvas with full configuration
   */
  async init(
    htmlCanvasElement: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<fabric.Canvas> {
    console.log('CanvasInitializationService: Starting initialization');
    
    // Create Fabric canvas
    this.canvas = new fabric.Canvas(htmlCanvasElement, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
    });

    console.log('CanvasInitializationService: Fabric canvas created');

    // Initialize renderer
    this.renderer.init(this.canvas);
    console.log('CanvasInitializationService: Renderer initialized');

    // Enable viewport features
    this.snappingService.enableSnapping(this.canvas);
    this.viewportService.enableMouseWheelZoom(this.canvas);
    this.viewportService.enablePanning(this.canvas);

    // Render current document
    const doc = this.documentStore.getSnapshot();
    await this.renderer.render(doc);

    // Subscribe to document changes
    this.documentStore.document$.subscribe(async (doc) => {
      await this.syncCanvasToDocument();
    });

    // Mark as initialized
    this.isInitialized = true;
    console.log('CanvasInitializationService: Initialization complete');
    
    return this.canvas;
  }

  /**
   * Get the Fabric canvas instance
   */
  getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }

  /**
   * Get the renderer instance
   */
  getRenderer(): FabricRenderer {
    return this.renderer;
  }

  /**
   * Check if canvas is initialized
   */
  isCanvasReady(): boolean {
    const ready = this.canvas !== null && this.isInitialized;
    console.log('CanvasInitializationService: isCanvasReady check:', ready, '(canvas:', !!this.canvas, ', isInitialized:', this.isInitialized, ')');
    return ready;
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
   * Sync canvas to document (called when document changes from commands)
   */
  private async syncCanvasToDocument(): Promise<void> {
    const doc = this.documentStore.getSnapshot();
    await this.renderer.render(doc);
  }
}
