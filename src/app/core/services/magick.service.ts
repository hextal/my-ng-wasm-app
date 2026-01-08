import { Injectable } from '@angular/core';
import { initializeImageMagick, ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';
import { FileUtilityService } from './file-utility.service';

/**
 * MagickService handles image format conversion using magick-wasm.
 * Follows Single Responsibility Principle - ONLY handles ImageMagick operations.
 */
@Injectable({
  providedIn: 'root'
})
export class MagickService {
  private initialized = false;
  
  constructor(private fileUtility: FileUtilityService) {}

  /**
   * Initialize ImageMagick WASM
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Fetch WASM file as bytes
      const wasmUrl = '/assets/magick-wasm/magick.wasm';
      console.log('Fetching ImageMagick WASM from:', wasmUrl);
      
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
      }
      
      const wasmBytes = await response.arrayBuffer();
      console.log('WASM bytes fetched:', wasmBytes.byteLength, 'bytes');
      
      // Initialize with bytes
      await initializeImageMagick(wasmBytes);
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
   * @deprecated Use FileUtilityService.getFileExtension instead
   */
  getFileExtension(filename: string): string {
    return this.fileUtility.getFileExtension(filename);
  }

  /**
   * Get filename without extension
   * @deprecated Use FileUtilityService.getFileNameWithoutExtension instead
   */
  getFileNameWithoutExtension(filename: string): string {
    return this.fileUtility.getFileNameWithoutExtension(filename);
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
   * @deprecated Use FileUtilityService.fileToUint8Array instead
   */
  async fileToUint8Array(file: File): Promise<Uint8Array> {
    return this.fileUtility.fileToUint8Array(file);
  }

  /**
   * Convert Uint8Array to Blob
   * @deprecated Use FileUtilityService.uint8ArrayToBlob instead
   */
  uint8ArrayToBlob(data: Uint8Array, mimeType: string): Blob {
    return this.fileUtility.uint8ArrayToBlob(data, mimeType);
  }

  /**
   * Get MIME type from file extension
   * @deprecated Use FileUtilityService.getMimeType instead
   */
  getMimeType(extension: string): string {
    return this.fileUtility.getMimeType(extension);
  }
}
