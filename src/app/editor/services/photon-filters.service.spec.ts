import { TestBed } from '@angular/core/testing';
import { PhotonFiltersService } from './photon-filters.service';
import { PhotonService } from '../../core/services/photon.service';
import { ImageDataUtilityService } from '../../core/services/image-data-utility.service';

describe('PhotonFiltersService', () => {
  let service: PhotonFiltersService;
  let photonServiceSpy: jasmine.SpyObj<PhotonService>;
  let imageDataUtilSpy: jasmine.SpyObj<ImageDataUtilityService>;

  const createMockImageData = (width: number = 100, height: number = 100): ImageData => {
    return new ImageData(width, height);
  };

  const createMockBlob = (): Blob => {
    return new Blob(['mock-image-data'], { type: 'image/png' });
  };

  beforeEach(() => {
    const photonSpyObj = jasmine.createSpyObj('PhotonService', [
      'initialize',
      'grayscale',
      'grayscale_human_corrected',
      'desaturate',
      'sepia',
      'box_blur',
      'gaussian_blur',
      'sharpen',
      'edge_detection',
      'emboss',
      'inc_brightness',
      'oil',
      'pixelize',
      'threshold',
      'solarize',
      'hue_rotate_hsl',
      'hue_rotate_hsv',
    ]);

    const imageDataUtilSpyObj = jasmine.createSpyObj('ImageDataUtilityService', [
      'loadImageDataFromBlob',
      'imageDataToBlob',
      'downscaleImageData',
    ]);

    TestBed.configureTestingModule({
      providers: [
        PhotonFiltersService,
        { provide: PhotonService, useValue: photonSpyObj },
        { provide: ImageDataUtilityService, useValue: imageDataUtilSpyObj },
      ],
    });

    service = TestBed.inject(PhotonFiltersService);
    photonServiceSpy = TestBed.inject(PhotonService) as jasmine.SpyObj<PhotonService>;
    imageDataUtilSpy = TestBed.inject(ImageDataUtilityService) as jasmine.SpyObj<ImageDataUtilityService>;

    // Default spy behavior
    photonServiceSpy.initialize.and.returnValue(Promise.resolve());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('applyFilter', () => {
    beforeEach(() => {
      const mockInputImageData = createMockImageData();
      const mockOutputImageData = createMockImageData();
      const mockOutputBlob = createMockBlob();

      imageDataUtilSpy.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockInputImageData));
      imageDataUtilSpy.imageDataToBlob.and.returnValue(Promise.resolve(mockOutputBlob));

      // Default filter responses
      photonServiceSpy.grayscale.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.grayscale_human_corrected.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.desaturate.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.sepia.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.box_blur.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.gaussian_blur.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.sharpen.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.edge_detection.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.emboss.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.inc_brightness.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.oil.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.pixelize.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.threshold.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.solarize.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.hue_rotate_hsl.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.hue_rotate_hsv.and.returnValue(Promise.resolve(mockOutputImageData));
    });

    it('should initialize Photon service before applying filter', async () => {
      const blob = createMockBlob();
      await service.applyFilter(blob, 'grayscale');

      expect(photonServiceSpy.initialize).toHaveBeenCalled();
    });

    it('should load image data from blob', async () => {
      const blob = createMockBlob();
      await service.applyFilter(blob, 'grayscale');

      expect(imageDataUtilSpy.loadImageDataFromBlob).toHaveBeenCalledWith(blob);
    });

    it('should convert result back to blob', async () => {
      const blob = createMockBlob();
      await service.applyFilter(blob, 'grayscale');

      expect(imageDataUtilSpy.imageDataToBlob).toHaveBeenCalled();
    });

    describe('monochrome filters', () => {
      it('should apply grayscale filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'grayscale');

        expect(photonServiceSpy.grayscale).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply grayscale_human_corrected filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'grayscale_human_corrected');

        expect(photonServiceSpy.grayscale_human_corrected).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply desaturate filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'desaturate');

        expect(photonServiceSpy.desaturate).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply sepia filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'sepia');

        expect(photonServiceSpy.sepia).toHaveBeenCalled();
        expect(result).toBeDefined();
      });
    });

    describe('convolution filters', () => {
      it('should apply box_blur filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'box_blur');

        expect(photonServiceSpy.box_blur).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply blur filter (alias for box_blur)', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'blur');

        expect(photonServiceSpy.box_blur).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply gaussian_blur filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'gaussian_blur');

        expect(photonServiceSpy.gaussian_blur).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply sharpen filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'sharpen');

        expect(photonServiceSpy.sharpen).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply edge_detection filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'edge_detection');

        expect(photonServiceSpy.edge_detection).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply emboss filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'emboss');

        expect(photonServiceSpy.emboss).toHaveBeenCalled();
        expect(result).toBeDefined();
      });
    });

    describe('filters with parameters', () => {
      it('should apply inc_brightness with default parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'inc_brightness');

        expect(photonServiceSpy.inc_brightness).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          10 // default brightness
        );
        expect(result).toBeDefined();
      });

      it('should apply inc_brightness with custom parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'inc_brightness', { brightness: 25 });

        expect(photonServiceSpy.inc_brightness).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          25
        );
        expect(result).toBeDefined();
      });

      it('should apply oil filter with default parameters', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'oil');

        expect(photonServiceSpy.oil).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          4, // default radius
          55 // default intensity
        );
        expect(result).toBeDefined();
      });

      it('should apply oil filter with custom parameters', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'oil', { radius: 8, intensity: 80 });

        expect(photonServiceSpy.oil).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          8,
          80
        );
        expect(result).toBeDefined();
      });

      it('should apply pixelize filter with default parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'pixelize');

        expect(photonServiceSpy.pixelize).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          10 // default pixel size
        );
        expect(result).toBeDefined();
      });

      it('should apply pixelize filter with custom parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'pixelize', { pixelSize: 20 });

        expect(photonServiceSpy.pixelize).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          20
        );
        expect(result).toBeDefined();
      });

      it('should apply threshold filter with default parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'threshold');

        expect(photonServiceSpy.threshold).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          128 // default threshold
        );
        expect(result).toBeDefined();
      });

      it('should apply threshold filter with custom parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'threshold', { threshold: 64 });

        expect(photonServiceSpy.threshold).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          64
        );
        expect(result).toBeDefined();
      });

      it('should apply solarize filter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'solarize');

        expect(photonServiceSpy.solarize).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should apply hue_rotate_hsl filter with default parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'hue_rotate_hsl');

        expect(photonServiceSpy.hue_rotate_hsl).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          0 // default degrees
        );
        expect(result).toBeDefined();
      });

      it('should apply hue_rotate_hsl filter with custom parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'hue_rotate_hsl', { degrees: 90 });

        expect(photonServiceSpy.hue_rotate_hsl).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          90
        );
        expect(result).toBeDefined();
      });

      it('should apply hue_rotate_hsv filter with default parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'hue_rotate_hsv');

        expect(photonServiceSpy.hue_rotate_hsv).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          0 // default degrees
        );
        expect(result).toBeDefined();
      });

      it('should apply hue_rotate_hsv filter with custom parameter', async () => {
        const blob = createMockBlob();
        const result = await service.applyFilter(blob, 'hue_rotate_hsv', { degrees: 180 });

        expect(photonServiceSpy.hue_rotate_hsv).toHaveBeenCalledWith(
          jasmine.any(ImageData),
          180
        );
        expect(result).toBeDefined();
      });
    });

    it('should throw error for unsupported filter', async () => {
      const blob = createMockBlob();

      await expectAsync(
        service.applyFilter(blob, 'unknown_filter')
      ).toBeRejectedWithError('Unsupported filter: unknown_filter');
    });

    it('should handle Photon initialization error', async () => {
      photonServiceSpy.initialize.and.returnValue(Promise.reject(new Error('Photon init failed')));

      const blob = createMockBlob();

      await expectAsync(
        service.applyFilter(blob, 'grayscale')
      ).toBeRejectedWithError('Photon init failed');
    });

    it('should handle image loading error', async () => {
      imageDataUtilSpy.loadImageDataFromBlob.and.returnValue(
        Promise.reject(new Error('Failed to load image'))
      );

      const blob = createMockBlob();

      await expectAsync(
        service.applyFilter(blob, 'grayscale')
      ).toBeRejectedWithError('Failed to load image');
    });

    it('should handle filter processing error', async () => {
      photonServiceSpy.grayscale.and.returnValue(
        Promise.reject(new Error('Filter processing failed'))
      );

      const blob = createMockBlob();

      await expectAsync(
        service.applyFilter(blob, 'grayscale')
      ).toBeRejectedWithError('Filter processing failed');
    });

    it('should handle blob conversion error', async () => {
      imageDataUtilSpy.imageDataToBlob.and.returnValue(
        Promise.reject(new Error('Blob conversion failed'))
      );

      const blob = createMockBlob();

      await expectAsync(
        service.applyFilter(blob, 'grayscale')
      ).toBeRejectedWithError('Blob conversion failed');
    });
  });

  describe('previewFilter', () => {
    beforeEach(() => {
      const mockInputImageData = createMockImageData(2000, 1500);
      const mockDownscaledImageData = createMockImageData(512, 384);
      const mockOutputImageData = createMockImageData(512, 384);
      const mockPreviewBlob = createMockBlob();
      const mockFinalBlob = createMockBlob();

      imageDataUtilSpy.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockInputImageData));
      imageDataUtilSpy.downscaleImageData.and.returnValue(mockDownscaledImageData);
      imageDataUtilSpy.imageDataToBlob.and.returnValues(
        Promise.resolve(mockPreviewBlob),
        Promise.resolve(mockFinalBlob)
      );

      photonServiceSpy.grayscale.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.sepia.and.returnValue(Promise.resolve(mockOutputImageData));
      photonServiceSpy.inc_brightness.and.returnValue(Promise.resolve(mockOutputImageData));
    });

    it('should load and downscale image for preview', async () => {
      const blob = createMockBlob();
      await service.previewFilter(blob, 'grayscale');

      expect(imageDataUtilSpy.loadImageDataFromBlob).toHaveBeenCalledWith(blob);
      expect(imageDataUtilSpy.downscaleImageData).toHaveBeenCalledWith(
        jasmine.any(ImageData),
        512 // default max dimension
      );
    });

    it('should use custom max dimension for preview', async () => {
      const blob = createMockBlob();
      await service.previewFilter(blob, 'grayscale', undefined, 256);

      expect(imageDataUtilSpy.downscaleImageData).toHaveBeenCalledWith(
        jasmine.any(ImageData),
        256
      );
    });

    it('should apply filter to downscaled image', async () => {
      const blob = createMockBlob();
      const result = await service.previewFilter(blob, 'grayscale');

      expect(photonServiceSpy.grayscale).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should apply filter with parameters to preview', async () => {
      const blob = createMockBlob();
      const result = await service.previewFilter(blob, 'inc_brightness', { brightness: 30 });

      expect(photonServiceSpy.inc_brightness).toHaveBeenCalledWith(
        jasmine.any(ImageData),
        30
      );
      expect(result).toBeDefined();
    });

    it('should handle preview generation error', async () => {
      imageDataUtilSpy.downscaleImageData.and.throwError('Downscale failed');

      const blob = createMockBlob();

      await expectAsync(
        service.previewFilter(blob, 'grayscale')
      ).toBeRejected();
    });
  });

  describe('getAvailableFilters', () => {
    it('should return list of available filters', () => {
      const filters = service.getAvailableFilters();

      expect(filters).toBeDefined();
      expect(filters.length).toBeGreaterThan(0);
    });

    it('should include filter names and display names', () => {
      const filters = service.getAvailableFilters();

      filters.forEach((filter) => {
        expect(filter.name).toBeDefined();
        expect(filter.displayName).toBeDefined();
        expect(typeof filter.hasParams).toBe('boolean');
      });
    });

    it('should include grayscale filter', () => {
      const filters = service.getAvailableFilters();
      const grayscale = filters.find((f) => f.name === 'grayscale');

      expect(grayscale).toBeDefined();
      expect(grayscale!.displayName).toBe('Grayscale');
      expect(grayscale!.hasParams).toBe(false);
    });

    it('should include sepia filter', () => {
      const filters = service.getAvailableFilters();
      const sepia = filters.find((f) => f.name === 'sepia');

      expect(sepia).toBeDefined();
      expect(sepia!.displayName).toBe('Sepia');
      expect(sepia!.hasParams).toBe(false);
    });

    it('should include blur filter', () => {
      const filters = service.getAvailableFilters();
      const blur = filters.find((f) => f.name === 'blur');

      expect(blur).toBeDefined();
      expect(blur!.displayName).toBe('Blur');
      expect(blur!.hasParams).toBe(false);
    });

    it('should include filters with parameters', () => {
      const filters = service.getAvailableFilters();
      const brightness = filters.find((f) => f.name === 'inc_brightness');

      expect(brightness).toBeDefined();
      expect(brightness!.displayName).toBe('Brightness');
      expect(brightness!.hasParams).toBe(true);
      expect(brightness!.params).toBeDefined();
      expect(brightness!.params!.length).toBe(1);
      expect(brightness!.params![0].name).toBe('brightness');
      expect(brightness!.params![0].type).toBe('number');
      expect(brightness!.params![0].default).toBe(10);
    });

    it('should include oil filter with multiple parameters', () => {
      const filters = service.getAvailableFilters();
      const oil = filters.find((f) => f.name === 'oil');

      expect(oil).toBeDefined();
      expect(oil!.displayName).toBe('Oil Painting');
      expect(oil!.hasParams).toBe(true);
      expect(oil!.params).toBeDefined();
      expect(oil!.params!.length).toBe(2);
      expect(oil!.params![0].name).toBe('radius');
      expect(oil!.params![1].name).toBe('intensity');
    });

    it('should include pixelize filter', () => {
      const filters = service.getAvailableFilters();
      const pixelize = filters.find((f) => f.name === 'pixelize');

      expect(pixelize).toBeDefined();
      expect(pixelize!.displayName).toBe('Pixelize');
      expect(pixelize!.hasParams).toBe(true);
    });

    it('should include threshold filter', () => {
      const filters = service.getAvailableFilters();
      const threshold = filters.find((f) => f.name === 'threshold');

      expect(threshold).toBeDefined();
      expect(threshold!.displayName).toBe('Threshold');
      expect(threshold!.hasParams).toBe(true);
    });

    it('should include hue rotation filter', () => {
      const filters = service.getAvailableFilters();
      const hueRotate = filters.find((f) => f.name === 'hue_rotate_hsl');

      expect(hueRotate).toBeDefined();
      expect(hueRotate!.displayName).toBe('Hue Rotate (HSL)');
      expect(hueRotate!.hasParams).toBe(true);
    });

    it('should return consistent filter list on multiple calls', () => {
      const filters1 = service.getAvailableFilters();
      const filters2 = service.getAvailableFilters();

      expect(filters1.length).toBe(filters2.length);
      expect(filters1[0].name).toBe(filters2[0].name);
    });
  });

  describe('edge cases', () => {
    it('should handle null blob gracefully', async () => {
      imageDataUtilSpy.loadImageDataFromBlob.and.returnValue(
        Promise.reject(new Error('Invalid blob'))
      );

      await expectAsync(
        service.applyFilter(null as any, 'grayscale')
      ).toBeRejected();
    });

    it('should handle empty filter name', async () => {
      const blob = createMockBlob();

      await expectAsync(
        service.applyFilter(blob, '')
      ).toBeRejectedWithError('Unsupported filter: ');
    });

    it('should handle null parameters object', async () => {
      const mockImageData = createMockImageData();
      imageDataUtilSpy.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockImageData));
      photonServiceSpy.inc_brightness.and.returnValue(Promise.resolve(mockImageData));
      imageDataUtilSpy.imageDataToBlob.and.returnValue(Promise.resolve(createMockBlob()));

      const blob = createMockBlob();
      await service.applyFilter(blob, 'inc_brightness', null);

      // Should use default brightness value
      expect(photonServiceSpy.inc_brightness).toHaveBeenCalledWith(jasmine.any(ImageData), 10);
    });

    it('should handle zero maxDimension in preview', async () => {
      const mockImageData = createMockImageData();
      const mockDownscaledImageData = createMockImageData(0, 0);

      imageDataUtilSpy.loadImageDataFromBlob.and.returnValue(Promise.resolve(mockImageData));
      imageDataUtilSpy.downscaleImageData.and.returnValue(mockDownscaledImageData);
      imageDataUtilSpy.imageDataToBlob.and.returnValue(Promise.resolve(createMockBlob()));
      photonServiceSpy.grayscale.and.returnValue(Promise.resolve(mockDownscaledImageData));

      const blob = createMockBlob();
      await service.previewFilter(blob, 'grayscale', undefined, 0);

      expect(imageDataUtilSpy.downscaleImageData).toHaveBeenCalledWith(
        jasmine.any(ImageData),
        0
      );
    });

    it('should handle very small images', async () => {
      const tinyImageData = createMockImageData(1, 1);
      imageDataUtilSpy.loadImageDataFromBlob.and.returnValue(Promise.resolve(tinyImageData));
      photonServiceSpy.grayscale.and.returnValue(Promise.resolve(tinyImageData));
      imageDataUtilSpy.imageDataToBlob.and.returnValue(Promise.resolve(createMockBlob()));

      const blob = createMockBlob();
      const result = await service.applyFilter(blob, 'grayscale');

      expect(result).toBeDefined();
    });

    it('should handle very large images', async () => {
      const largeImageData = createMockImageData(8000, 6000);
      imageDataUtilSpy.loadImageDataFromBlob.and.returnValue(Promise.resolve(largeImageData));
      photonServiceSpy.grayscale.and.returnValue(Promise.resolve(largeImageData));
      imageDataUtilSpy.imageDataToBlob.and.returnValue(Promise.resolve(createMockBlob()));

      const blob = createMockBlob();
      const result = await service.applyFilter(blob, 'grayscale');

      expect(result).toBeDefined();
    });
  });
});
