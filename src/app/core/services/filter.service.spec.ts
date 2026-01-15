import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterService, FilterDefinition } from './filter.service';
import { PhotonService } from './photon.service';
import { ImageDataUtilityService } from './image-data-utility.service';

// Ensure ImageData is available in test environment
if (typeof ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(widthOrData: number | Uint8ClampedArray, heightOrWidth?: number, height?: number) {
      if (typeof widthOrData === 'number') {
        this.width = widthOrData;
        this.height = heightOrWidth!;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = widthOrData;
        this.width = heightOrWidth!;
        this.height = height!;
      }
    }
  }
  
  (global as any).ImageData = ImageDataPolyfill;
  (globalThis as any).ImageData = ImageDataPolyfill;
}

describe('FilterService', () => {
  let service: FilterService;
  let mockPhotonService: Partial<PhotonService>;
  let mockImageDataUtil: Partial<ImageDataUtilityService>;

  // Test data
  let testImageData: ImageData;
  let scaledImageData: ImageData;

  beforeEach(() => {
    // Create test image data
    testImageData = new ImageData(100, 100);
    scaledImageData = new ImageData(50, 50);

    // Create mock services with vi.fn()
    mockPhotonService = {
      filter: vi.fn().mockResolvedValue(testImageData)
    };

    mockImageDataUtil = {
      scaleImageData: vi.fn().mockReturnValue(scaledImageData),
      imageDataToDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
      copyImageData: vi.fn().mockReturnValue(testImageData)
    };

    // Create service instance with mocks
    service = new FilterService(
      mockPhotonService as PhotonService,
      mockImageDataUtil as ImageDataUtilityService
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('filterList', () => {
    it('should have 30 filters including original', () => {
      expect(service.filterList.length).toBe(30);
    });

    it('should have original as first filter', () => {
      expect(service.filterList[0].id).toBe('original');
      expect(service.filterList[0].method).toBe('none');
    });

    it('should have all filters with required properties', () => {
      service.filterList.forEach(filter => {
        expect(filter.id).toBeDefined();
        expect(filter.name).toBeDefined();
        expect(filter.method).toBeDefined();
      });
    });

    it('should have unique filter IDs', () => {
      const ids = service.filterList.map(f => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Signal Getters', () => {
    it('should return filter previews signal', () => {
      const previews = service.getPreviews();
      expect(previews()).toEqual({});
    });

    it('should return loading state signal', () => {
      const loading = service.isLoadingPreviews();
      expect(loading()).toBe(false);
    });

    it('should return active filter ID signal', () => {
      const activeId = service.getActiveFilterId();
      expect(activeId()).toBe('original');
    });
  });

  describe('setActiveFilterId', () => {
    it('should set active filter ID', () => {
      service.setActiveFilterId('sepia');
      expect(service.getActiveFilterId()()).toBe('sepia');
    });

    it('should update signal reactively', () => {
      const activeId = service.getActiveFilterId();
      service.setActiveFilterId('vintage');
      expect(activeId()).toBe('vintage');
    });
  });

  describe('generatePreviews', () => {
    it('should not generate previews if already loading', async () => {
      // Start first generation
      const promise1 = service.generatePreviews(testImageData);
      
      // Try to start second generation while loading
      const promise2 = service.generatePreviews(testImageData);
      
      await promise1;
      await promise2;
      
      // scaleImageData should only be called once
      expect(mockImageDataUtil.scaleImageData).toHaveBeenCalledTimes(1);
    });

    it('should scale image data for preview generation', async () => {
      await service.generatePreviews(testImageData);
      
      expect(mockImageDataUtil.scaleImageData).toHaveBeenCalledWith(
        testImageData,
        200, // THUMBNAIL_PREVIEW.DEFAULT_SIZE
        200
      );
    });

    it('should set loading state during generation', async () => {
      const loadingSignal = service.isLoadingPreviews();
      expect(loadingSignal()).toBe(false);
      
      const promise = service.generatePreviews(testImageData);
      expect(loadingSignal()).toBe(true);
      
      await promise;
      expect(loadingSignal()).toBe(false);
    });

    it('should clear previous previews before generation', async () => {
      // Generate first time
      await service.generatePreviews(testImageData);
      const firstPreviews = service.getPreviews()();
      expect(Object.keys(firstPreviews).length).toBeGreaterThan(0);
      
      // Generate second time - loading state should be set
      const loadingBefore = service.isLoadingPreviews()();
      expect(loadingBefore).toBe(false); // Should be false after first generation
      
      const promise = service.generatePreviews(testImageData);
      const loadingDuring = service.isLoadingPreviews()();
      expect(loadingDuring).toBe(true); // Should be true during second generation
      
      await promise;
      const loadingAfter = service.isLoadingPreviews()();
      expect(loadingAfter).toBe(false); // Should be false after completion
    });

    it('should generate previews for all filters', async () => {
      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      expect(Object.keys(previews).length).toBe(30);
      
      // Verify all filter IDs have previews
      service.filterList.forEach(filter => {
        expect(previews[filter.id]).toBeDefined();
      });
    });

    it('should use original image for "original" filter', async () => {
      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      expect(previews['original']).toBe('data:image/png;base64,test');
      
      // Should not call photonService.filter for original
      const filterMock = mockPhotonService.filter as any;
      const filterCalls = filterMock.mock.calls;
      const originalCall = filterCalls.find((call: any) => call[1] === 'none');
      expect(originalCall).toBeUndefined();
    });

    it('should call photonService.filter for non-original filters', async () => {
      await service.generatePreviews(testImageData);
      
      // Should be called for all non-original filters (29 times)
      expect(mockPhotonService.filter).toHaveBeenCalledTimes(29);
    });

    it('should pass correct filter method to photonService', async () => {
      await service.generatePreviews(testImageData);
      
      const filterCalls = mockPhotonService.filter.mock.calls;
      
      // Verify sepia filter was called with correct method
      const sepiaCall = filterCalls.find((call: any) => call[1] === 'sepia');
      expect(sepiaCall).toBeDefined();
      
      // Verify vintage filter was called with correct method
      const vintageCall = filterCalls.find((call: any) => call[1] === 'vintage');
      expect(vintageCall).toBeDefined();
    });

    it('should copy image data before applying filter', async () => {
      await service.generatePreviews(testImageData);
      
      // Should copy scaled image data for each non-original filter
      expect(mockImageDataUtil.copyImageData).toHaveBeenCalledWith(scaledImageData);
      expect(mockImageDataUtil.copyImageData).toHaveBeenCalledTimes(29); // 29 non-original filters
    });

    it('should convert filtered image data to data URL', async () => {
      await service.generatePreviews(testImageData);
      
      // Should be called for original + all filtered images
      expect(mockImageDataUtil.imageDataToDataURL).toHaveBeenCalledTimes(30);
    });

    it('should handle filter errors gracefully', async () => {
      // Make one filter fail
      mockPhotonService.filter.mockImplementation((imageData: ImageData, method: string) => {
        if (method === 'sepia') {
          return Promise.reject(new Error('Filter failed'));
        }
        return Promise.resolve(testImageData);
      });

      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      
      // Should still have preview for sepia (fallback to original)
      expect(previews['sepia']).toBe('data:image/png;base64,test');
      
      // Should have previews for all other filters
      expect(Object.keys(previews).length).toBe(30);
    });

    it('should handle preview generation errors gracefully', async () => {
      // Make imageDataToDataURL throw error for one filter
      let callCount = 0;
      mockImageDataUtil.imageDataToDataURL.mockImplementation(() => {
        callCount++;
        if (callCount === 5) { // Fail on 5th call
          throw new Error('DataURL conversion failed');
        }
        return 'data:image/png;base64,test';
      });

      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      
      // Should still have previews (with fallback)
      expect(Object.keys(previews).length).toBe(30);
    });

    it('should handle complete generation failure', async () => {
      mockImageDataUtil.scaleImageData.mockImplementation(() => {
        throw new Error('Scaling failed');
      });

      await service.generatePreviews(testImageData);
      
      const previews = service.getPreviews()();
      expect(Object.keys(previews).length).toBe(0);
      expect(service.isLoadingPreviews()()).toBe(false);
    });
  });

  describe('applyFilter', () => {
    const testFilter: FilterDefinition = {
      id: 'sepia',
      name: 'Sepia',
      method: 'sepia'
    };

    it('should apply filter using photonService', async () => {
      await service.applyFilter(testImageData, testFilter);
      
      expect(mockPhotonService.filter).toHaveBeenCalledWith(testImageData, 'sepia');
    });

    it('should return filtered image data', async () => {
      const filteredData = new ImageData(100, 100);
      mockPhotonService.filter.mockResolvedValue(filteredData);
      
      const result = await service.applyFilter(testImageData, testFilter);
      
      expect(result).toBe(filteredData);
    });

    it('should copy image data for original filter', async () => {
      const originalFilter: FilterDefinition = {
        id: 'original',
        name: 'Original',
        method: 'none'
      };
      
      await service.applyFilter(testImageData, originalFilter);
      
      expect(mockImageDataUtil.copyImageData).toHaveBeenCalledWith(testImageData);
      expect(mockPhotonService.filter).not.toHaveBeenCalled();
    });

    it('should handle different filter methods', async () => {
      const vintageFilter: FilterDefinition = {
        id: 'vintage',
        name: 'Vintage',
        method: 'vintage'
      };
      
      await service.applyFilter(testImageData, vintageFilter);
      
      expect(mockPhotonService.filter).toHaveBeenCalledWith(testImageData, 'vintage');
    });
  });

  describe('getFilterById', () => {
    it('should return filter by ID', () => {
      const filter = service.getFilterById('sepia');
      
      expect(filter).toBeDefined();
      expect(filter?.id).toBe('sepia');
      expect(filter?.method).toBe('sepia');
    });

    it('should return undefined for non-existent filter', () => {
      const filter = service.getFilterById('nonexistent');
      
      expect(filter).toBeUndefined();
    });

    it('should return original filter', () => {
      const filter = service.getFilterById('original');
      
      expect(filter).toBeDefined();
      expect(filter?.method).toBe('none');
    });
  });

  describe('resetFilter', () => {
    it('should reset active filter to original', () => {
      service.setActiveFilterId('sepia');
      expect(service.getActiveFilterId()()).toBe('sepia');
      
      service.resetFilter();
      expect(service.getActiveFilterId()()).toBe('original');
    });

    it('should work when already on original', () => {
      service.resetFilter();
      expect(service.getActiveFilterId()()).toBe('original');
      
      // Should not throw error
      service.resetFilter();
      expect(service.getActiveFilterId()()).toBe('original');
    });
  });

  describe('clearPreviews', () => {
    it('should clear all preview data', async () => {
      await service.generatePreviews(testImageData);
      expect(Object.keys(service.getPreviews()()).length).toBe(30);
      
      service.clearPreviews();
      expect(service.getPreviews()()).toEqual({});
    });

    it('should reset active filter to original', async () => {
      await service.generatePreviews(testImageData);
      service.setActiveFilterId('sepia');
      
      service.clearPreviews();
      expect(service.getActiveFilterId()()).toBe('original');
    });

    it('should work when previews are empty', () => {
      service.clearPreviews();
      expect(service.getPreviews()()).toEqual({});
      expect(service.getActiveFilterId()()).toBe('original');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow: generate -> select -> apply -> reset', async () => {
      // Generate previews
      await service.generatePreviews(testImageData);
      expect(Object.keys(service.getPreviews()()).length).toBe(30);
      
      // Select filter
      service.setActiveFilterId('sepia');
      expect(service.getActiveFilterId()()).toBe('sepia');
      
      // Apply filter
      const filter = service.getFilterById('sepia')!;
      await service.applyFilter(testImageData, filter);
      expect(mockPhotonService.filter).toHaveBeenCalledWith(testImageData, 'sepia');
      
      // Reset
      service.resetFilter();
      expect(service.getActiveFilterId()()).toBe('original');
    });

    it('should handle multiple preview generations', async () => {
      // First generation
      await service.generatePreviews(testImageData);
      const firstPreviews = service.getPreviews()();
      expect(Object.keys(firstPreviews).length).toBe(30);
      
      // Second generation with new image
      const newImageData = new ImageData(200, 200);
      await service.generatePreviews(newImageData);
      const secondPreviews = service.getPreviews()();
      expect(Object.keys(secondPreviews).length).toBe(30);
      
      // Should have called scaleImageData twice
      expect(mockImageDataUtil.scaleImageData).toHaveBeenCalledTimes(2);
    });

    it('should maintain consistency between signals', async () => {
      const previewsSignal = service.getPreviews();
      const loadingSignal = service.isLoadingPreviews();
      const activeIdSignal = service.getActiveFilterId();
      
      // Initial state
      expect(Object.keys(previewsSignal()).length).toBe(0);
      expect(loadingSignal()).toBe(false);
      expect(activeIdSignal()).toBe('original');
      
      // After generation
      await service.generatePreviews(testImageData);
      expect(Object.keys(previewsSignal()).length).toBe(30);
      expect(loadingSignal()).toBe(false);
      
      // After selection
      service.setActiveFilterId('vintage');
      expect(activeIdSignal()).toBe('vintage');
      
      // After clear
      service.clearPreviews();
      expect(Object.keys(previewsSignal()).length).toBe(0);
      expect(activeIdSignal()).toBe('original');
    });
  });
});
