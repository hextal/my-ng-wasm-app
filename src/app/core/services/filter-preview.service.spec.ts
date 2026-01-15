import { TestBed } from '@angular/core/testing';
import { FilterPreviewService } from './filter-preview.service';
import { FilterService } from './filter.service';
import { ImageDataUtilityService } from './image-data-utility.service';
import { AssetStoreService } from '../../editor/services/asset-store.service';

describe('FilterPreviewService', () => {
  let service: FilterPreviewService;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockImageDataUtil: jasmine.SpyObj<ImageDataUtilityService>;
  let mockAssetStore: jasmine.SpyObj<AssetStoreService>;

  beforeEach(() => {
    // Create spies
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'generatePreviews',
      'getPreviews',
      'hasCachedPreviews',
      'loadCachedPreviews',
      'clearPreviews',
    ]);

    mockImageDataUtil = jasmine.createSpyObj('ImageDataUtilityService', [
      'loadImageDataFromBlob',
    ]);

    mockAssetStore = jasmine.createSpyObj('AssetStoreService', ['get']);

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        FilterPreviewService,
        { provide: FilterService, useValue: mockFilterService },
        { provide: ImageDataUtilityService, useValue: mockImageDataUtil },
        { provide: AssetStoreService, useValue: mockAssetStore },
      ],
    });

    service = TestBed.inject(FilterPreviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generatePreviewsFromBlob', () => {
    it('should generate previews successfully', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockImageData = new ImageData(100, 100);

      mockImageDataUtil.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockImageData));
      mockFilterService.generatePreviews.and.returnValue(Promise.resolve());
      mockFilterService.getPreviews.and.returnValue(() => ({
        grayscale: 'data:image/png;base64,abc123',
        sepia: 'data:image/png;base64,def456',
      }));

      spyOn(console, 'log');

      await service.generatePreviewsFromBlob(mockBlob, 'asset-123');

      expect(mockImageDataUtil.loadImageDataFromBlob).toHaveBeenCalledWith(mockBlob);
      expect(mockFilterService.generatePreviews).toHaveBeenCalledWith(mockImageData, 'asset-123');
      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringContaining('STARTING FILTER PREVIEW GENERATION')
      );
      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringContaining('Total previews generated:'),
        2
      );
    });

    it('should handle blob without asset ID', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockImageData = new ImageData(100, 100);

      mockImageDataUtil.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockImageData));
      mockFilterService.generatePreviews.and.returnValue(Promise.resolve());
      mockFilterService.getPreviews.and.returnValue(() => ({
        grayscale: 'data:image/png;base64,abc123',
      }));

      await service.generatePreviewsFromBlob(mockBlob);

      expect(mockFilterService.generatePreviews).toHaveBeenCalledWith(mockImageData, undefined);
    });

    it('should warn when no previews generated', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockImageData = new ImageData(100, 100);

      mockImageDataUtil.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockImageData));
      mockFilterService.generatePreviews.and.returnValue(Promise.resolve());
      mockFilterService.getPreviews.and.returnValue(() => ({}));

      spyOn(console, 'error');

      await service.generatePreviewsFromBlob(mockBlob);

      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringContaining('WARNING: No previews were generated!')
      );
    });

    it('should handle errors during preview generation', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const error = new Error('Failed to load image');

      mockImageDataUtil.loadImageDataFromBlob.and.returnValue(Promise.reject(error));

      spyOn(console, 'error');

      await expectAsync(service.generatePreviewsFromBlob(mockBlob)).toBeRejectedWith(error);

      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringContaining('FAILED to generate filter previews'),
        error
      );
    });

    it('should log detailed information', async () => {
      const mockBlob = new Blob(['test-data'], { type: 'image/jpeg' });
      const mockImageData = new ImageData(200, 150);

      mockImageDataUtil.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockImageData));
      mockFilterService.generatePreviews.and.returnValue(Promise.resolve());
      mockFilterService.getPreviews.and.returnValue(() => ({}));

      spyOn(console, 'log');

      await service.generatePreviewsFromBlob(mockBlob, 'test-asset');

      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringContaining('Blob size:'),
        mockBlob.size,
        'bytes'
      );
      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringContaining('Blob type:'),
        'image/jpeg'
      );
      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringContaining('Asset ID:'),
        'test-asset'
      );
      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringContaining('ImageData created:'),
        200,
        'x',
        150
      );
    });
  });

  describe('generatePreviewsFromAssetId', () => {
    it('should load asset and generate previews', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockImageData = new ImageData(100, 100);

      mockAssetStore.get.and.returnValue(Promise.resolve(mockBlob));
      mockImageDataUtil.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockImageData));
      mockFilterService.generatePreviews.and.returnValue(Promise.resolve());
      mockFilterService.getPreviews.and.returnValue(() => ({
        grayscale: 'data:image/png;base64,abc',
      }));

      await service.generatePreviewsFromAssetId('asset-123');

      expect(mockAssetStore.get).toHaveBeenCalledWith('asset-123');
      expect(mockImageDataUtil.loadImageDataFromBlob).toHaveBeenCalledWith(mockBlob);
      expect(mockFilterService.generatePreviews).toHaveBeenCalledWith(mockImageData, 'asset-123');
    });

    it('should handle asset not found', async () => {
      const error = new Error('Asset not found');
      mockAssetStore.get.and.returnValue(Promise.reject(error));

      spyOn(console, 'error');

      await expectAsync(service.generatePreviewsFromAssetId('missing-asset')).toBeRejectedWith(
        error
      );

      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringContaining('Failed to generate previews for asset:'),
        'missing-asset',
        error
      );
    });
  });

  describe('hasCachedPreviews', () => {
    it('should check if cached previews exist', () => {
      mockFilterService.hasCachedPreviews.and.returnValue(true);

      const result = service.hasCachedPreviews('asset-123');

      expect(result).toBe(true);
      expect(mockFilterService.hasCachedPreviews).toHaveBeenCalledWith('asset-123');
    });

    it('should return false for non-existent cache', () => {
      mockFilterService.hasCachedPreviews.and.returnValue(false);

      const result = service.hasCachedPreviews('asset-456');

      expect(result).toBe(false);
    });
  });

  describe('loadCachedPreviews', () => {
    it('should load cached previews', () => {
      mockFilterService.loadCachedPreviews.and.returnValue(true);
      spyOn(console, 'log');

      const result = service.loadCachedPreviews('asset-123');

      expect(result).toBe(true);
      expect(mockFilterService.loadCachedPreviews).toHaveBeenCalledWith('asset-123');
      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringContaining('Loaded cached previews for assetId:'),
        'asset-123'
      );
    });

    it('should return false when cache loading fails', () => {
      mockFilterService.loadCachedPreviews.and.returnValue(false);

      const result = service.loadCachedPreviews('asset-456');

      expect(result).toBe(false);
    });
  });

  describe('hasPreviewsGenerated', () => {
    it('should return true when previews exist', () => {
      mockFilterService.getPreviews.and.returnValue(() => ({
        grayscale: 'data:image/png;base64,abc',
        sepia: 'data:image/png;base64,def',
      }));

      const result = service.hasPreviewsGenerated();

      expect(result).toBe(true);
    });

    it('should return false when no previews exist', () => {
      mockFilterService.getPreviews.and.returnValue(() => ({}));

      const result = service.hasPreviewsGenerated();

      expect(result).toBe(false);
    });
  });

  describe('clearPreviews', () => {
    it('should clear all previews', () => {
      service.clearPreviews();

      expect(mockFilterService.clearPreviews).toHaveBeenCalled();
    });
  });
});
