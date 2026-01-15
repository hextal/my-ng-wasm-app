import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { filters } from 'fabric';
import { PhotonFiltersService } from './photon-filters.service';
import { ImageDataUtilityService } from '../../core/services/image-data-utility.service';
import { CanvasUtilityService } from '../../core/services/canvas-utility.service';

/**
 * FilterManagementService - Handles filter operations and adjustments
 * 
 * Responsibilities:
 * - Photon filter application (to selected image or entire canvas)
 * - Real-time Fabric.js filter adjustments (brightness, contrast, saturation, hue)
 * - Filter preview generation
 * - Filter reset functionality
 */
@Injectable({
  providedIn: 'root',
})
export class FilterManagementService {
  constructor(
    private photonFilters: PhotonFiltersService,
    private imageDataUtil: ImageDataUtilityService,
    private canvasUtil: CanvasUtilityService
  ) {}

  /**
   * Apply a Photon filter to the selected image or entire canvas
   * 
   * @param canvas - The Fabric canvas instance
   * @param filterName - Name of the Photon filter
   * @param params - Optional filter parameters
   */
  async applyPhotonFilter(canvas: fabric.Canvas, filterName: string, params?: any): Promise<void> {
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }

    // Get the active object
    const activeObj = canvas.getActiveObject();
    
    if (activeObj && activeObj instanceof fabric.Image) {
      // Apply filter to selected image
      await this.applyFilterToFabricImage(canvas, activeObj, filterName, params);
    } else {
      // Apply filter to entire canvas as ImageData
      const imageData = this.getCanvasAsImageData(canvas);
      const filteredImageData = await this.applyPhotonFilterToImageData(imageData, filterName, params);
      this.applyImageDataToCanvas(canvas, filteredImageData);
    }
  }

  /**
   * Apply Photon filter to a Fabric Image object
   * 
   * @param canvas - The Fabric canvas instance
   * @param fabricImage - The Fabric image to filter
   * @param filterName - Name of the Photon filter
   * @param params - Optional filter parameters
   */
  async applyFilterToFabricImage(
    canvas: fabric.Canvas,
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
    canvas.requestRenderAll();
  }

  /**
   * Apply Photon filter to ImageData
   * 
   * @param imageData - The ImageData to filter
   * @param filterName - Name of the Photon filter
   * @param params - Optional filter parameters
   * @returns Filtered ImageData
   */
  async applyPhotonFilterToImageData(
    imageData: ImageData,
    filterName: string,
    params?: any
  ): Promise<ImageData> {
    // Convert ImageData to Blob
    const blob = await this.imageDataUtil.imageDataToBlob(imageData);

    // Apply filter
    const filteredBlob = await this.photonFilters.applyFilter(blob, filterName, params);

    // Convert back to ImageData
    return await this.imageDataUtil.loadImageDataFromBlob(filteredBlob);
  }

  /**
   * Get available Photon filters
   * 
   * @returns List of available filters with metadata
   */
  getAvailableFilters(): Array<{
    name: string;
    displayName: string;
    hasParams: boolean;
    params?: Array<{ name: string; type: string; default?: any }>;
  }> {
    return this.photonFilters.getAvailableFilters();
  }

  /**
   * Generate filter preview for a thumbnail
   * 
   * @param blob - The image blob
   * @param filterName - Name of the Photon filter
   * @param params - Optional filter parameters
   * @returns Filtered image blob
   */
  async generateFilterPreview(
    blob: Blob,
    filterName: string,
    params?: any
  ): Promise<Blob> {
    return await this.photonFilters.previewFilter(blob, filterName, params);
  }

  /**
   * Apply brightness adjustment to the selected image
   * Uses Fabric.js Brightness filter for real-time, non-destructive editing
   * 
   * @param canvas - The Fabric canvas instance
   * @param brightness - Brightness value from -1 to 1 (0 = neutral, -1 = darkest, 1 = brightest)
   */
  applyBrightnessFilter(canvas: fabric.Canvas, brightness: number): void {
    if (!canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = canvas.getActiveObject();
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
    canvas.requestRenderAll();
  }

  /**
   * Apply contrast adjustment to the selected image
   * Uses Fabric.js Contrast filter for real-time, non-destructive editing
   * 
   * @param canvas - The Fabric canvas instance
   * @param contrast - Contrast value from -1 to 1 (0 = neutral, -1 = less contrast, 1 = more contrast)
   */
  applyContrastFilter(canvas: fabric.Canvas, contrast: number): void {
    if (!canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = canvas.getActiveObject();
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
    canvas.requestRenderAll();
  }

  /**
   * Apply saturation adjustment to the selected image
   * Uses Fabric.js Saturation filter for real-time, non-destructive editing
   * 
   * @param canvas - The Fabric canvas instance
   * @param saturation - Saturation value from -1 to 1 (0 = neutral, -1 = grayscale, 1 = highly saturated)
   */
  applySaturationFilter(canvas: fabric.Canvas, saturation: number): void {
    if (!canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = canvas.getActiveObject();
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
    canvas.requestRenderAll();
  }

  /**
   * Apply hue rotation adjustment to the selected image
   * Uses Fabric.js HueRotation filter for real-time, non-destructive editing
   * 
   * @param canvas - The Fabric canvas instance
   * @param rotation - Hue rotation value from -1 to 1 (0 = neutral, corresponds to -180° to 180°)
   */
  applyHueRotationFilter(canvas: fabric.Canvas, rotation: number): void {
    if (!canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = canvas.getActiveObject();
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
    canvas.requestRenderAll();
  }

  /**
   * Reset all image filters to neutral state
   * 
   * @param canvas - The Fabric canvas instance
   */
  resetAllFilters(canvas: fabric.Canvas): void {
    if (!canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof fabric.Image)) {
      console.warn('No image selected');
      return;
    }

    const fabricImage = activeObj as fabric.Image;
    fabricImage.filters = [];
    fabricImage.applyFilters();
    canvas.requestRenderAll();
  }

  /**
   * Get canvas content as ImageData
   * 
   * @param canvas - The Fabric canvas instance
   * @returns ImageData from canvas
   */
  private getCanvasAsImageData(canvas: fabric.Canvas): ImageData {
    const canvasElement = canvas.getElement();
    const ctx = this.canvasUtil.getContext2D(canvasElement);
    
    return this.canvasUtil.getImageData(ctx, 0, 0, canvasElement.width, canvasElement.height);
  }

  /**
   * Apply ImageData back to the Fabric canvas
   * 
   * @param canvas - The Fabric canvas instance
   * @param imageData - The ImageData to apply
   */
  private applyImageDataToCanvas(canvas: fabric.Canvas, imageData: ImageData): void {
    const canvasElement = canvas.getElement();
    const ctx = this.canvasUtil.getContext2D(canvasElement);
    
    // Put the image data on the canvas
    this.canvasUtil.putImageData(ctx, imageData, 0, 0);
    
    // Request render
    canvas.requestRenderAll();
  }

  /**
   * Convert data URL to Blob
   * 
   * @param dataURL - The data URL to convert
   * @returns Blob representation
   */
  private async dataURLToBlob(dataURL: string): Promise<Blob> {
    const response = await fetch(dataURL);
    return await response.blob();
  }

  /**
   * Load image from blob
   * 
   * @param blob - The image blob
   * @returns HTMLImageElement
   */
  private async loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }
}
