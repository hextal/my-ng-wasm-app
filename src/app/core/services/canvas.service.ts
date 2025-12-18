import { Injectable } from '@angular/core';

/**
 * CanvasService handles all canvas operations.
 * Follows Single Responsibility Principle - ONLY handles canvas-related operations.
 */
@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  /**
   * Create a deep copy of ImageData
   */
  copyImageData(imageData: ImageData): ImageData {
    return new ImageData(
      imageData.data.slice(),
      imageData.width,
      imageData.height
    );
  }

  /**
   * Render ImageData to a canvas
   */
  renderImageToCanvas(canvas: HTMLCanvasElement, imgData: ImageData): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    
    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image data
    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Load an image file and convert to ImageData
   */
  async loadImageFromFile(file: File): Promise<ImageData> {
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
        img.onerror = (err) => reject(err);
        img.src = reader.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Load an overlay image (for watermarks, etc.)
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
   * Convert canvas to Blob
   */
  async canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob | null> {
    return new Promise(resolve => {
      canvas.toBlob(resolve, mimeType);
    });
  }

  /**
   * Create a scaled version of ImageData
   */
  scaleImageData(imgData: ImageData, maxWidth: number, maxHeight: number): ImageData {
    const scale = Math.min(maxWidth / imgData.width, maxHeight / imgData.height, 1);
    const scaledWidth = Math.floor(imgData.width * scale);
    const scaledHeight = Math.floor(imgData.height * scale);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imgData.width;
    tempCanvas.height = imgData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imgData, 0, 0);
    
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = scaledWidth;
    scaledCanvas.height = scaledHeight;
    const scaledCtx = scaledCanvas.getContext('2d')!;
    scaledCtx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight);
    
    return scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight);
  }

  /**
   * Convert ImageData to data URL
   */
  imageDataToDataURL(imgData: ImageData, mimeType: string = 'image/png'): string {
    const canvas = document.createElement('canvas');
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL(mimeType);
  }

  /**
   * Draw a rounded rectangle path
   */
  roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
