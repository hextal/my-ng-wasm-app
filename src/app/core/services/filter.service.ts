import { Injectable, signal } from '@angular/core';
import { PhotonService } from './photon.service';
import { CanvasService } from './canvas.service';
import { THUMBNAIL_PREVIEW } from '../constants/image-editor.constants';

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
    private photonService: PhotonService,
    private canvasService: CanvasService
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
      console.log('[FilterService] Using cached previews for assetId:', assetId);
      return;
    }
    
    if (this.loadingPreviews()) {
      console.warn('[FilterService] Already loading previews, skipping');
      return;
    }
    
    this.loadingPreviews.set(true);
    this.filterPreviews.set({});
    
    console.log('[FilterService] ===== STARTING PREVIEW GENERATION =====');
    console.log('[FilterService] Input ImageData:', imageData.width, 'x', imageData.height);
    console.log('[FilterService] Asset ID:', assetId || 'none');
    console.log('[FilterService] Total filters to process:', this.filterList.length);
    console.log('[FilterService] Filter list:', this.filterList.map(f => f.name).join(', '));
    
    try {
      // Create scaled down version for previews
      const scaledImageData = this.canvasService.scaleImageData(
        imageData,
        THUMBNAIL_PREVIEW.DEFAULT_SIZE,
        THUMBNAIL_PREVIEW.DEFAULT_SIZE
      );
      
      console.log('[FilterService] ✓ Scaled image to', scaledImageData.width, 'x', scaledImageData.height);
      
      const originalDataURL = this.canvasService.imageDataToDataURL(scaledImageData);
      console.log('[FilterService] ✓ Generated original dataURL, length:', originalDataURL.length);
      
      // Generate ALL previews SEQUENTIALLY to avoid WASM state corruption
      // WARNING: Do NOT convert this to Promise.all() or parallel processing!
      const newPreviews: Record<string, string> = {};
      let successCount = 0;
      let errorCount = 0;
      
      for (const filter of this.filterList) {
        try {
          console.log(`\n[FilterService] Processing ${filter.name} (${filter.id})...`);
          let dataURL: string;
          
          if (filter.method === 'none') {
            dataURL = originalDataURL;
            console.log(`[FilterService]   → Using original dataURL`);
          } else {
            // Create a fresh copy for each filter to prevent mutations
            const inputCopy = this.canvasService.copyImageData(scaledImageData);
            
            // Apply the filter (MUST complete before next iteration)
            const startTime = performance.now();
            const previewData = await this.photonService.filter(inputCopy, filter.method);
            const duration = performance.now() - startTime;
            
            console.log(`[FilterService]   → Filter applied in ${duration.toFixed(0)}ms`);
            console.log(`[FilterService]   → Result: ${previewData.width}x${previewData.height}`);
            
            // Convert to data URL immediately (while memory is still valid)
            dataURL = this.canvasService.imageDataToDataURL(previewData);
            console.log(`[FilterService]   → DataURL generated, length: ${dataURL.length}`);
          }
          
          newPreviews[filter.id] = dataURL;
          successCount++;
          
          // Update signal progressively so user sees thumbnails as they're generated
          this.filterPreviews.set({ ...newPreviews });
          console.log(`[FilterService] ✓ ${filter.name} complete! (${successCount}/${this.filterList.length} done)`);
          
          // Log current preview state
          console.log(`[FilterService]   Current preview keys:`, Object.keys(newPreviews));
        } catch (error) {
          errorCount++;
          console.error(`[FilterService] ✗ FAILED to generate ${filter.name}:`, error);
          // Use original as fallback
          newPreviews[filter.id] = originalDataURL;
          this.filterPreviews.set({ ...newPreviews });
        }
      }
      
      // Cache the generated previews if assetId is provided
      if (assetId) {
        this.previewCache.set(assetId, { ...newPreviews });
        this.currentAssetId.set(assetId);
        console.log('[FilterService] ✓ Cached previews for assetId:', assetId);
      }
      
      console.log('\n[FilterService] ===== PREVIEW GENERATION COMPLETE =====');
      console.log('[FilterService] Success:', successCount, '| Errors:', errorCount);
      console.log('[FilterService] Final preview count:', Object.keys(newPreviews).length);
      console.log('[FilterService] All preview IDs:', Object.keys(newPreviews).join(', '));

    } catch (e) {
      console.error('[FilterService] ✗ CRITICAL ERROR during preview generation:', e);
    } finally {
      this.loadingPreviews.set(false);
      console.log('[FilterService] Loading state set to false');
    }
  }

  /**
   * Apply a filter to an image
   */
  async applyFilter(imageData: ImageData, filter: FilterDefinition): Promise<ImageData> {
    if (filter.method === 'none') {
      return this.canvasService.copyImageData(imageData);
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
