import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * AssetStoreService - In-memory Blob cache
 * Stores image and media assets by ID
 * Future: Can be extended to use IndexedDB for persistence
 */
@Injectable({
  providedIn: 'root',
})
export class AssetStoreService {
  private assets = new Map<string, Blob>();
  private objectUrls = new Map<string, string>();

  /**
   * Store a blob and return its asset ID
   */
  async put(blob: Blob): Promise<{ assetId: string }> {
    const assetId = uuidv4();
    this.assets.set(assetId, blob);
    return { assetId };
  }

  /**
   * Retrieve a blob by asset ID
   */
  async get(assetId: string): Promise<Blob> {
    const blob = this.assets.get(assetId);
    if (!blob) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    return blob;
  }

  /**
   * Delete an asset by ID
   */
  async delete(assetId: string): Promise<void> {
    this.assets.delete(assetId);
    
    // Clean up object URL if it exists
    const objectUrl = this.objectUrls.get(assetId);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      this.objectUrls.delete(assetId);
    }
  }

  /**
   * Get or create an object URL for an asset
   * Caches the URL to avoid repeated creation
   */
  async getObjectUrl(assetId: string): Promise<string> {
    // Return cached URL if exists
    if (this.objectUrls.has(assetId)) {
      return this.objectUrls.get(assetId)!;
    }

    // Create new object URL
    const blob = await this.get(assetId);
    const objectUrl = URL.createObjectURL(blob);
    this.objectUrls.set(assetId, objectUrl);
    return objectUrl;
  }

  /**
   * Clear all assets (use with caution)
   */
  clear(): void {
    // Revoke all object URLs
    for (const objectUrl of this.objectUrls.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    this.objectUrls.clear();
    this.assets.clear();
  }

  /**
   * Get the number of stored assets
   */
  size(): number {
    return this.assets.size;
  }

  /**
   * Check if an asset exists
   */
  has(assetId: string): boolean {
    return this.assets.has(assetId);
  }
}
