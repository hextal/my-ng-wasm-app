import { Injectable } from '@angular/core';
import { initializeImageMagick, ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';
import { FileUtilityService } from './file-utility.service';

/**
 * MagickService handles image format conversion using magick-wasm.
 * Follows Single Responsibility Principle - ONLY handles ImageMagick operations.
 * 
 * Architecture:
 * - Uses Web Workers for non-blocking format conversions
 * - Falls back to main thread if workers are unavailable
 * - Transfers data efficiently using Transferable Objects
 */
@Injectable({
  providedIn: 'root'
})
export class MagickService {
  private initialized = false;

  // Web Worker management
  private worker: Worker | null = null;
  private workerReady = false;
  private workerMessageId = 0;
  private pendingMessages = new Map<string, { resolve: Function; reject: Function }>();
  
  // Detect environment
  private isBrowser = typeof window !== 'undefined';
  private supportsWorkers = typeof Worker !== 'undefined';
  
  constructor(private fileUtility: FileUtilityService) {}

  /**
   * Initialize ImageMagick WASM using Web Workers (preferred) or fallback to main thread
   */
  async initialize(): Promise<void> {
    if (this.workerReady || this.initialized) {
      return;
    }
    
    try {
      if (!this.isBrowser) {
        return; // Skip on server
      }

      // Try to initialize with Web Worker first
      if (this.supportsWorkers) {
        try {
          await this.initializeWorker();
          console.log('[MagickService] Using Web Worker for format conversion');
          return;
        } catch (workerError) {
          console.warn('[MagickService] Worker initialization failed, falling back to main thread:', workerError);
        }
      }

      // Fallback: Initialize on main thread
      await this.initializeMainThread();
      console.log('[MagickService] Using main thread for format conversion');
    } catch (error) {
      console.error('Failed to initialize ImageMagick:', error);
      throw error;
    }
  }

  /**
   * Initialize Web Worker for off-thread processing
   */
  private async initializeWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker with proper URL
        this.worker = new Worker(
          new URL('./magick.worker.ts', import.meta.url),
          { type: 'module' }
        );

        // Set up message handler
        this.worker.onmessage = (event) => {
          const { id, success, data, error } = event.data;

          if (id === 'init') {
            if (success) {
              this.workerReady = true;
              resolve();
            } else {
              reject(new Error(error || 'Worker initialization failed'));
            }
            return;
          }

          // Handle other messages
          const pending = this.pendingMessages.get(id);
          if (pending) {
            this.pendingMessages.delete(id);
            if (success) {
              pending.resolve(data);
            } else {
              pending.reject(new Error(error || 'Worker operation failed'));
            }
          }
        };

        this.worker.onerror = (error) => {
          console.error('[MagickService] Worker error:', error);
          reject(error);
        };

        // Initialize the worker
        this.worker.postMessage({ id: 'init', type: 'initialize' });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.workerReady) {
            reject(new Error('Worker initialization timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialize on main thread (fallback)
   */
  private async initializeMainThread(): Promise<void> {
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
    if (!this.initialized && !this.workerReady) {
      await this.initialize();
    }

    // Use worker if available
    if (this.workerReady && this.worker) {
      return this.convertFormatWithWorker(imageData, sourceFormat, targetFormat);
    }

    // Fallback to main thread
    return this.convertFormatMainThread(imageData, sourceFormat, targetFormat);
  }

  /**
   * Convert format using Web Worker (non-blocking)
   */
  private async convertFormatWithWorker(
    imageData: Uint8Array,
    sourceFormat: string,
    targetFormat: string
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const id = `convert-${++this.workerMessageId}`;
      
      this.pendingMessages.set(id, { resolve, reject });
      
      // Transfer buffer to worker (zero-copy)
      const buffer = imageData.buffer;
      const transferList: Transferable[] = [buffer];
      this.worker!.postMessage({
        id,
        type: 'convert-format',
        payload: { imageData, sourceFormat, targetFormat }
      }, { transfer: transferList });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Format conversion timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Convert format on main thread (fallback)
   */
  private async convertFormatMainThread(
    imageData: Uint8Array,
    sourceFormat: string,
    targetFormat: string
  ): Promise<Uint8Array> {
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

  /**
   * Cleanup resources
   */
  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
    }
  }
}
