import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterManagementService } from './filter-management.service';
import { PhotonFiltersService } from './photon-filters.service';
import { ImageDataUtilityService } from '../../core/services/image-data-utility.service';
import { CanvasUtilityService } from '../../core/services/canvas-utility.service';
import * as fabric from 'fabric';
import { filters } from 'fabric';

// Polyfill ImageData for tests
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

describe('FilterManagementService', () => {
  let service: FilterManagementService;
  let mockPhotonFilters: any;
  let mockImageDataUtil: any;
  let mockCanvasUtil: any;
  let mockCanvas: any;

  beforeEach(() => {
    // Mock PhotonFiltersService
    mockPhotonFilters = {
      applyFilter: vi.fn().mockResolvedValue(new Blob()),
      getAvailableFilters: vi.fn().mockReturnValue(['grayscale', 'sepia', 'blur']),
      previewFilter: vi.fn().mockResolvedValue(new Blob()),
    };

    // Mock ImageDataUtilityService
    mockImageDataUtil = {
      imageDataToBlob: vi.fn().mockResolvedValue(new Blob()),
      loadImageDataFromBlob: vi.fn().mockResolvedValue(new MockImageData(100, 100)),
    };

    // Mock CanvasUtilityService
    mockCanvasUtil = {
      getContext2D: vi.fn().mockReturnValue({
        getImageData: vi.fn(),
        putImageData: vi.fn(),
      } as any),
      getImageData: vi.fn().mockReturnValue(new MockImageData(100, 100)),
      putImageData: vi.fn(),
    };

    service = new FilterManagementService(
      mockPhotonFilters,
      mockImageDataUtil,
      mockCanvasUtil
    );

    // Mock canvas
    mockCanvas = {
      getActiveObject: vi.fn(),
      requestRenderAll: vi.fn(),
      getElement: vi.fn().mockReturnValue({
        width: 800,
        height: 600,
      } as HTMLCanvasElement),
    };
  });

  describe('applyPhotonFilter', () => {
    it('should apply filter to selected image', async () => {
      const mockImage = Object.create(fabric.Image.prototype);
      mockImage.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc');
      mockImage.setElement = vi.fn();
      mockImage.set = vi.fn();

      mockCanvas.getActiveObject.mockReturnValue(mockImage);
      
      // Mock fetch for dataURLToBlob
      global.fetch = vi.fn().mockResolvedValue({
        blob: vi.fn().mockResolvedValue(new Blob()),
      } as any);

      // Mock Image constructor
      const mockImageElement = { onload: null, onerror: null, src: '' };
      global.Image = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockImageElement.onload) mockImageElement.onload(null as any);
        }, 0);
        return mockImageElement;
      }) as any;

      await service.applyPhotonFilter(mockCanvas, 'grayscale');

      expect(mockImage.toDataURL).toHaveBeenCalled();
      expect(mockPhotonFilters.applyFilter).toHaveBeenCalledWith(
        expect.any(Blob),
        'grayscale',
        undefined
      );
      expect(mockImage.setElement).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should apply filter to entire canvas when no image selected', async () => {
      mockCanvas.getActiveObject.mockReturnValue(null);

      await service.applyPhotonFilter(mockCanvas, 'sepia', { intensity: 50 });

      expect(mockCanvasUtil.getImageData).toHaveBeenCalled();
      expect(mockImageDataUtil.imageDataToBlob).toHaveBeenCalled();
      expect(mockPhotonFilters.applyFilter).toHaveBeenCalledWith(
        expect.any(Blob),
        'sepia',
        { intensity: 50 }
      );
      expect(mockCanvasUtil.putImageData).toHaveBeenCalled();
    });

    it('should throw error if canvas is not initialized', async () => {
      await expect(service.applyPhotonFilter(null as any, 'grayscale')).rejects.toThrow(
        'Canvas not initialized'
      );
    });
  });

  describe('getAvailableFilters', () => {
    it('should return list of available filters', () => {
      const filters = service.getAvailableFilters();

      expect(filters).toEqual(['grayscale', 'sepia', 'blur']);
      expect(mockPhotonFilters.getAvailableFilters).toHaveBeenCalled();
    });
  });

  describe('generateFilterPreview', () => {
    it('should generate filter preview', async () => {
      const mockBlob = new Blob();
      const result = await service.generateFilterPreview(mockBlob, 'vintage');

      expect(mockPhotonFilters.previewFilter).toHaveBeenCalledWith(
        mockBlob,
        'vintage',
        undefined
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it('should pass parameters to preview filter', async () => {
      const mockBlob = new Blob();
      await service.generateFilterPreview(mockBlob, 'blur', { radius: 10 });

      expect(mockPhotonFilters.previewFilter).toHaveBeenCalledWith(
        mockBlob,
        'blur',
        { radius: 10 }
      );
    });
  });

  describe('applyBrightnessFilter', () => {
    let mockImage: any;

    beforeEach(() => {
      mockImage = Object.create(fabric.Image.prototype);
      mockImage.filters = [];
      mockImage.applyFilters = vi.fn();
      mockCanvas.getActiveObject.mockReturnValue(mockImage);
    });

    it('should apply brightness filter to selected image', () => {
      service.applyBrightnessFilter(mockCanvas, 0.5);

      expect(mockImage.filters.length).toBe(1);
      expect(mockImage.filters[0]).toBeInstanceOf(filters.Brightness);
      expect(mockImage.applyFilters).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should remove existing brightness filter before adding new one', () => {
      mockImage.filters = [
        new filters.Brightness({ brightness: 0.3 }),
        new filters.Contrast({ contrast: 0.2 }),
      ];

      service.applyBrightnessFilter(mockCanvas, 0.7);

      const brightnessFilters = mockImage.filters.filter(
        (f: any) => f.type === 'Brightness'
      );
      expect(brightnessFilters.length).toBe(1);
      expect(mockImage.filters.some((f: any) => f.type === 'Contrast')).toBe(true);
    });

    it('should not add filter if brightness is 0 (neutral)', () => {
      service.applyBrightnessFilter(mockCanvas, 0);

      expect(mockImage.filters.length).toBe(0);
      expect(mockImage.applyFilters).toHaveBeenCalled();
    });

    it('should handle null canvas gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.applyBrightnessFilter(null as any, 0.5);

      expect(consoleSpy).toHaveBeenCalledWith('Canvas not initialized');
      consoleSpy.mockRestore();
    });

    it('should handle no selection gracefully', () => {
      mockCanvas.getActiveObject.mockReturnValue(null);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.applyBrightnessFilter(mockCanvas, 0.5);

      expect(consoleSpy).toHaveBeenCalledWith('No image selected');
      consoleSpy.mockRestore();
    });

    it('should initialize filters array if not present', () => {
      mockImage.filters = undefined;

      service.applyBrightnessFilter(mockCanvas, 0.5);

      expect(Array.isArray(mockImage.filters)).toBe(true);
      expect(mockImage.filters.length).toBe(1);
    });
  });

  describe('applyContrastFilter', () => {
    let mockImage: any;

    beforeEach(() => {
      mockImage = Object.create(fabric.Image.prototype);
      mockImage.filters = [];
      mockImage.applyFilters = vi.fn();
      mockCanvas.getActiveObject.mockReturnValue(mockImage);
    });

    it('should apply contrast filter to selected image', () => {
      service.applyContrastFilter(mockCanvas, 0.4);

      expect(mockImage.filters.length).toBe(1);
      expect(mockImage.filters[0]).toBeInstanceOf(filters.Contrast);
      expect(mockImage.applyFilters).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should remove existing contrast filter before adding new one', () => {
      mockImage.filters = [
        new filters.Contrast({ contrast: 0.2 }),
        new filters.Brightness({ brightness: 0.3 }),
      ];

      service.applyContrastFilter(mockCanvas, 0.6);

      const contrastFilters = mockImage.filters.filter(
        (f: any) => f.type === 'Contrast'
      );
      expect(contrastFilters.length).toBe(1);
    });

    it('should not add filter if contrast is 0 (neutral)', () => {
      service.applyContrastFilter(mockCanvas, 0);

      expect(mockImage.filters.length).toBe(0);
      expect(mockImage.applyFilters).toHaveBeenCalled();
    });
  });

  describe('applySaturationFilter', () => {
    let mockImage: any;

    beforeEach(() => {
      mockImage = Object.create(fabric.Image.prototype);
      mockImage.filters = [];
      mockImage.applyFilters = vi.fn();
      mockCanvas.getActiveObject.mockReturnValue(mockImage);
    });

    it('should apply saturation filter to selected image', () => {
      service.applySaturationFilter(mockCanvas, -0.5);

      expect(mockImage.filters.length).toBe(1);
      expect(mockImage.filters[0]).toBeInstanceOf(filters.Saturation);
      expect(mockImage.applyFilters).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should remove existing saturation filter before adding new one', () => {
      mockImage.filters = [new filters.Saturation({ saturation: 0.2 })];

      service.applySaturationFilter(mockCanvas, 0.8);

      const saturationFilters = mockImage.filters.filter(
        (f: any) => f.type === 'Saturation'
      );
      expect(saturationFilters.length).toBe(1);
    });

    it('should not add filter if saturation is 0 (neutral)', () => {
      service.applySaturationFilter(mockCanvas, 0);

      expect(mockImage.filters.length).toBe(0);
    });
  });

  describe('applyHueRotationFilter', () => {
    let mockImage: any;

    beforeEach(() => {
      mockImage = Object.create(fabric.Image.prototype);
      mockImage.filters = [];
      mockImage.applyFilters = vi.fn();
      mockCanvas.getActiveObject.mockReturnValue(mockImage);
    });

    it('should apply hue rotation filter to selected image', () => {
      service.applyHueRotationFilter(mockCanvas, 0.5);

      expect(mockImage.filters.length).toBe(1);
      expect(mockImage.filters[0]).toBeInstanceOf(filters.HueRotation);
      expect(mockImage.applyFilters).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should convert rotation value to radians', () => {
      service.applyHueRotationFilter(mockCanvas, 1);

      const hueFilter = mockImage.filters[0] as any;
      expect(hueFilter.rotation).toBeCloseTo(Math.PI, 5);
    });

    it('should handle negative rotation values', () => {
      service.applyHueRotationFilter(mockCanvas, -0.5);

      const hueFilter = mockImage.filters[0] as any;
      expect(hueFilter.rotation).toBeCloseTo(-Math.PI / 2, 5);
    });

    it('should not add filter if rotation is 0 (neutral)', () => {
      service.applyHueRotationFilter(mockCanvas, 0);

      expect(mockImage.filters.length).toBe(0);
    });
  });

  describe('resetAllFilters', () => {
    let mockImage: any;

    beforeEach(() => {
      mockImage = Object.create(fabric.Image.prototype);
      mockImage.filters = [
        new filters.Brightness({ brightness: 0.5 }),
        new filters.Contrast({ contrast: 0.3 }),
        new filters.Saturation({ saturation: 0.2 }),
      ];
      mockImage.applyFilters = vi.fn();
      mockCanvas.getActiveObject.mockReturnValue(mockImage);
    });

    it('should clear all filters from image', () => {
      service.resetAllFilters(mockCanvas);

      expect(mockImage.filters.length).toBe(0);
      expect(mockImage.applyFilters).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should handle null canvas gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.resetAllFilters(null as any);

      expect(consoleSpy).toHaveBeenCalledWith('Canvas not initialized');
      consoleSpy.mockRestore();
    });

    it('should handle no selection gracefully', () => {
      mockCanvas.getActiveObject.mockReturnValue(null);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.resetAllFilters(mockCanvas);

      expect(consoleSpy).toHaveBeenCalledWith('No image selected');
      consoleSpy.mockRestore();
    });
  });

  describe('multiple filter combinations', () => {
    let mockImage: any;

    beforeEach(() => {
      mockImage = Object.create(fabric.Image.prototype);
      mockImage.filters = [];
      mockImage.applyFilters = vi.fn();
      mockCanvas.getActiveObject.mockReturnValue(mockImage);
    });

    it('should support applying multiple different filters', () => {
      service.applyBrightnessFilter(mockCanvas, 0.3);
      service.applyContrastFilter(mockCanvas, 0.2);
      service.applySaturationFilter(mockCanvas, -0.1);

      expect(mockImage.filters.length).toBe(3);
      expect(mockImage.filters.some((f: any) => f.type === 'Brightness')).toBe(true);
      expect(mockImage.filters.some((f: any) => f.type === 'Contrast')).toBe(true);
      expect(mockImage.filters.some((f: any) => f.type === 'Saturation')).toBe(true);
    });

    it('should preserve other filters when updating one filter type', () => {
      service.applyBrightnessFilter(mockCanvas, 0.3);
      service.applyContrastFilter(mockCanvas, 0.2);

      // Update brightness again
      service.applyBrightnessFilter(mockCanvas, 0.5);

      expect(mockImage.filters.length).toBe(2);
      expect(mockImage.filters.some((f: any) => f.type === 'Contrast')).toBe(true);
    });
  });
});
