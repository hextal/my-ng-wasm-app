import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DownloadService } from './download.service';
import { MagickService } from './magick.service';

describe('DownloadService', () => {
  let service: DownloadService;
  let mockMagickService: Partial<MagickService>;

  beforeEach(() => {
    // Create mock MagickService
    mockMagickService = {
      isPhotonCompatible: vi.fn(),
      getMimeType: vi.fn(),
      convertFormat: vi.fn(),
      uint8ArrayToBlob: vi.fn(),
      getFileNameWithoutExtension: vi.fn()
    };

    service = new DownloadService(mockMagickService as MagickService);
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have all formats defined', () => {
      expect(service.allFormats.length).toBe(5);
      expect(service.allFormats[0].value).toBe('png');
      expect(service.allFormats[1].value).toBe('jpg');
      expect(service.allFormats[2].value).toBe('bmp');
      expect(service.allFormats[3].value).toBe('webp');
      expect(service.allFormats[4].value).toBe('tiff');
    });
  });

  describe('getAvailableFormats', () => {
    it('should return all formats', () => {
      const formats = service.getAvailableFormats();
      expect(formats.length).toBe(5);
    });

    it('should return a copy, not the original array', () => {
      const formats = service.getAvailableFormats();
      expect(formats).not.toBe(service.allFormats);
      expect(formats).toEqual(service.allFormats);
    });
  });

  describe('generateFileName', () => {
    it('should generate filename with correct extension', () => {
      vi.mocked(mockMagickService.getFileNameWithoutExtension).mockReturnValue('image');
      
      const fileName = service.generateFileName('image.png', 'jpg');
      
      expect(fileName).toBe('image.jpg');
      expect(mockMagickService.getFileNameWithoutExtension).toHaveBeenCalledWith('image.png');
    });

    it('should use default name when no original filename provided', () => {
      vi.mocked(mockMagickService.getFileNameWithoutExtension).mockReturnValue('edited-image');
      
      const fileName = service.generateFileName('', 'png');
      
      expect(fileName).toBe('edited-image.png');
    });

    it('should handle different formats', () => {
      vi.mocked(mockMagickService.getFileNameWithoutExtension).mockReturnValue('photo');
      
      expect(service.generateFileName('photo.jpg', 'webp')).toBe('photo.webp');
      expect(service.generateFileName('photo.jpg', 'tiff')).toBe('photo.tiff');
      expect(service.generateFileName('photo.jpg', 'bmp')).toBe('photo.bmp');
    });
  });

  describe('triggerDownload', () => {
    it('should create download link and trigger click', () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockURL = 'blob:test-url';
      
      // Mock URL methods
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockURL);
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      
      // Mock anchor element
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      
      service.triggerDownload(mockBlob, 'test.png');
      
      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(mockAnchor.href).toBe(mockURL);
      expect(mockAnchor.download).toBe('test.png');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockURL);
      
      // Cleanup
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('convertCanvasToBlob', () => {
    let mockCanvas: any;

    beforeEach(() => {
      mockCanvas = {
        toBlob: vi.fn()
      };
    });

    it('should convert PNG format directly', async () => {
      const mockPngBlob = new Blob(['png'], { type: 'image/png' });
      
      mockCanvas.toBlob.mockImplementation((callback: any) => {
        callback(mockPngBlob);
      });

      const result = await service.convertCanvasToBlob(mockCanvas, 'png');
      
      expect(result.blob).toBe(mockPngBlob);
      expect(result.extension).toBe('png');
      expect(mockCanvas.toBlob).toHaveBeenCalledTimes(1);
    });

    it('should handle Photon-compatible formats', async () => {
      const mockPngBlob = new Blob(['png'], { type: 'image/png' });
      const mockJpgBlob = new Blob(['jpg'], { type: 'image/jpeg' });
      
      let callCount = 0;
      mockCanvas.toBlob.mockImplementation((callback: any, mimeType: string) => {
        callCount++;
        if (callCount === 1) {
          callback(mockPngBlob);
        } else {
          callback(mockJpgBlob);
        }
      });
      
      vi.mocked(mockMagickService.isPhotonCompatible).mockReturnValue(true);
      vi.mocked(mockMagickService.getMimeType).mockReturnValue('image/jpeg');

      const result = await service.convertCanvasToBlob(mockCanvas, 'jpg');
      
      expect(result.blob).toBe(mockJpgBlob);
      expect(result.extension).toBe('jpg');
      expect(mockMagickService.isPhotonCompatible).toHaveBeenCalledWith('jpg');
      expect(mockMagickService.getMimeType).toHaveBeenCalledWith('jpg');
    });

    it('should handle non-Photon formats with MagickService', async () => {
      const mockPngBlob = new Blob(['png'], { type: 'image/png' });
      const mockConvertedData = new Uint8Array([1, 2, 3]);
      const mockWebpBlob = new Blob(['webp'], { type: 'image/webp' });
      
      mockCanvas.toBlob.mockImplementation((callback: any) => {
        callback(mockPngBlob);
      });
      
      vi.mocked(mockMagickService.isPhotonCompatible).mockReturnValue(false);
      vi.mocked(mockMagickService.convertFormat).mockResolvedValue(mockConvertedData);
      vi.mocked(mockMagickService.getMimeType).mockReturnValue('image/webp');
      vi.mocked(mockMagickService.uint8ArrayToBlob).mockReturnValue(mockWebpBlob);

      const result = await service.convertCanvasToBlob(mockCanvas, 'webp');
      
      expect(result.blob).toBe(mockWebpBlob);
      expect(result.extension).toBe('webp');
      expect(mockMagickService.convertFormat).toHaveBeenCalled();
      expect(mockMagickService.uint8ArrayToBlob).toHaveBeenCalledWith(mockConvertedData, 'image/webp');
    });

    it('should throw error when PNG blob generation fails', async () => {
      mockCanvas.toBlob.mockImplementation((callback: any) => {
        callback(null);
      });

      await expect(service.convertCanvasToBlob(mockCanvas, 'png')).rejects.toThrow(
        'Failed to generate image data'
      );
    });

    it('should throw error when format blob generation fails', async () => {
      const mockPngBlob = new Blob(['png'], { type: 'image/png' });
      
      let callCount = 0;
      mockCanvas.toBlob.mockImplementation((callback: any) => {
        callCount++;
        if (callCount === 1) {
          callback(mockPngBlob);
        } else {
          callback(null);
        }
      });
      
      vi.mocked(mockMagickService.isPhotonCompatible).mockReturnValue(true);
      vi.mocked(mockMagickService.getMimeType).mockReturnValue('image/jpeg');

      await expect(service.convertCanvasToBlob(mockCanvas, 'jpg')).rejects.toThrow(
        'Failed to generate JPG data'
      );
    });
  });

  describe('downloadCanvas', () => {
    let mockCanvas: any;

    beforeEach(() => {
      mockCanvas = {
        toBlob: vi.fn()
      };
    });

    it('should perform complete download workflow', async () => {
      const mockPngBlob = new Blob(['png'], { type: 'image/png' });
      const mockURL = 'blob:test-url';
      
      mockCanvas.toBlob.mockImplementation((callback: any) => {
        callback(mockPngBlob);
      });
      
      vi.mocked(mockMagickService.getFileNameWithoutExtension).mockReturnValue('photo');
      
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockURL);
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      await service.downloadCanvas(mockCanvas, 'photo.png', 'png');
      
      expect(mockMagickService.getFileNameWithoutExtension).toHaveBeenCalledWith('photo.png');
      expect(mockAnchor.download).toBe('photo.png');
      expect(mockAnchor.click).toHaveBeenCalled();
      
      // Cleanup
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should handle conversion and download for non-PNG format', async () => {
      const mockPngBlob = new Blob(['png'], { type: 'image/png' });
      const mockConvertedData = new Uint8Array([1, 2, 3]);
      const mockWebpBlob = new Blob(['webp'], { type: 'image/webp' });
      
      mockCanvas.toBlob.mockImplementation((callback: any) => {
        callback(mockPngBlob);
      });
      
      vi.mocked(mockMagickService.isPhotonCompatible).mockReturnValue(false);
      vi.mocked(mockMagickService.convertFormat).mockResolvedValue(mockConvertedData);
      vi.mocked(mockMagickService.getMimeType).mockReturnValue('image/webp');
      vi.mocked(mockMagickService.uint8ArrayToBlob).mockReturnValue(mockWebpBlob);
      vi.mocked(mockMagickService.getFileNameWithoutExtension).mockReturnValue('image');
      
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      await service.downloadCanvas(mockCanvas, 'image.png', 'webp');
      
      expect(mockAnchor.download).toBe('image.webp');
      expect(mockMagickService.convertFormat).toHaveBeenCalled();
      
      // Cleanup
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });
});
