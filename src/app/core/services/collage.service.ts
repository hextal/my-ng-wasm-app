import { Injectable } from '@angular/core';
import Konva from 'konva';
import { CanvasService } from './canvas.service';

/**
 * Interface for a collage image slot/position
 */
export interface CollageSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  borderWidth?: number;
  borderColor?: string;
}

/**
 * Interface for a layout template
 */
export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  slots: CollageSlot[];
  backgroundColor?: string;
}

/**
 * Interface for an image in the collage
 */
export interface CollageImage {
  id: string;
  file: File;
  image: HTMLImageElement;
  konvaImage: Konva.Image;
  transformer: Konva.Transformer;
}

/**
 * CollageService handles all collage-related operations using Konva.js.
 * Follows Single Responsibility Principle - ONLY handles collage operations.
 */
@Injectable({
  providedIn: 'root'
})
export class CollageService {
  private stage: Konva.Stage | null = null;
  private layer: Konva.Layer | null = null;
  private backgroundRect: Konva.Rect | null = null;
  private images: Map<string, CollageImage> = new Map();
  private currentTemplate: LayoutTemplate | null = null;
  private slotGuides: Konva.Shape[] = []; // Track slot guide shapes to hide on export
  private selectedImageId: string | null = null; // Track currently selected image
  private onSelectionChange?: (imageId: string | null) => void; // Callback for selection changes

  constructor(private canvasService: CanvasService) {}

  /**
   * Set callback for selection changes
   */
  setSelectionChangeCallback(callback: (imageId: string | null) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * Initialize the collage stage
   */
  initializeCollage(
    container: HTMLDivElement,
    template: LayoutTemplate
  ): void {
    // Clean up existing stage if any
    this.destroy();

    this.currentTemplate = template;

    // Create stage
    this.stage = new Konva.Stage({
      container: container,
      width: template.width,
      height: template.height
    });

    // Create main layer
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // Add background
    this.backgroundRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: template.width,
      height: template.height,
      fill: template.backgroundColor || '#ffffff'
    });
    this.layer.add(this.backgroundRect);

    // Click on background to deselect
    this.stage.on('click tap', (e) => {
      // If clicked on stage background (not on an image), deselect all
      if (e.target === this.stage || e.target === this.backgroundRect) {
        this.deselectAll();
      }
    });

    // Add slot guides
    this.addSlotGuides(template.slots);

    this.layer.draw();
  }

  /**
   * Add visual guides for image slots
   */
  private addSlotGuides(slots: CollageSlot[]): void {
    if (!this.layer) return;

    slots.forEach((slot, index) => {
      // Create a placeholder rectangle for each slot
      const slotRect = new Konva.Rect({
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        stroke: slot.borderColor || '#d1d5db',
        strokeWidth: slot.borderWidth || 2,
        dash: [10, 5],
        listening: false // Not interactive
      });

      // Add slot number label
      const label = new Konva.Text({
        x: slot.x + slot.width / 2,
        y: slot.y + slot.height / 2,
        text: `Slot ${index + 1}`,
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#9ca3af',
        align: 'center',
        verticalAlign: 'middle',
        offsetX: 50, // Half of approximate text width
        offsetY: 12, // Half of fontSize
        listening: false
      });

      // Track guides for later hiding
      this.slotGuides.push(slotRect, label);

      this.layer?.add(slotRect);
      this.layer?.add(label);
    });
  }

  /**
   * Add an image to the collage at a specific slot
   */
  async addImage(
    file: File,
    slotIndex: number
  ): Promise<string> {
    if (!this.layer || !this.currentTemplate) {
      throw new Error('Collage not initialized');
    }

    if (slotIndex < 0 || slotIndex >= this.currentTemplate.slots.length) {
      throw new Error('Invalid slot index');
    }

    const slot = this.currentTemplate.slots[slotIndex];
    const img = await this.canvasService.loadOverlayImage(file);
    const imageId = `image_${Date.now()}_${Math.random()}`;

    // Calculate scaling to COVER the slot (fill completely, may crop)
    // Use Math.max to ensure the image fills the entire slot
    const scale = Math.max(
      slot.width / img.width,
      slot.height / img.height
    );

    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Center the image in the slot
    const x = slot.x + (slot.width - scaledWidth) / 2;
    const y = slot.y + (slot.height - scaledHeight) / 2;

    // Create Konva image
    const konvaImage = new Konva.Image({
      id: imageId,
      image: img,
      x: x,
      y: y,
      width: scaledWidth,
      height: scaledHeight,
      draggable: true
    });

    // Create transformer for resize/rotate
    const transformer = new Konva.Transformer({
      nodes: [konvaImage],
      keepRatio: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotateEnabled: true,
      borderStroke: '#7c00c7',
      borderStrokeWidth: 2,
      anchorFill: '#7c00c7',
      anchorStroke: '#ffffff',
      anchorSize: 10
    });

    // Add click event to select/deselect
    konvaImage.on('click tap', () => {
      this.selectImage(imageId);
    });

    // Add to layer
    this.layer.add(konvaImage);
    this.layer.add(transformer);
    transformer.hide(); // Initially hidden

    // Store reference
    this.images.set(imageId, {
      id: imageId,
      file: file,
      image: img,
      konvaImage: konvaImage,
      transformer: transformer
    });

    this.layer.draw();
    return imageId;
  }

  /**
   * Add an image at a specific position (freeform)
   */
  async addImageAtPosition(
    file: File,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): Promise<string> {
    if (!this.layer) {
      throw new Error('Collage not initialized');
    }

    const img = await this.canvasService.loadOverlayImage(file);
    const imageId = `image_${Date.now()}_${Math.random()}`;

    // Use provided dimensions or default to image size
    const finalWidth = width || img.width;
    const finalHeight = height || img.height;

    // Create Konva image
    const konvaImage = new Konva.Image({
      id: imageId,
      image: img,
      x: x,
      y: y,
      width: finalWidth,
      height: finalHeight,
      draggable: true
    });

    // Create transformer
    const transformer = new Konva.Transformer({
      nodes: [konvaImage],
      keepRatio: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotateEnabled: true,
      borderStroke: '#7c00c7',
      borderStrokeWidth: 2,
      anchorFill: '#7c00c7',
      anchorStroke: '#ffffff',
      anchorSize: 10
    });

    // Add click event
    konvaImage.on('click tap', () => {
      this.selectImage(imageId);
    });

    // Add to layer
    this.layer.add(konvaImage);
    this.layer.add(transformer);
    transformer.hide();

    // Store reference
    this.images.set(imageId, {
      id: imageId,
      file: file,
      image: img,
      konvaImage: konvaImage,
      transformer: transformer
    });

    this.layer.draw();
    return imageId;
  }

  /**
   * Select an image to show its transformer
   */
  selectImage(imageId: string): void {
    // Hide all transformers
    this.images.forEach((img) => {
      img.transformer.hide();
    });

    // Show selected transformer
    const selected = this.images.get(imageId);
    if (selected) {
      selected.transformer.show();
      this.selectedImageId = imageId;
      this.layer?.draw();
      
      // Notify selection change
      if (this.onSelectionChange) {
        this.onSelectionChange(imageId);
      }
    }
  }

  /**
   * Deselect all images
   */
  deselectAll(): void {
    this.images.forEach((img) => {
      img.transformer.hide();
    });
    this.selectedImageId = null;
    this.layer?.draw();
    
    // Notify selection change
    if (this.onSelectionChange) {
      this.onSelectionChange(null);
    }
  }

  /**
   * Get currently selected image ID
   */
  getSelectedImageId(): string | null {
    return this.selectedImageId;
  }

  /**
   * Remove currently selected image
   */
  removeSelectedImage(): boolean {
    if (!this.selectedImageId) return false;
    
    this.removeImage(this.selectedImageId);
    this.selectedImageId = null;
    
    // Notify selection change
    if (this.onSelectionChange) {
      this.onSelectionChange(null);
    }
    
    return true;
  }

  /**
   * Remove an image from the collage
   */
  removeImage(imageId: string): void {
    const collageImage = this.images.get(imageId);
    if (!collageImage) return;

    collageImage.konvaImage.destroy();
    collageImage.transformer.destroy();
    this.images.delete(imageId);
    this.layer?.draw();
  }

  /**
   * Clear all images from the collage
   */
  clearImages(): void {
    this.images.forEach((img) => {
      img.konvaImage.destroy();
      img.transformer.destroy();
    });
    this.images.clear();
    this.layer?.draw();
  }

  /**
   * Get all image IDs
   */
  getImageIds(): string[] {
    return Array.from(this.images.keys());
  }

  /**
   * Get image count
   */
  getImageCount(): number {
    return this.images.size;
  }

  /**
   * Export collage as Blob
   */
  async exportCollage(format: 'png' | 'jpeg' = 'png'): Promise<Blob> {
    if (!this.stage) {
      throw new Error('Collage not initialized');
    }

    // Hide all transformers before export
    this.images.forEach((img) => {
      img.transformer.hide();
    });

    // Hide all slot guides (borders and labels)
    this.slotGuides.forEach((guide) => {
      guide.hide();
    });

    this.layer?.draw();

    // Get data URL from stage
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataURL = this.stage.toDataURL({
      mimeType: mimeType,
      quality: 1.0,
      pixelRatio: 2 // Higher quality export
    });

    // Show slot guides again after export (for continued editing)
    this.slotGuides.forEach((guide) => {
      guide.show();
    });
    this.layer?.draw();

    // Convert data URL to Blob
    const response = await fetch(dataURL);
    const blob = await response.blob();

    return blob;
  }

  /**
   * Get current template
   */
  getCurrentTemplate(): LayoutTemplate | null {
    return this.currentTemplate;
  }

  /**
   * Destroy the stage and clean up
   */
  destroy(): void {
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
    this.layer = null;
    this.backgroundRect = null;
    this.images.clear();
    this.currentTemplate = null;
    this.slotGuides = []; // Clear slot guides
  }
}
