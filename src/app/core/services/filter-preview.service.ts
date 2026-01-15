import { Injectable } from '@angular/core';
import { FilterService } from './filter.service';
import { ImageDataUtilityService } from './image-data-utility.service';
import { AssetStoreService } from '../../editor/services/asset-store.service';

/**
 * FilterPreviewService
 * 
 * SOLID Principle: Single Responsibility
 * This service handles ONLY filter preview generation coordination.
 * 
 * Purpose:
 * - Coordinate filter preview generation workflow
 * - Handle blob to ImageData conversion for preview generation
 * - Manage caching logic for filter previews
 * - Log preview generation progress
 * 
 * This service should NOT:
 * - Apply filters directly (delegates to FilterService)
 * - Manipulate DOM
 * - Manage component state
 */
@Injectable({
  providedIn: 'root'
})
export class FilterPreviewService {
  
  constructor(
    private filterService: FilterService,
    private imageDataUtil: ImageDataUtilityService,
    private assetStore: AssetStoreService
  ) {}
  
  /**
   * Generate filter previews from a blob
   * @param blob Image blob to generate previews from
   * @param assetId Optional asset ID for caching
   */
  async generatePreviewsFromBlob(blob: Blob, assetId?: string): Promise<void> {
    try {
      console.log('\n[FilterPreviewService] ===== STARTING FILTER PREVIEW GENERATION =====');
      console.log('[FilterPreviewService] Blob size:', blob.size, 'bytes');
      console.log('[FilterPreviewService] Blob type:', blob.type);
      console.log('[FilterPreviewService] Asset ID:', assetId || 'none');
      
      // Convert blob to ImageData using utility function
      console.log('[FilterPreviewService] Converting blob to ImageData...');
      const imageData = await this.imageDataUtil.loadImageDataFromBlob(blob);
      console.log('[FilterPreviewService] ✓ ImageData created:', imageData.width, 'x', imageData.height);
      console.log('[FilterPreviewService] ImageData pixel count:', imageData.data.length / 4);
      
      // Generate previews using FilterService
      console.log('[FilterPreviewService] Calling FilterService.generatePreviews()...');
      await this.filterService.generatePreviews(imageData, assetId);
      
      const previewCount = Object.keys(this.filterService.getPreviews()()).length;
      console.log('[FilterPreviewService] ===== FILTER PREVIEW GENERATION COMPLETE =====');
      console.log('[FilterPreviewService] Total previews generated:', previewCount);
      console.log('[FilterPreviewService] Preview IDs:', Object.keys(this.filterService.getPreviews()()));
      
      if (previewCount === 0) {
        console.error('[FilterPreviewService] ⚠️ WARNING: No previews were generated!');
      }
    } catch (error) {
      console.error('[FilterPreviewService] ✗ FAILED to generate filter previews:', error);
      if (error instanceof Error) {
        console.error('[FilterPreviewService] Error stack:', error.stack);
      }
      throw error;
    }
  }
  
  /**
   * Generate filter previews from an asset ID
   * @param assetId Asset ID to load and generate previews from
   */
  async generatePreviewsFromAssetId(assetId: string): Promise<void> {
    try {
      const blob = await this.assetStore.get(assetId);
      await this.generatePreviewsFromBlob(blob, assetId);
    } catch (error) {
      console.error('[FilterPreviewService] Failed to generate previews for asset:', assetId, error);
      throw error;
    }
  }
  
  /**
   * Check if previews exist for an asset
   * @param assetId Asset ID to check
   * @returns True if cached previews exist
   */
  hasCachedPreviews(assetId: string): boolean {
    return this.filterService.hasCachedPreviews(assetId);
  }
  
  /**
   * Load cached previews for an asset
   * @param assetId Asset ID to load previews for
   * @returns True if previews were loaded successfully
   */
  loadCachedPreviews(assetId: string): boolean {
    const loaded = this.filterService.loadCachedPreviews(assetId);
    if (loaded) {
      console.log('[FilterPreviewService] Loaded cached previews for assetId:', assetId);
    }
    return loaded;
  }
  
  /**
   * Check if any filter previews exist
   */
  hasPreviewsGenerated(): boolean {
    const previews = this.filterService.getPreviews()();
    return Object.keys(previews).length > 0;
  }
  
  /**
   * Clear all filter previews
   */
  clearPreviews(): void {
    this.filterService.clearPreviews();
  }
}
