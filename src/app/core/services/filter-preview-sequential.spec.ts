import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterService } from './filter.service';
import { PhotonService } from './photon.service';
import { CanvasService } from './canvas.service';

// Polyfill ImageData for Node.js test environment
if (typeof ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(widthOrData: number | Uint8ClampedArray, heightOrWidth?: number, height?: number) {
      if (typeof widthOrData === 'number') {
        // new ImageData(width, height)
        this.width = widthOrData;
        this.height = heightOrWidth!;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        // new ImageData(data, width, height)
        this.data = widthOrData;
        this.width = heightOrWidth!;
        this.height = height!;
      }
    }
  };
}

/**
 * CRITICAL REGRESSION TESTS
 * 
 * These tests ensure that filter preview generation remains SEQUENTIAL
 * and does not regress to parallel processing, which causes thumbnail corruption.
 * 
 * Background: Previously, filters were generated in parallel using Promise.all(),
 * which caused WASM state corruption leading to all thumbnails showing the same
 * image. This was fixed by switching to sequential generation.
 * 
 * These tests MUST pass to ensure the bug does not reoccur.
 */
describe('FilterService - Sequential Preview Generation (Regression Tests)', () => {
  let service: FilterService;
  let mockPhotonService: any;
  let mockCanvasService: any;
  let filterCallOrder: string[];
  let filterCallTimestamps: number[];

  beforeEach(() => {
    filterCallOrder = [];
    filterCallTimestamps = [];

    // Mock CanvasService
    mockCanvasService = {
      scaleImageData: vi.fn((imgData: ImageData) => {
        // Return a new scaled image with copied data
        const scaled = new ImageData(200, 200);
        // Copy some data to preserve uniqueness
        const copyLength = Math.min(imgData.data.length, scaled.data.length);
        for (let i = 0; i < copyLength; i++) {
          scaled.data[i] = imgData.data[i];
        }
        return scaled;
      }),
      copyImageData: vi.fn((imgData: ImageData) => {
        const copy = new ImageData(imgData.width, imgData.height);
        // Actually copy the data
        for (let i = 0; i < imgData.data.length; i++) {
          copy.data[i] = imgData.data[i];
        }
        return copy;
      }),
      imageDataToDataURL: vi.fn((imgData: ImageData) => {
        // Return unique data URL based on comprehensive image data hash
        // Use more data points and include dimensions for better uniqueness
        const checksum = Array.from(imgData.data.slice(0, 1000)).reduce((a, b) => a + b, 0);
        const hash1 = Array.from(imgData.data.slice(0, 50)).join(',');
        const hash2 = Array.from(imgData.data.slice(imgData.data.length - 50)).join(',');
        const dimensionHash = `${imgData.width}x${imgData.height}`;
        return `data:image/png;base64,${dimensionHash}-checksum${checksum}-start${hash1}-end${hash2}`;
      })
    };

    // Mock PhotonService that tracks call order and simulates async processing
    mockPhotonService = {
      filter: vi.fn(async (imageData: ImageData, filterName: string) => {
        const startTime = Date.now();
        filterCallOrder.push(filterName);
        filterCallTimestamps.push(startTime);
        
        // Simulate async processing delay
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Return unique ImageData for each filter
        const result = new ImageData(imageData.width, imageData.height);
        
        // Modify data to make it TRULY unique per filter using filter name hash
        // Create a unique signature based on filter name characters
        let filterHash = 0;
        for (let i = 0; i < filterName.length; i++) {
          filterHash = filterName.charCodeAt(i) + ((filterHash << 5) - filterHash);
        }
        const modifier = Math.abs(filterHash) % 200 + 10; // Unique modifier per filter (10-210)
        
        for (let i = 0; i < result.data.length; i += 4) {
          result.data[i] = (imageData.data[i] + modifier) % 256;
          result.data[i + 1] = (imageData.data[i + 1] + modifier * 2) % 256;
          result.data[i + 2] = (imageData.data[i + 2] + modifier * 3) % 256;
          result.data[i + 3] = 255;
        }
        
        return result;
      })
    };

    service = new FilterService(mockPhotonService, mockCanvasService);
  });

  describe('Sequential Execution', () => {
    it('should call filters sequentially, not in parallel', async () => {
      const testImageData = new ImageData(100, 100);
      
      await service.generatePreviews(testImageData);
      
      // Verify filters were called in order
      expect(filterCallOrder.length).toBeGreaterThan(0);
      
      // Check that timestamps show sequential execution (no overlapping calls)
      for (let i = 1; i < filterCallTimestamps.length; i++) {
        const timeDiff = filterCallTimestamps[i] - filterCallTimestamps[i - 1];
        // Each filter should start AFTER the previous one finishes (>= 10ms delay)
        expect(timeDiff).toBeGreaterThanOrEqual(8); // Allow small margin
      }
    });

    it('should complete each filter before starting the next', async () => {
      const testImageData = new ImageData(100, 100);
      let activeFilterCount = 0;
      let maxConcurrentFilters = 0;

      mockPhotonService.filter = vi.fn(async (imageData: ImageData, filterName: string) => {
        activeFilterCount++;
        maxConcurrentFilters = Math.max(maxConcurrentFilters, activeFilterCount);
        
        await new Promise(resolve => setTimeout(resolve, 5));
        
        activeFilterCount--;
        
        const result = new ImageData(imageData.width, imageData.height);
        return result;
      });

      await service.generatePreviews(testImageData);
      
      // Should never have more than 1 filter processing at a time
      expect(maxConcurrentFilters).toBe(1);
    });
  });

  describe('Unique Preview Generation', () => {
    it('should generate unique data URLs for each filter', async () => {
      const testImageData = new ImageData(100, 100);
      
      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      const dataURLs = Object.values(previews);
      
      // Check that we have multiple previews
      expect(dataURLs.length).toBeGreaterThan(1);
      
      // Check that data URLs are unique (no duplicates except 'original')
      const uniqueDataURLs = new Set(dataURLs);
      
      // Should have at least 90% unique thumbnails (some filters might produce similar results)
      const uniqueRatio = uniqueDataURLs.size / dataURLs.length;
      expect(uniqueRatio).toBeGreaterThanOrEqual(0.9);
    });

    it('should not reuse the same preview for multiple filters', async () => {
      const testImageData = new ImageData(100, 100);
      
      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      
      // Get non-original filters
      const nonOriginalPreviews = Object.entries(previews)
        .filter(([id]) => id !== 'original')
        .map(([_, url]) => url);
      
      // Count occurrences of each URL
      const urlCounts = nonOriginalPreviews.reduce((acc, url) => {
        acc[url] = (acc[url] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // No URL should appear more than 3 times (allowing for some legitimate similarity)
      const maxOccurrences = Math.max(...Object.values(urlCounts));
      expect(maxOccurrences).toBeLessThanOrEqual(3);
    });
  });

  describe('Multiple Image Test (Regression)', () => {
    it('should generate different previews for different images', async () => {
      // This specifically tests the bug where second image showed cached results from first
      
      // Generate previews for first image
      const firstImage = new ImageData(100, 100);
      // Fill with specific pattern
      for (let i = 0; i < firstImage.data.length; i += 4) {
        firstImage.data[i] = 255;     // R
        firstImage.data[i + 1] = 0;   // G
        firstImage.data[i + 2] = 0;   // B
        firstImage.data[i + 3] = 255; // A
      }
      
      await service.generatePreviews(firstImage);
      const firstPreviews = service.getPreviews()();
      const firstPreviewURLs = Object.values(firstPreviews);
      
      // Clear and generate for second image
      service.clearPreviews();
      
      const secondImage = new ImageData(100, 100);
      // Fill with different pattern
      for (let i = 0; i < secondImage.data.length; i += 4) {
        secondImage.data[i] = 0;       // R
        secondImage.data[i + 1] = 255; // G
        secondImage.data[i + 2] = 0;   // B
        secondImage.data[i + 3] = 255; // A
      }
      
      await service.generatePreviews(secondImage);
      const secondPreviews = service.getPreviews()();
      const secondPreviewURLs = Object.values(secondPreviews);
      
      // Previews should be different for different images
      expect(firstPreviewURLs.length).toBeGreaterThan(0);
      expect(secondPreviewURLs.length).toBeGreaterThan(0);
      
      // At least 80% of previews should be different between images
      let differentCount = 0;
      const filterIds = Object.keys(firstPreviews);
      
      for (const id of filterIds) {
        if (firstPreviews[id] !== secondPreviews[id]) {
          differentCount++;
        }
      }
      
      const differentRatio = differentCount / filterIds.length;
      expect(differentRatio).toBeGreaterThan(0.8);
    });

    it('should generate different aspect ratio previews correctly', async () => {
      // Test with square image (200x200)
      const squareImage = new ImageData(200, 200);
      // Fill with specific pattern
      for (let i = 0; i < squareImage.data.length; i += 4) {
        squareImage.data[i] = 100;     // R
        squareImage.data[i + 1] = 150; // G
        squareImage.data[i + 2] = 200; // B
        squareImage.data[i + 3] = 255; // A
      }
      await service.generatePreviews(squareImage);
      const squarePreviews = service.getPreviews()();
      
      service.clearPreviews();
      
      // Test with rectangular image (200x133) - different dimensions mean different data length
      const rectImage = new ImageData(200, 133);
      // Fill with same pattern (but different data length due to dimensions)
      for (let i = 0; i < rectImage.data.length; i += 4) {
        rectImage.data[i] = 100;       // R
        rectImage.data[i + 1] = 150;   // G
        rectImage.data[i + 2] = 200;   // B
        rectImage.data[i + 3] = 255;   // A
      }
      await service.generatePreviews(rectImage);
      const rectPreviews = service.getPreviews()();
      
      // Should have same number of previews
      expect(Object.keys(squarePreviews).length).toBe(Object.keys(rectPreviews).length);
      
      // But different content
      const filterIds = Object.keys(squarePreviews);
      let differentCount = 0;
      
      for (const id of filterIds) {
        if (id !== 'original' && squarePreviews[id] !== rectPreviews[id]) {
          differentCount++;
        }
      }
      
      // At least 80% should be different
      expect(differentCount / (filterIds.length - 1)).toBeGreaterThan(0.8);
    });
  });

  describe('Progressive Updates', () => {
    it('should update preview signal progressively as filters complete', async () => {
      const testImageData = new ImageData(100, 100);
      const snapshotCounts: number[] = [];
      
      // Track how many previews are available at different points
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        const currentPreviews = service.getPreviews()();
        snapshotCounts.push(Object.keys(currentPreviews).length);
        checkCount++;
        
        if (checkCount > 10) {
          clearInterval(checkInterval);
        }
      }, 10);
      
      await service.generatePreviews(testImageData);
      clearInterval(checkInterval);
      
      // Should have progressive increases (not all at once)
      const hasProgression = snapshotCounts.some((count, i) => 
        i > 0 && count > snapshotCounts[i - 1] && count < service.filterList.length
      );
      
      expect(hasProgression).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should continue processing other filters if one fails', async () => {
      const testImageData = new ImageData(100, 100);
      let callCount = 0;
      
      mockPhotonService.filter = vi.fn(async (imageData: ImageData, filterName: string) => {
        callCount++;
        
        // Make the 5th filter fail
        if (callCount === 5) {
          throw new Error('Filter processing failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, 5));
        return new ImageData(imageData.width, imageData.height);
      });
      
      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      
      // Should have previews for all filters except the failed one (or it gets fallback)
      expect(Object.keys(previews).length).toBe(service.filterList.length);
      
      // Should have processed all filters despite the failure
      expect(callCount).toBe(service.filterList.length - 1); // -1 for 'original'
    });

    it('should use original preview as fallback for failed filters', async () => {
      const testImageData = new ImageData(100, 100);
      
      mockPhotonService.filter = vi.fn(async (imageData: ImageData, filterName: string) => {
        if (filterName === 'sepia') {
          throw new Error('Sepia filter failed');
        }
        
        return new ImageData(imageData.width, imageData.height);
      });
      
      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      const originalURL = previews['original'];
      const sepiaURL = previews['sepia'];
      
      // Failed filter should fall back to original
      expect(sepiaURL).toBe(originalURL);
    });
  });

  describe('Memory Management', () => {
    it('should create fresh copies of image data for each filter', async () => {
      const testImageData = new ImageData(100, 100);
      
      await service.generatePreviews(testImageData);
      
      // copyImageData should be called once for each non-original filter
      const nonOriginalFilters = service.filterList.filter(f => f.method !== 'none');
      expect(mockCanvasService.copyImageData).toHaveBeenCalledTimes(nonOriginalFilters.length);
    });

    it('should not mutate the scaled image data across filters', async () => {
      const testImageData = new ImageData(100, 100);
      let scaledImageReference: ImageData | null = null;
      
      mockCanvasService.copyImageData = vi.fn((imgData: ImageData) => {
        if (!scaledImageReference) {
          scaledImageReference = imgData;
        }
        
        // Verify we're copying the same scaled image each time
        expect(imgData).toBe(scaledImageReference);
        
        return new ImageData(imgData.width, imgData.height);
      });
      
      await service.generatePreviews(testImageData);
      
      // Verify copies were made
      expect(mockCanvasService.copyImageData).toHaveBeenCalled();
    });
  });
});
