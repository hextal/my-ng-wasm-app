import { Injectable } from '@angular/core';

/**
 * CanvasService handles canvas and image loading utilities.
 * Follows Single Responsibility Principle - ONLY handles canvas/image operations.
 */
@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  /**
   * Load an image file as an HTMLImageElement for overlay purposes
   * (e.g., watermarks, collage images)
   */
  async loadOverlayImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Load an image file as ImageData for editing
   */
  async loadImage(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
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
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          resolve(imageData);
        };
        img.onerror = (err) => {
          reject(err);
        };
        img.src = reader.result as string;
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Create a data URL from ImageData
   */
  imageDataToDataURL(imageData: ImageData, format: string = 'image/png'): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL(format);
  }
}
