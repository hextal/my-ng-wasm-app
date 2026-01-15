import { Injectable } from '@angular/core';
import { CanvasUtilityService } from './canvas-utility.service';

/**
 * ImageDataUtilityService - Handles ImageData manipulation operations
 * Follows Single Responsibility Principle - ONLY handles ImageData utilities
 * 
 * This service provides utility methods for:
 * - Scaling ImageData
 * - Converting ImageData to/from data URLs
 * - Copying ImageData
 * - Loading ImageData from Blobs
 * 
 * Refactored to use CanvasUtilityService for DOM manipulation (SOLID: Dependency Inversion)
 */
@Injectable({
  providedIn: 'root'
})
export class ImageDataUtilityService {
  constructor(private canvasUtil: CanvasUtilityService) {}
  /**
   * Scale ImageData to fit within maximum dimensions while preserving aspect ratio
   * @param imageData Source ImageData to scale
   * @param maxWidth Maximum width in pixels
   * @param maxHeight Maximum height in pixels
   * @returns Scaled ImageData
   */
  scaleImageData(imageData: ImageData, maxWidth: number, maxHeight: number): ImageData {
    const { width, height } = imageData;
    let newWidth = width;
    let newHeight = height;

    // Calculate scaled dimensions
    if (width > maxWidth || height > maxHeight) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const scale = Math.min(widthRatio, heightRatio);
      newWidth = Math.round(width * scale);
      newHeight = Math.round(height * scale);
    }

    // No scaling needed
    if (newWidth === width && newHeight === height) {
      return imageData;
    }

    // Scale using canvas
    const canvas = this.canvasUtil.createCanvas(newWidth, newHeight);
    const ctx = this.canvasUtil.getContext2D(canvas);
    
    // Put original image data on a temporary canvas
    const tempCanvas = this.canvasUtil.createCanvas(width, height);
    const tempCtx = this.canvasUtil.getContext2D(tempCanvas);
    this.canvasUtil.putImageData(tempCtx, imageData, 0, 0);
    
    // Draw scaled version
    this.canvasUtil.drawImage(ctx, tempCanvas, 0, 0, newWidth, newHeight);
    return this.canvasUtil.getImageData(ctx, 0, 0, newWidth, newHeight);
  }

  /**
   * Convert ImageData to data URL (base64 encoded PNG)
   * @param imageData ImageData to convert
   * @returns Data URL string
   */
  imageDataToDataURL(imageData: ImageData): string {
    const canvas = this.canvasUtil.createCanvas(imageData.width, imageData.height);
    const ctx = this.canvasUtil.getContext2D(canvas);
    this.canvasUtil.putImageData(ctx, imageData, 0, 0);
    return this.canvasUtil.canvasToDataURL(canvas);
  }

  /**
   * Create a deep copy of ImageData
   * @param imageData ImageData to copy
   * @returns New ImageData with copied pixel data
   */
  copyImageData(imageData: ImageData): ImageData {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }

  /**
   * Load ImageData from a Blob
   * @param blob Image blob to load
   * @returns Promise resolving to ImageData
   */
  async loadImageDataFromBlob(blob: Blob): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = this.canvasUtil.createCanvas(img.naturalWidth, img.naturalHeight);
        const ctx = this.canvasUtil.getContext2D(canvas);
        this.canvasUtil.drawImage(ctx, img, 0, 0);
        const imageData = this.canvasUtil.getImageData(ctx, 0, 0, canvas.width, canvas.height);
        this.canvasUtil.revokeObjectURL(img.src);
        resolve(imageData);
      };
      img.onerror = () => {
        this.canvasUtil.revokeObjectURL(img.src);
        reject(new Error('Failed to load image from blob'));
      };
      img.src = this.canvasUtil.createObjectURL(blob);
    });
  }

  /**
   * Convert ImageData to Blob
   * @param imageData ImageData to convert
   * @param mimeType MIME type for the blob (default: 'image/png')
   * @returns Promise resolving to Blob
   */
  async imageDataToBlob(imageData: ImageData, mimeType: string = 'image/png'): Promise<Blob> {
    const canvas = this.canvasUtil.createCanvas(imageData.width, imageData.height);
    const ctx = this.canvasUtil.getContext2D(canvas);
    this.canvasUtil.putImageData(ctx, imageData, 0, 0);
    return this.canvasUtil.canvasToBlob(canvas, mimeType);
  }

  /**
   * Downscale ImageData for preview purposes
   * @param imageData Source ImageData
   * @param maxDimension Maximum dimension (width or height)
   * @returns Downscaled ImageData
   */
  downscaleImageData(imageData: ImageData, maxDimension: number): ImageData {
    const { width, height } = imageData;
    
    // Calculate scale factor
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    if (scale === 1) return imageData;

    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);

    // Create temporary canvases for downscaling
    const srcCanvas = this.canvasUtil.createCanvas(width, height);
    const srcCtx = this.canvasUtil.getContext2D(srcCanvas);
    this.canvasUtil.putImageData(srcCtx, imageData, 0, 0);

    const dstCanvas = this.canvasUtil.createCanvas(newWidth, newHeight);
    const dstCtx = this.canvasUtil.getContext2D(dstCanvas);
    this.canvasUtil.drawImage(dstCtx, srcCanvas, 0, 0, newWidth, newHeight);

    return this.canvasUtil.getImageData(dstCtx, 0, 0, newWidth, newHeight);
  }
}
