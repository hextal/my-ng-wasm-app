import { Injectable } from '@angular/core';
import { PhotonService } from '../../core/services/photon.service';

/**
 * PhotonFiltersService - Adapter for applying Photon filters to Blobs
 * Wraps the existing PhotonService to work with the editor pipeline
 */
@Injectable({
  providedIn: 'root',
})
export class PhotonFiltersService {
  constructor(private photonService: PhotonService) {}

  /**
   * Apply a filter to an image blob
   * @param blob Input image blob
   * @param filterName Name of the Photon filter function
   * @param params Optional parameters for the filter
   * @returns Filtered image as a new blob
   */
  async applyFilter(
    blob: Blob,
    filterName: string,
    params?: any
  ): Promise<Blob> {
    // Ensure Photon is initialized
    await this.photonService.initialize();

    // Convert blob to ImageData
    const imageData = await this.blobToImageData(blob);

    // Apply the filter
    let filteredImageData: ImageData;

    // Map filter name to Photon method with parameters
    switch (filterName) {
      // Monochrome Effects (no params)
      case 'grayscale':
        filteredImageData = await this.photonService.grayscale(imageData);
        break;
      case 'grayscale_human_corrected':
        filteredImageData = await this.photonService.grayscale_human_corrected(imageData);
        break;
      case 'desaturate':
        filteredImageData = await this.photonService.desaturate(imageData);
        break;
      case 'sepia':
        filteredImageData = await this.photonService.sepia(imageData);
        break;
      
      // Convolution Effects (no params)
      case 'box_blur':
      case 'blur':
        filteredImageData = await this.photonService.box_blur(imageData);
        break;
      case 'gaussian_blur':
        filteredImageData = await this.photonService.gaussian_blur(imageData);
        break;
      case 'sharpen':
        filteredImageData = await this.photonService.sharpen(imageData);
        break;
      case 'edge_detection':
        filteredImageData = await this.photonService.edge_detection(imageData);
        break;
      case 'emboss':
        filteredImageData = await this.photonService.emboss(imageData);
        break;
      
      // Special Effects with params
      case 'inc_brightness':
        filteredImageData = await this.photonService.inc_brightness(
          imageData,
          params?.brightness ?? 10
        );
        break;
      case 'oil':
        filteredImageData = await this.photonService.oil(
          imageData,
          params?.radius ?? 4,
          params?.intensity ?? 55
        );
        break;
      case 'pixelize':
        filteredImageData = await this.photonService.pixelize(
          imageData,
          params?.pixelSize ?? 10
        );
        break;
      case 'threshold':
        filteredImageData = await this.photonService.threshold(
          imageData,
          params?.threshold ?? 128
        );
        break;
      case 'solarize':
        filteredImageData = await this.photonService.solarize(imageData);
        break;
      
      // Hue rotation
      case 'hue_rotate_hsl':
        filteredImageData = await this.photonService.hue_rotate_hsl(
          imageData,
          params?.degrees ?? 0
        );
        break;
      case 'hue_rotate_hsv':
        filteredImageData = await this.photonService.hue_rotate_hsv(
          imageData,
          params?.degrees ?? 0
        );
        break;
      
      default:
        throw new Error(`Unsupported filter: ${filterName}`);
    }

    // Convert ImageData back to Blob
    return this.imageDataToBlob(filteredImageData);
  }

  /**
   * Apply a filter with preview (downscaled for performance)
   * @param blob Input image blob
   * @param filterName Name of the filter
   * @param params Filter parameters
   * @param maxDimension Maximum dimension for preview (default: 512)
   * @returns Preview blob
   */
  async previewFilter(
    blob: Blob,
    filterName: string,
    params?: any,
    maxDimension: number = 512
  ): Promise<Blob> {
    // Load and downscale image
    const imageData = await this.blobToImageData(blob);
    const downscaledImageData = this.downscaleImageData(imageData, maxDimension);

    // Apply filter to downscaled version
    const previewBlob = new Blob([downscaledImageData.data.buffer], {
      type: 'image/png',
    });

    return this.applyFilter(previewBlob, filterName, params);
  }

  /**
   * Get list of available filters
   */
  getAvailableFilters(): Array<{
    name: string;
    displayName: string;
    hasParams: boolean;
    params?: Array<{ name: string; type: string; default?: any }>;
  }> {
    return [
      { name: 'grayscale', displayName: 'Grayscale', hasParams: false },
      { name: 'sepia', displayName: 'Sepia', hasParams: false },
      { name: 'blur', displayName: 'Blur', hasParams: false },
      { name: 'gaussian_blur', displayName: 'Gaussian Blur', hasParams: false },
      { name: 'sharpen', displayName: 'Sharpen', hasParams: false },
      { name: 'edge_detection', displayName: 'Edge Detection', hasParams: false },
      { name: 'emboss', displayName: 'Emboss', hasParams: false },
      { name: 'solarize', displayName: 'Solarize', hasParams: false },
      {
        name: 'inc_brightness',
        displayName: 'Brightness',
        hasParams: true,
        params: [{ name: 'brightness', type: 'number', default: 10 }],
      },
      {
        name: 'oil',
        displayName: 'Oil Painting',
        hasParams: true,
        params: [
          { name: 'radius', type: 'number', default: 4 },
          { name: 'intensity', type: 'number', default: 55 },
        ],
      },
      {
        name: 'pixelize',
        displayName: 'Pixelize',
        hasParams: true,
        params: [{ name: 'pixelSize', type: 'number', default: 10 }],
      },
      {
        name: 'threshold',
        displayName: 'Threshold',
        hasParams: true,
        params: [{ name: 'threshold', type: 'number', default: 128 }],
      },
      {
        name: 'hue_rotate_hsl',
        displayName: 'Hue Rotate (HSL)',
        hasParams: true,
        params: [{ name: 'degrees', type: 'number', default: 0 }],
      },
    ];
  }

  /**
   * Convert Blob to ImageData
   */
  private async blobToImageData(blob: Blob): Promise<ImageData> {
    return new Promise((resolve, reject) => {
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
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Convert ImageData to Blob
   */
  private async imageDataToBlob(imageData: ImageData): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  }

  /**
   * Downscale ImageData for preview
   */
  private downscaleImageData(
    imageData: ImageData,
    maxDimension: number
  ): ImageData {
    const { width, height } = imageData;
    
    // Calculate scale factor
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    if (scale === 1) return imageData;

    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);

    // Create temporary canvases for downscaling
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.putImageData(imageData, 0, 0);

    const dstCanvas = document.createElement('canvas');
    dstCanvas.width = newWidth;
    dstCanvas.height = newHeight;
    const dstCtx = dstCanvas.getContext('2d')!;
    dstCtx.drawImage(srcCanvas, 0, 0, newWidth, newHeight);

    return dstCtx.getImageData(0, 0, newWidth, newHeight);
  }
}
