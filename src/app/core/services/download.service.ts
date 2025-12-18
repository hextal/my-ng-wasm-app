import { Injectable } from '@angular/core';
import { MagickService } from './magick.service';

export interface DownloadFormat {
  value: string;
  label: string;
  mimeType: string;
}

/**
 * DownloadService manages image download operations.
 * Follows Single Responsibility Principle - ONLY handles download/format conversion.
 */
@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  // All available formats
  readonly allFormats: DownloadFormat[] = [
    { value: 'png', label: 'PNG', mimeType: 'image/png' },
    { value: 'jpg', label: 'JPEG', mimeType: 'image/jpeg' },
    { value: 'bmp', label: 'BMP', mimeType: 'image/bmp' },
    { value: 'webp', label: 'WebP', mimeType: 'image/webp' },
    { value: 'tiff', label: 'TIFF', mimeType: 'image/tiff' },
  ];

  constructor(private magickService: MagickService) {}

  /**
   * Get available formats based on compatibility
   */
  getAvailableFormats(): DownloadFormat[] {
    return [...this.allFormats];
  }

  /**
   * Convert canvas to blob in the specified format
   */
  async convertCanvasToBlob(
    canvas: HTMLCanvasElement,
    format: string
  ): Promise<{ blob: Blob; extension: string }> {
    // Get PNG data first
    const pngBlob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

    if (!pngBlob) {
      throw new Error('Failed to generate image data');
    }

    let finalBlob: Blob;
    let finalExtension = format;

    // Check if target format is Photon-compatible
    const isPhotonCompatible = this.magickService.isPhotonCompatible(format);

    if (isPhotonCompatible && format !== 'png') {
      // Use canvas toBlob directly for Photon-compatible formats (jpeg, jpg, bmp)
      const mimeType = this.magickService.getMimeType(format);
      const compatibleBlob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, mimeType);
      });

      if (!compatibleBlob) {
        throw new Error(`Failed to generate ${format.toUpperCase()} data`);
      }
      finalBlob = compatibleBlob;
    } else if (!isPhotonCompatible && format !== 'png') {
      // Use MagickService only for non-Photon formats (webp, gif, avif, tiff, heic)
      const pngData = new Uint8Array(await pngBlob.arrayBuffer());
      const convertedData = await this.magickService.convertFormat(
        pngData,
        'png',
        format
      );

      const mimeType = this.magickService.getMimeType(format);
      finalBlob = this.magickService.uint8ArrayToBlob(convertedData, mimeType);
    } else {
      // PNG - use the original blob
      finalBlob = pngBlob;
    }

    return { blob: finalBlob, extension: finalExtension };
  }

  /**
   * Generate filename for download
   */
  generateFileName(originalFileName: string, format: string): string {
    const baseFileName = this.magickService.getFileNameWithoutExtension(
      originalFileName || 'edited-image'
    );
    return `${baseFileName}.${format}`;
  }

  /**
   * Trigger browser download
   */
  triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Complete download workflow: convert canvas -> generate filename -> trigger download
   */
  async downloadCanvas(
    canvas: HTMLCanvasElement,
    originalFileName: string,
    format: string
  ): Promise<void> {
    const { blob, extension } = await this.convertCanvasToBlob(canvas, format);
    const fileName = this.generateFileName(originalFileName, extension);
    this.triggerDownload(blob, fileName);
  }
}
