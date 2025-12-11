import { Injectable } from '@angular/core';

/**
 * IndexedDB service for caching processed images
 * Improves performance by storing processed images locally
 */
@Injectable({ providedIn: 'root' })
export class ImageCacheService {
  private readonly DB_NAME = 'ImageEditorCache';
  private readonly DB_VERSION = 1;
  private readonly IMAGES_STORE = 'processedImages';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  private db: IDBDatabase | null = null;
  private isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

  async initDB(): Promise<void> {
    if (!this.isBrowser) return;
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

        request.onsuccess = () => {
          resolve();
        };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create images store
        if (!db.objectStoreNames.contains(this.IMAGES_STORE)) {
          const store = db.createObjectStore(this.IMAGES_STORE, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });
  }

  /**
   * Generate a cache key from image data and filter parameters
   */
  private generateKey(imageData: ImageData, filter: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    const dataHash = this.hashImageData(imageData);
    return `${dataHash}_${filter}_${paramStr}`;
  }

  /**
   * Simple hash function for ImageData
   */
  private hashImageData(imageData: ImageData): string {
    const { width, height } = imageData;
    // Sample pixels for hash (corners + center)
    const data = imageData.data;
    const samples = [
      data[0], data[1], data[2], // Top-left
      data[width * 4 - 4], data[width * 4 - 3], data[width * 4 - 2], // Top-right
      data[(height - 1) * width * 4], data[(height - 1) * width * 4 + 1], data[(height - 1) * width * 4 + 2], // Bottom-left
      data[height * width * 4 - 4], data[height * width * 4 - 3], data[height * width * 4 - 2], // Bottom-right
      data[Math.floor(height / 2) * width * 4 + Math.floor(width / 2) * 4] // Center
    ];
    return `${width}x${height}_${samples.join('')}`;
  }

  /**
   * Get cached image if available
   */
  async get(imageData: ImageData, filter: string, params?: any): Promise<ImageData | null> {
    if (!this.isBrowser) return null;
    
    try {
      await this.initDB();
      if (!this.db) return null;

      const key = this.generateKey(imageData, filter, params);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(this.IMAGES_STORE);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check if cache entry is expired
          const age = Date.now() - result.timestamp;
          if (age > this.MAX_CACHE_AGE) {
            // Delete expired entry
            this.delete(key);
            resolve(null);
            return;
          }

          // Reconstruct ImageData from cached data
          const cachedImageData = new ImageData(
            new Uint8ClampedArray(result.data),
            result.width,
            result.height
          );
          resolve(cachedImageData);
        };

        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Store processed image in cache
   */
  async set(originalImageData: ImageData, filter: string, processedImageData: ImageData, params?: any): Promise<void> {
    if (!this.isBrowser) return;
    
    try {
      await this.initDB();
      if (!this.db) return;

      const key = this.generateKey(originalImageData, filter, params);
      const size = processedImageData.data.byteLength;

      // Check cache size before adding
      const currentSize = await this.getCacheSize();
      if (currentSize + size > this.MAX_CACHE_SIZE) {
        await this.evictOldest();
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(this.IMAGES_STORE);

        const cacheEntry = {
          key,
          data: Array.from(processedImageData.data), // Convert to regular array for storage
          width: processedImageData.width,
          height: processedImageData.height,
          timestamp: Date.now(),
          size,
          filter,
          params
        };

        const request = store.put(cacheEntry);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(new Error('Failed to cache image'));
        };
      });
    } catch (err) {
      // Fail silently on cache errors
    }
  }

  /**
   * Delete a cache entry
   */
  private async delete(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(this.IMAGES_STORE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete cache entry'));
    });
  }

  /**
   * Evict oldest cache entries
   */
  private async evictOldest(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(this.IMAGES_STORE);
      const index = store.index('timestamp');
      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          resolve();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        resolve();
      };
    });
  }

  /**
   * Get total cache size
   */
  private async getCacheSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.IMAGES_STORE], 'readonly');
      const store = transaction.objectStore(this.IMAGES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result || [];
        const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
        resolve(totalSize);
      };

      request.onerror = () => {
        resolve(0);
      };
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; size: number; oldestTimestamp: number }> {
    if (!this.isBrowser || !this.db) return { count: 0, size: 0, oldestTimestamp: 0 };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.IMAGES_STORE], 'readonly');
      const store = transaction.objectStore(this.IMAGES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result || [];
        const stats = {
          count: entries.length,
          size: entries.reduce((sum, entry) => sum + (entry.size || 0), 0),
          oldestTimestamp: entries.length > 0 
            ? Math.min(...entries.map(e => e.timestamp || Date.now()))
            : 0
        };
        resolve(stats);
      };

      request.onerror = () => {
        resolve({ count: 0, size: 0, oldestTimestamp: 0 });
      };
    });
  }
}
