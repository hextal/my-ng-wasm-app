import { Injectable } from '@angular/core';

/**
 * FileUtilityService handles file and format utilities.
 * Follows Single Responsibility Principle - ONLY handles file utilities.
 */
@Injectable({
  providedIn: 'root'
})
export class FileUtilityService {
  /**
   * Get the file extension from a filename
   */
  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Get filename without extension
   */
  getFileNameWithoutExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length > 1) {
      parts.pop();
    }
    return parts.join('.');
  }

  /**
   * Convert a File object to Uint8Array
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
   * Convert Uint8Array to Blob
   */
  uint8ArrayToBlob(data: Uint8Array, mimeType: string): Blob {
    // Create a copy to ensure it's a regular ArrayBuffer, not SharedArrayBuffer
    const buffer = new ArrayBuffer(data.byteLength);
    const view = new Uint8Array(buffer);
    view.set(data);
    return new Blob([buffer], { type: mimeType });
  }

  /**
   * Get MIME type from file extension
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
