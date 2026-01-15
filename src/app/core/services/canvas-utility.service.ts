import { Injectable } from '@angular/core';

/**
 * CanvasUtilityService
 * 
 * SOLID Principle: Single Responsibility
 * This service handles ONLY canvas element creation and DOM manipulation.
 * It abstracts away direct DOM access from other services, making them
 * more testable and maintainable.
 * 
 * Purpose:
 * - Create canvas elements
 * - Get 2D rendering contexts
 * - Create and manage DOM elements (links, inputs, etc.)
 * - Abstract away document.createElement calls
 * 
 * This service should NOT:
 * - Process image data
 * - Apply filters or effects
 * - Handle business logic
 */
@Injectable({
  providedIn: 'root'
})
export class CanvasUtilityService {
  
  /**
   * Create a new canvas element with optional dimensions
   */
  createCanvas(width?: number, height?: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    if (width !== undefined) {
      canvas.width = width;
    }
    if (height !== undefined) {
      canvas.height = height;
    }
    return canvas;
  }
  
  /**
   * Get 2D rendering context from a canvas element
   * @throws Error if context cannot be created
   */
  getContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    return ctx;
  }
  
  /**
   * Get 2D rendering context with optional willReadFrequently hint
   * This is useful for better performance when reading pixel data frequently
   */
  getContext2DWithOptions(
    canvas: HTMLCanvasElement,
    options: CanvasRenderingContext2DSettings = {}
  ): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d', options);
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    return ctx;
  }
  
  /**
   * Create a download link element
   * Returns an anchor element configured for file downloads
   */
  createDownloadLink(filename: string, href: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.download = filename;
    link.href = href;
    return link;
  }
  
  /**
   * Create a file input element
   * Returns an input element of type 'file'
   */
  createFileInput(accept?: string, multiple?: boolean): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) {
      input.accept = accept;
    }
    if (multiple !== undefined) {
      input.multiple = multiple;
    }
    return input;
  }
  
  /**
   * Trigger a download by programmatically clicking a link
   */
  triggerDownload(link: HTMLAnchorElement): void {
    link.click();
  }
  
  /**
   * Create an object URL from a blob
   */
  createObjectURL(blob: Blob): string {
    return URL.createObjectURL(blob);
  }
  
  /**
   * Revoke an object URL to free memory
   */
  revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }
  
  /**
   * Get canvas element by ID
   * Returns null if element not found or is not a canvas
   */
  getCanvasById(id: string): HTMLCanvasElement | null {
    const element = document.getElementById(id);
    if (element instanceof HTMLCanvasElement) {
      return element;
    }
    return null;
  }
  
  /**
   * Draw an image onto a canvas
   */
  drawImage(
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth?: number,
    dHeight?: number
  ): void {
    if (dWidth !== undefined && dHeight !== undefined) {
      ctx.drawImage(image, dx, dy, dWidth, dHeight);
    } else {
      ctx.drawImage(image, dx, dy);
    }
  }
  
  /**
   * Clear a canvas
   */
  clearCanvas(canvas: HTMLCanvasElement): void {
    const ctx = this.getContext2D(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  /**
   * Get ImageData from a canvas
   */
  getImageData(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): ImageData {
    return ctx.getImageData(sx, sy, sw, sh);
  }
  
  /**
   * Put ImageData onto a canvas
   */
  putImageData(
    ctx: CanvasRenderingContext2D,
    imageData: ImageData,
    dx: number,
    dy: number
  ): void {
    ctx.putImageData(imageData, dx, dy);
  }
  
  /**
   * Convert canvas to data URL
   */
  canvasToDataURL(canvas: HTMLCanvasElement, type?: string, quality?: number): string {
    return canvas.toDataURL(type, quality);
  }
  
  /**
   * Convert canvas to Blob
   */
  async canvasToBlob(canvas: HTMLCanvasElement, type?: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        type,
        quality
      );
    });
  }
}
