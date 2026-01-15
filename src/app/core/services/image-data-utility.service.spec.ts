import { TestBed } from '@angular/core/testing';
import { ImageDataUtilityService } from './image-data-utility.service';
import { CanvasUtilityService } from './canvas-utility.service';

describe('ImageDataUtilityService', () => {
  let service: ImageDataUtilityService;
  let mockCanvasUtil: jasmine.SpyObj<CanvasUtilityService>;

  beforeEach(() => {
    // Create spies
    mockCanvasUtil = jasmine.createSpyObj('CanvasUtilityService', [
      'createCanvas',
      'getContext2D',
      'putImageData',
      'drawImage',
      'getImageData',
      'canvasToDataURL',
      'canvasToBlob',
      'createObjectURL',
      'revokeObjectURL',
    ]);

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        ImageDataUtilityService,
        { provide: CanvasUtilityService, useValue: mockCanvasUtil },
      ],
    });

    service = TestBed.inject(ImageDataUtilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('scaleImageData', () => {
    it('should return original ImageData when no scaling needed', () => {
      const imageData = new ImageData(100, 100);

      const result = service.scaleImageData(imageData, 200, 200);

      expect(result).toBe(imageData);
    });

    it('should scale down image that exceeds max dimensions', () => {
      const imageData = new ImageData(400, 300);
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const mockTempCanvas = document.createElement('canvas');
      const mockTempCtx = mockTempCanvas.getContext('2d')!;
      const scaledImageData = new ImageData(200, 150);

      mockCanvasUtil.createCanvas.and.returnValues(mockCanvas, mockTempCanvas);
      mockCanvasUtil.getContext2D.and.returnValues(mockCtx, mockTempCtx);
      mockCanvasUtil.getImageData.and.returnValue(scaledImageData);

      const result = service.scaleImageData(imageData, 200, 200);

      expect(result).toBe(scaledImageData);
      expect(mockCanvasUtil.createCanvas).toHaveBeenCalledWith(200, 150); // Aspect ratio preserved
      expect(mockCanvasUtil.drawImage).toHaveBeenCalled();
    });

    it('should preserve aspect ratio when scaling', () => {
      const imageData = new ImageData(800, 400); // 2:1 aspect ratio
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const mockTempCanvas = document.createElement('canvas');
      const mockTempCtx = mockTempCanvas.getContext('2d')!;

      mockCanvasUtil.createCanvas.and.returnValues(mockCanvas, mockTempCanvas);
      mockCanvasUtil.getContext2D.and.returnValues(mockCtx, mockTempCtx);
      mockCanvasUtil.getImageData.and.returnValue(new ImageData(400, 200));

      service.scaleImageData(imageData, 400, 400);

      // Should scale to 400x200 (aspect ratio preserved)
      expect(mockCanvasUtil.createCanvas).toHaveBeenCalledWith(400, 200);
    });

    it('should handle width-constrained scaling', () => {
      const imageData = new ImageData(1000, 500);
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const mockTempCanvas = document.createElement('canvas');
      const mockTempCtx = mockTempCanvas.getContext('2d')!;

      mockCanvasUtil.createCanvas.and.returnValues(mockCanvas, mockTempCanvas);
      mockCanvasUtil.getContext2D.and.returnValues(mockCtx, mockTempCtx);
      mockCanvasUtil.getImageData.and.returnValue(new ImageData(200, 100));

      service.scaleImageData(imageData, 200, 300);

      expect(mockCanvasUtil.createCanvas).toHaveBeenCalledWith(200, 100);
    });

    it('should handle height-constrained scaling', () => {
      const imageData = new ImageData(500, 1000);
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const mockTempCanvas = document.createElement('canvas');
      const mockTempCtx = mockTempCanvas.getContext('2d')!;

      mockCanvasUtil.createCanvas.and.returnValues(mockCanvas, mockTempCanvas);
      mockCanvasUtil.getContext2D.and.returnValues(mockCtx, mockTempCtx);
      mockCanvasUtil.getImageData.and.returnValue(new ImageData(100, 200));

      service.scaleImageData(imageData, 300, 200);

      expect(mockCanvasUtil.createCanvas).toHaveBeenCalledWith(100, 200);
    });
  });

  describe('imageDataToDataURL', () => {
    it('should convert ImageData to data URL', () => {
      const imageData = new ImageData(100, 100);
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const expectedDataURL = 'data:image/png;base64,abc123';

      mockCanvasUtil.createCanvas.and.returnValue(mockCanvas);
      mockCanvasUtil.getContext2D.and.returnValue(mockCtx);
      mockCanvasUtil.canvasToDataURL.and.returnValue(expectedDataURL);

      const result = service.imageDataToDataURL(imageData);

      expect(result).toBe(expectedDataURL);
      expect(mockCanvasUtil.createCanvas).toHaveBeenCalledWith(100, 100);
      expect(mockCanvasUtil.putImageData).toHaveBeenCalledWith(mockCtx, imageData, 0, 0);
    });
  });

  describe('copyImageData', () => {
    it('should create deep copy of ImageData', () => {
      const original = new ImageData(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]), 2, 1);

      const copy = service.copyImageData(original);

      expect(copy.width).toBe(original.width);
      expect(copy.height).toBe(original.height);
      expect(copy.data).not.toBe(original.data); // Different object
      expect(Array.from(copy.data)).toEqual(Array.from(original.data)); // Same values
    });

    it('should not affect original when copy is modified', () => {
      const original = new ImageData(10, 10);
      const copy = service.copyImageData(original);

      copy.data[0] = 255;

      expect(original.data[0]).not.toBe(255);
    });
  });

  describe('loadImageDataFromBlob', () => {
    it('should load ImageData from blob', async () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const mockImageData = new ImageData(100, 100);
      const mockObjectURL = 'blob:http://localhost/12345';

      mockCanvasUtil.createObjectURL.and.returnValue(mockObjectURL);
      mockCanvasUtil.createCanvas.and.returnValue(mockCanvas);
      mockCanvasUtil.getContext2D.and.returnValue(mockCtx);
      mockCanvasUtil.getImageData.and.returnValue(mockImageData);

      // Mock image loading
      const originalImage = (window as any).Image;
      (window as any).Image = class {
        onload: any;
        onerror: any;
        src: string = '';
        naturalWidth = 100;
        naturalHeight = 100;

        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      try {
        const result = await service.loadImageDataFromBlob(blob);

        expect(result).toBe(mockImageData);
        expect(mockCanvasUtil.createObjectURL).toHaveBeenCalledWith(blob);
        expect(mockCanvasUtil.revokeObjectURL).toHaveBeenCalledWith(mockObjectURL);
      } finally {
        (window as any).Image = originalImage;
      }
    });

    it('should handle image loading error', async () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      const mockObjectURL = 'blob:http://localhost/12345';

      mockCanvasUtil.createObjectURL.and.returnValue(mockObjectURL);

      // Mock image loading error
      const originalImage = (window as any).Image;
      (window as any).Image = class {
        onload: any;
        onerror: any;
        src: string = '';

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      };

      try {
        await expectAsync(service.loadImageDataFromBlob(blob)).toBeRejectedWithError(
          'Failed to load image from blob'
        );

        expect(mockCanvasUtil.revokeObjectURL).toHaveBeenCalledWith(mockObjectURL);
      } finally {
        (window as any).Image = originalImage;
      }
    });
  });

  describe('imageDataToBlob', () => {
    it('should convert ImageData to Blob', async () => {
      const imageData = new ImageData(100, 100);
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const mockBlob = new Blob(['test'], { type: 'image/png' });

      mockCanvasUtil.createCanvas.and.returnValue(mockCanvas);
      mockCanvasUtil.getContext2D.and.returnValue(mockCtx);
      mockCanvasUtil.canvasToBlob.and.returnValue(Promise.resolve(mockBlob));

      const result = await service.imageDataToBlob(imageData);

      expect(result).toBe(mockBlob);
      expect(mockCanvasUtil.putImageData).toHaveBeenCalledWith(mockCtx, imageData, 0, 0);
    });

    it('should support different MIME types', async () => {
      const imageData = new ImageData(100, 100);
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      mockCanvasUtil.createCanvas.and.returnValue(mockCanvas);
      mockCanvasUtil.getContext2D.and.returnValue(mockCtx);
      mockCanvasUtil.canvasToBlob.and.returnValue(Promise.resolve(mockBlob));

      await service.imageDataToBlob(imageData, 'image/jpeg');

      expect(mockCanvasUtil.canvasToBlob).toHaveBeenCalledWith(mockCanvas, 'image/jpeg');
    });
  });

  describe('downscaleImageData', () => {
    it('should return original when already within max dimension', () => {
      const imageData = new ImageData(100, 100);

      const result = service.downscaleImageData(imageData, 200);

      expect(result).toBe(imageData);
    });

    it('should downscale to max dimension', () => {
      const imageData = new ImageData(800, 600);
      const mockSrcCanvas = document.createElement('canvas');
      const mockSrcCtx = mockSrcCanvas.getContext('2d')!;
      const mockDstCanvas = document.createElement('canvas');
      const mockDstCtx = mockDstCanvas.getContext('2d')!;
      const downscaledImageData = new ImageData(400, 300);

      mockCanvasUtil.createCanvas.and.returnValues(mockSrcCanvas, mockDstCanvas);
      mockCanvasUtil.getContext2D.and.returnValues(mockSrcCtx, mockDstCtx);
      mockCanvasUtil.getImageData.and.returnValue(downscaledImageData);

      const result = service.downscaleImageData(imageData, 400);

      expect(result).toBe(downscaledImageData);
      expect(mockCanvasUtil.createCanvas).toHaveBeenCalledWith(800, 600); // Source canvas
      expect(mockCanvasUtil.createCanvas).toHaveBeenCalledWith(400, 300); // Destination canvas
    });

    it('should handle portrait orientation', () => {
      const imageData = new ImageData(600, 800);
      const mockSrcCanvas = document.createElement('canvas');
      const mockSrcCtx = mockSrcCanvas.getContext('2d')!;
      const mockDstCanvas = document.createElement('canvas');
      const mockDstCtx = mockDstCanvas.getContext('2d')!;
      const downscaledImageData = new ImageData(300, 400);

      mockCanvasUtil.createCanvas.and.returnValues(mockSrcCanvas, mockDstCanvas);
      mockCanvasUtil.getContext2D.and.returnValues(mockSrcCtx, mockDstCtx);
      mockCanvasUtil.getImageData.and.returnValue(downscaledImageData);

      const result = service.downscaleImageData(imageData, 400);

      expect(result).toBe(downscaledImageData);
      expect(mockCanvasUtil.createCanvas).toHaveBeenCalledWith(300, 400);
    });

    it('should handle exact match to max dimension', () => {
      const imageData = new ImageData(512, 512);

      const result = service.downscaleImageData(imageData, 512);

      expect(result).toBe(imageData);
    });
  });

  describe('edge cases', () => {
    it('should handle 1x1 ImageData', () => {
      const imageData = new ImageData(1, 1);

      const result = service.scaleImageData(imageData, 100, 100);

      expect(result).toBe(imageData); // No scaling needed
    });

    it('should handle very large dimensions', () => {
      const imageData = new ImageData(10000, 10000);
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      const mockTempCanvas = document.createElement('canvas');
      const mockTempCtx = mockTempCanvas.getContext('2d')!;
      const scaledImageData = new ImageData(100, 100);

      mockCanvasUtil.createCanvas.and.returnValues(mockCanvas, mockTempCanvas);
      mockCanvasUtil.getContext2D.and.returnValues(mockCtx, mockTempCtx);
      mockCanvasUtil.getImageData.and.returnValue(scaledImageData);

      const result = service.scaleImageData(imageData, 100, 100);

      expect(result).toBe(scaledImageData);
    });
  });
});
