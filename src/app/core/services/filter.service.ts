import { Injectable, signal } from '@angular/core';
import { PhotonService } from './photon.service';
import { THUMBNAIL_PREVIEW } from '../constants/image-editor.constants';

// Utility functions to replace CanvasService
function scaleImageData(imageData: ImageData, maxWidth: number, maxHeight: number): ImageData {
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
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d')!;
  
  // Put original image data on a temporary canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);
  
  // Draw scaled version
  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
  return ctx.getImageData(0, 0, newWidth, newHeight);
}

function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

function copyImageData(imageData: ImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
}

export interface FilterDefinition {
  id: string;
  name: string;
  method: string;
  args?: any[];
}

/**
 * FilterService manages filter operations and previews.
 * Follows Single Responsibility Principle - ONLY handles filter management.
 */
@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private filterPreviews = signal<Record<string, string>>({});
  private loadingPreviews = signal<boolean>(false);
  private activeFilterId = signal<string>('original');
  
  // Cache for storing previews per asset ID
  private previewCache = new Map<string, Record<string, string>>();
  private currentAssetId = signal<string | null>(null);

  // Artistic filter list - sorted alphabetically
  readonly filterList: FilterDefinition[] = [
    { id: 'original', name: 'Original', method: 'none' },
    { id: 'bluechrome', name: 'Bluechrome', method: 'bluechrome' },
    { id: 'cali', name: 'Cali', method: 'cali' },
    { id: 'diamante', name: 'Diamante', method: 'diamante' },
    { id: 'dramatic', name: 'Dramatic', method: 'dramatic' },
    { id: 'firenze', name: 'Firenze', method: 'firenze' },
    { id: 'flagblue', name: 'Flagblue', method: 'flagblue' },
    { id: 'golden', name: 'Golden', method: 'golden' },
    { id: 'islands', name: 'Islands', method: 'islands' },
    { id: 'liquid', name: 'Liquid', method: 'liquid' },
    { id: 'lix', name: 'Lix', method: 'lix' },
    { id: 'lofi', name: 'Lofi', method: 'lofi' },
    { id: 'marine', name: 'Marine', method: 'marine' },
    { id: 'mauve', name: 'Mauve', method: 'mauve' },
    { id: 'neue', name: 'Neue', method: 'neue' },
    { id: 'obsidian', name: 'Obsidian', method: 'obsidian' },
    { id: 'oceanic', name: 'Oceanic', method: 'oceanic' },
    { id: 'oil', name: 'Oil Painting', method: 'oil' },
    { id: 'pastel_pink', name: 'Pastel Pink', method: 'pastel_pink' },
    { id: 'perfume', name: 'Perfume', method: 'perfume' },
    { id: 'pixelize', name: 'Pixelize', method: 'pixelize' },
    { id: 'radio', name: 'Radio', method: 'radio' },
    { id: 'rosetint', name: 'Rosetint', method: 'rosetint' },
    { id: 'ryo', name: 'Ryo', method: 'ryo' },
    { id: 'seagreen', name: 'Seagreen', method: 'seagreen' },
    { id: 'sepia', name: 'Sepia', method: 'sepia' },
    { id: 'serenity', name: 'Serenity', method: 'serenity' },
    { id: 'solarize', name: 'Solarize', method: 'solarize' },
    { id: 'twenties', name: 'Twenties', method: 'twenties' },
    { id: 'vintage', name: 'Vintage', method: 'vintage' },
  ];

  constructor(
    private photonService: PhotonService
  ) {}

  /**
   * Get filter previews signal
   */
  getPreviews() {
    return this.filterPreviews;
  }

  /**
   * Get individual filter preview by ID
   */
  getFilterPreview(filterId: string): string | undefined {
    return this.filterPreviews()[filterId];
  }

  /**
   * Get loading state signal
   */
  isLoadingPreviews() {
    return this.loadingPreviews;
  }

  /**
   * Get active filter ID signal
   */
  getActiveFilterId() {
    return this.activeFilterId;
  }

  /**
   * Set active filter ID
   */
  setActiveFilterId(filterId: string): void {
    this.activeFilterId.set(filterId);
  }

  /**
   * Get current asset ID
   */
  getCurrentAssetId() {
    return this.currentAssetId;
  }

  /**
   * Check if previews are cached for a given asset ID
   */
  hasCachedPreviews(assetId: string): boolean {
    return this.previewCache.has(assetId);
  }

  /**
   * Load cached previews for a given asset ID
   */
  loadCachedPreviews(assetId: string): boolean {
    const cached = this.previewCache.get(assetId);
    if (cached) {
      this.filterPreviews.set(cached);
      this.currentAssetId.set(assetId);
      return true;
    }
    return false;
  }

  /**
   * Generate filter previews for all filters
   * 
   * CRITICAL WARNING: Filters MUST be generated SEQUENTIALLY, not in parallel!
   * 
   * Issue: Parallel filter generation causes thumbnails to display incorrect results.
   * When multiple filters are applied simultaneously using Promise.all() or parallel
   * map operations, the Photon WASM module's internal state can become corrupted,
   * leading to:
   * - All thumbnails showing the same image
   * - Thumbnails showing results from different filters
   * - Cached results returning incorrect data for new images
   * 
   * Root Cause: The Photon WASM module uses shared memory and internal state that
   * is not thread-safe when processing multiple images concurrently. Even though
   * we create separate PhotonImage instances, the underlying WASM runtime shares
   * memory buffers that get overwritten during concurrent operations.
   * 
   * Solution: Generate previews sequentially using a for-loop instead of Promise.all().
   * This ensures each filter completes fully before the next one starts, preventing
   * state corruption.
   * 
   * DO NOT change this to parallel processing without extensive testing across
   * multiple image types and formats.
   */
  async generatePreviews(imageData: ImageData, assetId?: string): Promise<void> {
    // If assetId is provided and we have cached previews, use them
    if (assetId && this.loadCachedPreviews(assetId)) {
      return;
    }
    
    if (this.loadingPreviews()) {
      return;
    }
    
    this.loadingPreviews.set(true);
    this.filterPreviews.set({});
    
    try {
      // Create scaled down version for previews
      const scaledImageData = scaleImageData(
        imageData,
        THUMBNAIL_PREVIEW.DEFAULT_SIZE,
        THUMBNAIL_PREVIEW.DEFAULT_SIZE
      );
      
      const originalDataURL = imageDataToDataURL(scaledImageData);
      
      // Generate ALL previews SEQUENTIALLY to avoid WASM state corruption
      // WARNING: Do NOT convert this to Promise.all() or parallel processing!
      const newPreviews: Record<string, string> = {};
      
      for (const filter of this.filterList) {
        try {
          let dataURL: string;
          
          if (filter.method === 'none') {
            dataURL = originalDataURL;
          } else {
            // Create a fresh copy for each filter to prevent mutations
            const inputCopy = copyImageData(scaledImageData);
            
            // Apply the filter (MUST complete before next iteration)
            const previewData = await this.photonService.filter(inputCopy, filter.method);
            
            // Convert to data URL immediately (while memory is still valid)
            dataURL = imageDataToDataURL(previewData);
          }
          
          newPreviews[filter.id] = dataURL;
          
          // Update signal progressively so user sees thumbnails as they're generated
          this.filterPreviews.set({ ...newPreviews });
        } catch (error) {
          console.error(`[FilterService] Failed to generate ${filter.name}:`, error);
          // Use original as fallback
          newPreviews[filter.id] = originalDataURL;
          this.filterPreviews.set({ ...newPreviews });
        }
      }
      
      // Cache the generated previews if assetId is provided
      if (assetId) {
        this.previewCache.set(assetId, { ...newPreviews });
        this.currentAssetId.set(assetId);
      }

    } catch (e) {
      console.error('[FilterService] Critical error during preview generation:', e);
    } finally {
      this.loadingPreviews.set(false);
    }
  }

  /**
   * Apply a filter to an image
   */
  async applyFilter(imageData: ImageData, filter: FilterDefinition): Promise<ImageData> {
    if (filter.method === 'none') {
      return copyImageData(imageData);
    }
    
    return await this.photonService.filter(imageData, filter.method);
  }

  /**
   * Get filter by ID
   */
  getFilterById(filterId: string): FilterDefinition | undefined {
    return this.filterList.find(f => f.id === filterId);
  }

  /**
   * Reset to original (no filter)
   */
  resetFilter(): void {
    this.activeFilterId.set('original');
  }

  /**
   * Clear all preview data
   */
  clearPreviews(): void {
    this.filterPreviews.set({});
    this.activeFilterId.set('original');
  }

  /**
   * Clear all cached previews
   */
  clearCache(): void {
    this.previewCache.clear();
    this.currentAssetId.set(null);
  }
}
