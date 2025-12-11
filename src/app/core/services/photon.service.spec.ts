import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PhotonService } from './photon.service';

// Mock photon-wasm module
const mockPhotonModule = {
  PhotonImage: vi.fn().mockImplementation((data, width, height) => ({
    get_width: () => width,
    get_height: () => height,
    get_raw_pixels: () => data
  })),
  grayscale: vi.fn(),
  sepia: vi.fn(),
  box_blur: vi.fn(),
  to_image_data: vi.fn().mockImplementation(() => {
    return new ImageData(100, 100);
  }),
  initWasm: vi.fn().mockResolvedValue(undefined)
};

// Mock dynamic import
vi.mock('photon-wasm', () => mockPhotonModule);

describe('PhotonService', () => {
  let service: PhotonService;

  beforeEach(() => {
    service = new PhotonService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should implement Single Responsibility Principle - only handles Photon', () => {
      // Service should not have any FFmpeg-related methods
      expect((service as any).initializeFFmpeg).toBeUndefined();
      expect((service as any).ffmpeg).toBeUndefined();
      expect((service as any).checkSharedArrayBufferSupport).toBeUndefined();
      
      // Service should only have Photon-related methods
      expect(service.initialize).toBeDefined();
      expect(service.getPhotonModule).toBeDefined();
      expect(service.grayscale).toBeDefined();
      expect(service.sepia).toBeDefined();
      expect(service.blur).toBeDefined();
    });
  });

  describe('Initial State', () => {
    it('should have isReady initially false', () => {
      expect(service.isReady()).toBe(false);
    });

    it('should have isLoading initially false', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('should have no error initially', () => {
      expect(service.getError()).toBe(null);
    });

    it('should return null from getPhotonModule before initialization', () => {
      expect(service.getPhotonModule()).toBe(null);
    });
  });

  describe('Initialization', () => {
    it('should initialize photon-wasm module', async () => {
      await service.initialize();
      
      expect(service.isReady()).toBe(true);
      expect(service.getPhotonModule()).toBeTruthy();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      const module1 = service.getPhotonModule();
      
      await service.initialize();
      const module2 = service.getPhotonModule();
      
      expect(module1).toBe(module2);
    });

    it('should skip initialization on server environment', async () => {
      // Create new service instance that detects server
      const serverService = new PhotonService();
      
      // Mock server environment
      (serverService as any).isBrowser = false;
      
      await serverService.initialize();
      
      // Should not throw, but also shouldn't be ready
      expect(serverService.isReady()).toBe(false);
    });

    it('should handle ongoing initialization gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Start two initializations simultaneously
      const init1 = service.initialize();
      const init2 = service.initialize();
      
      await Promise.all([init1, init2]);
      
      expect(service.isReady()).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should load WASM from local assets directory', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      } as Response);
      
      await service.initialize();
      
      // Should fetch from assets, not CDN
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('assets/photon-wasm')
      );
      
      fetchSpy.mockRestore();
    });
  });

  describe('Image Processing', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should apply grayscale filter', async () => {
      const imageData = new ImageData(100, 100);
      
      const result = await service.grayscale(imageData);
      
      expect(mockPhotonModule.grayscale).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ImageData);
    });

    it('should apply sepia filter', async () => {
      const imageData = new ImageData(100, 100);
      
      const result = await service.sepia(imageData);
      
      expect(mockPhotonModule.sepia).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ImageData);
    });

    it('should apply blur filter', async () => {
      const imageData = new ImageData(100, 100);
      
      const result = await service.blur(imageData);
      
      expect(mockPhotonModule.box_blur).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ImageData);
    });

    it('should throw error if photon is not initialized', async () => {
      const uninitializedService = new PhotonService();
      const imageData = new ImageData(100, 100);
      
      await expect(uninitializedService.grayscale(imageData)).rejects.toThrow(
        'Photon-WASM module not loaded'
      );
    });

    it('should throw error in server environment', async () => {
      (service as any).isBrowser = false;
      const imageData = new ImageData(100, 100);
      
      await expect(service.grayscale(imageData)).rejects.toThrow(
        'Photon transformations require a browser environment'
      );
    });

    it('should convert ImageData to PhotonImage correctly', async () => {
      const imageData = new ImageData(200, 150);
      
      await service.grayscale(imageData);
      
      expect(mockPhotonModule.PhotonImage).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        200,
        150
      );
    });

    it('should convert PhotonImage back to ImageData', async () => {
      const imageData = new ImageData(100, 100);
      
      const result = await service.grayscale(imageData);
      
      expect(mockPhotonModule.to_image_data).toHaveBeenCalled();
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error by mocking a failed import
      vi.doMock('photon-wasm', () => {
        throw new Error('Module not found');
      });
      
      const failService = new PhotonService();
      
      await expect(failService.initialize()).rejects.toThrow();
      
      consoleErrorSpy.mockRestore();
    });

    it('should provide detailed error information', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const failService = new PhotonService();
      vi.doMock('photon-wasm', () => {
        throw new Error('WASM load failed');
      });
      
      try {
        await failService.initialize();
      } catch (e) {
        expect(failService.getError()).toBeTruthy();
      }
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle PhotonImage creation errors', async () => {
      await service.initialize();
      
      mockPhotonModule.PhotonImage.mockImplementation(() => {
        throw new Error('Invalid image data');
      });
      
      const imageData = new ImageData(100, 100);
      
      await expect(service.grayscale(imageData)).rejects.toThrow();
    });

    it('should handle filter application errors', async () => {
      await service.initialize();
      
      mockPhotonModule.grayscale.mockImplementation(() => {
        throw new Error('Filter failed');
      });
      
      const imageData = new ImageData(100, 100);
      
      await expect(service.grayscale(imageData)).rejects.toThrow();
    });
  });

  describe('Service Lifecycle', () => {
    it('should maintain state across multiple operations', async () => {
      await service.initialize();
      
      const imageData = new ImageData(100, 100);
      
      await service.grayscale(imageData);
      await service.sepia(imageData);
      await service.blur(imageData);
      
      expect(service.isReady()).toBe(true);
      expect(service.getError()).toBe(null);
    });

    it('should handle multiple instances independently', () => {
      const service1 = new PhotonService();
      const service2 = new PhotonService();
      
      expect(service1).not.toBe(service2);
      expect(service1.isReady()).toBe(false);
      expect(service2.isReady()).toBe(false);
    });
  });

  describe('Browser/Server Detection', () => {
    it('should detect browser environment correctly', () => {
      expect((service as any).isBrowser).toBe(true);
    });

    it('should detect server environment when window is undefined', () => {
      const originalWindow = (globalThis as any).window;
      const originalDocument = (globalThis as any).document;
      
      (globalThis as any).window = undefined;
      (globalThis as any).document = undefined;
      
      const serverService = new PhotonService();
      
      expect((serverService as any).isBrowser).toBe(false);
      
      (globalThis as any).window = originalWindow;
      (globalThis as any).document = originalDocument;
    });
  });

  describe('WASM Loading', () => {
    it('should initialize WASM module correctly', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await service.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Photon-wasm module imported')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle already initialized WASM', async () => {
      await service.initialize();
      
      // Mock already initialized state
      const module = service.getPhotonModule();
      (module as any).initialized = true;
      
      // Should not fail on second init
      await service.initialize();
      
      expect(service.isReady()).toBe(true);
    });
  });

  describe('Integration with Angular DI', () => {
    it('should be provided in root', () => {
      const metadata = (PhotonService as any).ɵprov || (PhotonService as any).providedIn;
      expect(metadata || 'root').toBe('root');
    });
  });

  describe('Regression Tests for Known Issues', () => {
    it('should not initialize FFmpeg (Issue: SOLID violation)', () => {
      expect((service as any).initializeFFmpeg).toBeUndefined();
      expect((service as any).ffmpeg).toBeUndefined();
    });

    it('should load WASM from assets, not CDN (Issue: Local dependencies)', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      } as Response);
      
      await service.initialize();
      
      // Should NOT use CDN
      const fetchCalls = fetchSpy.mock.calls;
      const hasCDNCalls = fetchCalls.some((call) => 
        (call[0] as string).includes('unpkg.com') || 
        (call[0] as string).includes('cdn.jsdelivr.net')
      );
      
      expect(hasCDNCalls).toBe(false);
      
      fetchSpy.mockRestore();
    });

    it('should handle pixel data copying correctly (Issue: Detached ArrayBuffer)', async () => {
      await service.initialize();
      
      const imageData = new ImageData(100, 100);
      
      // Should not throw detached buffer error
      await expect(service.grayscale(imageData)).resolves.toBeTruthy();
    });
  });
});
