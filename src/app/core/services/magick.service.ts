import { Injectable } from '@angular/core';
import { initializeImageMagick, ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';

/**
 * MagickService handles image format conversion using magick-wasm.
 * Follows Single Responsibility Principle - ONLY handles ImageMagick operations.
 */
@Injectable({
  providedIn: 'root'
})
export class MagickService {
  private initialized = false;

  /**
   * Initialize ImageMagick WASM
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Get the WASM file URL from node_modules
      // In browser/production, use import.meta.url
      // In tests or other environments, try to fetch directly
      let wasmLocation: string | URL;
      
      try {
        wasmLocation = new URL('@imagemagick/magick-wasm/magick.wasm', import.meta.url);
      } catch (urlError) {
        // Fallback for test environments or non-browser contexts
        wasmLocation = '@imagemagick/magick-wasm/magick.wasm';
      }
      
      await initializeImageMagick(wasmLocation);
      this.initialized = true;
      console.log('ImageMagick initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ImageMagick:', error);
      throw error;
    }
  }

  /**
   * Convert image from one format to another
   * @param imageData Input image data as Uint8Array
   * @param sourceFormat Source format (e.g., 'jpeg', 'webp', 'gif')
   * @param targetFormat Target format (e.g., 'png')
   * @returns Converted image data as Uint8Array
   */
  async convertFormat(
    imageData: Uint8Array,
    sourceFormat: string,
    targetFormat: string
  ): Promise<Uint8Array> {
    if (!this.initialized) {
      await this.initialize();
    }

    return ImageMagick.read(imageData, this.getFormatEnum(sourceFormat), (image) => {
      // Write the image to the target format
      return image.write(this.getFormatEnum(targetFormat), (data) => {
        return data;
      });
    });
  }

  /**
   * Check if a format is supported by Photon (for editing)
   * @param format File format extension (without dot)
   * @returns true if format is compatible with Photon
   */
  isPhotonCompatible(format: string): boolean {
    const compatibleFormats = ['png', 'jpg', 'jpeg', 'bmp'];
    return compatibleFormats.includes(format.toLowerCase());
  }

  /**
   * Get compatible output formats for a given input format (optimized lookup).
   * Some formats (GIF, AVIF, HEIC, etc.) have limited conversion support,
   * so we restrict them to only reliable output formats (PNG, JPEG).
   * 
   * @param inputFormat Input file format extension (without dot)
   * @returns Array of compatible output format strings
   */
  private readonly limitedSupportFormats = new Set(['gif', 'avif', 'heic', 'heif', 'ico', 'svg']);
  private readonly allFormats = ['png', 'jpg', 'bmp', 'webp', 'tiff'];
  private readonly basicFormats = ['png', 'jpg'];

  getCompatibleOutputFormats(inputFormat: string): string[] {
    const format = inputFormat.toLowerCase();
    
    // Use Set for O(1) lookup instead of array includes
    if (this.limitedSupportFormats.has(format)) {
      return this.basicFormats;
    }
    
    return this.allFormats;
  }

  /**
   * Get the file extension from a filename
   * @param filename Full filename with extension
   * @returns Extension without dot (e.g., 'jpg')
   */
  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Get filename without extension
   * @param filename Full filename with extension
   * @returns Filename without extension
   */
  getFileNameWithoutExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length > 1) {
      parts.pop();
    }
    return parts.join('.');
  }

  /**
   * Convert format string to MagickFormat enum
   * @param format Format string (e.g., 'png', 'jpeg')
   * @returns MagickFormat enum value
   */
  private getFormatEnum(format: string): MagickFormat {
    const normalizedFormat = format.toLowerCase();
    
    switch (normalizedFormat) {
      case 'png':
        return MagickFormat.Png;
      case 'jpg':
      case 'jpeg':
        return MagickFormat.Jpeg;
      case 'gif':
        return MagickFormat.Gif;
      case 'bmp':
        return MagickFormat.Bmp;
      case 'webp':
        return MagickFormat.WebP;
      case 'tiff':
      case 'tif':
        return MagickFormat.Tiff;
      case 'ico':
        return MagickFormat.Ico;
      case 'svg':
        return MagickFormat.Svg;
      case 'avif':
        return MagickFormat.Avif;
      case 'heic':
        return MagickFormat.Heic;
      case 'heif':
        return MagickFormat.Heif;
      default:
        return MagickFormat.Png;
    }
  }

  /**
   * Convert a File object to Uint8Array
   * @param file File object
   * @returns Promise<Uint8Array>
   */
  async fileToUint8Array(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert Uint8Array to Blob (optimized)
   * @param data Uint8Array data
   * @param mimeType MIME type (e.g., 'image/png')
   * @returns Blob
   */
  uint8ArrayToBlob(data: Uint8Array, mimeType: string): Blob {
    // Create a copy to ensure it's a regular ArrayBuffer, not SharedArrayBuffer
    const buffer = new ArrayBuffer(data.byteLength);
    const view = new Uint8Array(buffer);
    view.set(data);
    return new Blob([buffer], { type: mimeType });
  }

  /**
   * Get MIME type from file extension (optimized with Map)
   * @param extension File extension without dot
   * @returns MIME type string
   */
  private readonly mimeTypes = new Map<string, string>([
    ['png', 'image/png'],
    ['jpg', 'image/jpeg'],
    ['jpeg', 'image/jpeg'],
    ['gif', 'image/gif'],
    ['bmp', 'image/bmp'],
    ['webp', 'image/webp'],
    ['tiff', 'image/tiff'],
    ['tif', 'image/tiff'],
    ['ico', 'image/x-icon'],
    ['svg', 'image/svg+xml'],
    ['avif', 'image/avif'],
    ['heic', 'image/heic'],
    ['heif', 'image/heif'],
  ]);

  getMimeType(extension: string): string {
    return this.mimeTypes.get(extension.toLowerCase()) || 'image/png';
  }
}
