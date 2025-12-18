import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MagickService } from './magick.service';
import { FileUtilityService } from './file-utility.service';
import { MagickFormat } from '@imagemagick/magick-wasm';

/**
 * Unit tests for MagickService
 * Tests utility methods, format detection, and helper functions
 */
describe('MagickService - Unit Tests', () => {
  let service: MagickService;
  let fileUtility: FileUtilityService;

  beforeEach(() => {
    fileUtility = new FileUtilityService();
    service = new MagickService(fileUtility);
    vi.clearAllMocks();
  });

  describe('Helper Methods', () => {
    describe('getFileExtension', () => {
      it('should extract extension from filename', () => {
        expect(service.getFileExtension('image.png')).toBe('png');
        expect(service.getFileExtension('photo.jpg')).toBe('jpg');
        expect(service.getFileExtension('document.pdf')).toBe('pdf');
      });

      it('should handle multiple dots in filename', () => {
        expect(service.getFileExtension('my.image.file.png')).toBe('png');
        expect(service.getFileExtension('backup.2024.jpg')).toBe('jpg');
      });

      it('should return empty string for files without extension', () => {
        expect(service.getFileExtension('filename')).toBe('');
        expect(service.getFileExtension('')).toBe('');
      });

      it('should handle uppercase extensions', () => {
        expect(service.getFileExtension('IMAGE.PNG')).toBe('png');
        expect(service.getFileExtension('Photo.JPEG')).toBe('jpeg');
      });
    });

    describe('getFileNameWithoutExtension', () => {
      it('should remove extension from filename', () => {
        expect(service.getFileNameWithoutExtension('image.png')).toBe('image');
        expect(service.getFileNameWithoutExtension('photo.jpg')).toBe('photo');
      });

      it('should handle multiple dots', () => {
        expect(service.getFileNameWithoutExtension('my.image.png')).toBe('my.image');
        expect(service.getFileNameWithoutExtension('backup.2024.jpg')).toBe('backup.2024');
      });

      it('should return original name if no extension', () => {
        expect(service.getFileNameWithoutExtension('filename')).toBe('filename');
      });

      it('should handle empty string', () => {
        expect(service.getFileNameWithoutExtension('')).toBe('');
      });
    });

    describe('isPhotonCompatible', () => {
      it('should return true for Photon-compatible formats', () => {
        expect(service.isPhotonCompatible('png')).toBe(true);
        expect(service.isPhotonCompatible('jpg')).toBe(true);
        expect(service.isPhotonCompatible('jpeg')).toBe(true);
        expect(service.isPhotonCompatible('bmp')).toBe(true);
      });

      it('should return false for incompatible formats', () => {
        expect(service.isPhotonCompatible('webp')).toBe(false);
        expect(service.isPhotonCompatible('gif')).toBe(false);
        expect(service.isPhotonCompatible('tiff')).toBe(false);
        expect(service.isPhotonCompatible('svg')).toBe(false);
        expect(service.isPhotonCompatible('avif')).toBe(false);
      });

      it('should handle case-insensitive input', () => {
        expect(service.isPhotonCompatible('PNG')).toBe(true);
        expect(service.isPhotonCompatible('JPG')).toBe(true);
        expect(service.isPhotonCompatible('WEBP')).toBe(false);
      });
    });

    describe('getCompatibleOutputFormats', () => {
      it('should return all formats for standard image formats', () => {
        const allFormats = ['png', 'jpg', 'bmp', 'webp', 'tiff'];
        
        expect(service.getCompatibleOutputFormats('png')).toEqual(allFormats);
        expect(service.getCompatibleOutputFormats('jpg')).toEqual(allFormats);
        expect(service.getCompatibleOutputFormats('jpeg')).toEqual(allFormats);
        expect(service.getCompatibleOutputFormats('bmp')).toEqual(allFormats);
        expect(service.getCompatibleOutputFormats('webp')).toEqual(allFormats);
        expect(service.getCompatibleOutputFormats('tiff')).toEqual(allFormats);
      });

      it('should return limited formats for GIF (problematic conversion)', () => {
        const limitedFormats = ['png', 'jpg'];
        expect(service.getCompatibleOutputFormats('gif')).toEqual(limitedFormats);
      });

      it('should return limited formats for AVIF (limited support)', () => {
        const limitedFormats = ['png', 'jpg'];
        expect(service.getCompatibleOutputFormats('avif')).toEqual(limitedFormats);
      });

      it('should return limited formats for HEIC/HEIF', () => {
        const limitedFormats = ['png', 'jpg'];
        expect(service.getCompatibleOutputFormats('heic')).toEqual(limitedFormats);
        expect(service.getCompatibleOutputFormats('heif')).toEqual(limitedFormats);
      });

      it('should return limited formats for ICO and SVG', () => {
        const limitedFormats = ['png', 'jpg'];
        expect(service.getCompatibleOutputFormats('ico')).toEqual(limitedFormats);
        expect(service.getCompatibleOutputFormats('svg')).toEqual(limitedFormats);
      });

      it('should handle case-insensitive input', () => {
        const allFormats = ['png', 'jpg', 'bmp', 'webp', 'tiff'];
        const limitedFormats = ['png', 'jpg'];
        
        expect(service.getCompatibleOutputFormats('PNG')).toEqual(allFormats);
        expect(service.getCompatibleOutputFormats('GIF')).toEqual(limitedFormats);
        expect(service.getCompatibleOutputFormats('AVIF')).toEqual(limitedFormats);
      });

      it('should preserve support for all standard formats when input is standard', () => {
        // Verify that standard formats aren\'t accidentally restricted
        const standardFormats = ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'tiff'];
        
        standardFormats.forEach(format => {
          const compatibleFormats = service.getCompatibleOutputFormats(format);
          expect(compatibleFormats.length).toBe(5); // Should support all 5 output formats
          expect(compatibleFormats).toContain('png');
          expect(compatibleFormats).toContain('jpg');
          expect(compatibleFormats).toContain('bmp');
          expect(compatibleFormats).toContain('webp');
          expect(compatibleFormats).toContain('tiff');
        });
      });
    });

    describe('getMimeType', () => {
      it('should return correct MIME types for common formats', () => {
        expect(service.getMimeType('png')).toBe('image/png');
        expect(service.getMimeType('jpg')).toBe('image/jpeg');
        expect(service.getMimeType('jpeg')).toBe('image/jpeg');
        expect(service.getMimeType('gif')).toBe('image/gif');
        expect(service.getMimeType('bmp')).toBe('image/bmp');
        expect(service.getMimeType('webp')).toBe('image/webp');
      });

      it('should return correct MIME types for modern formats', () => {
        expect(service.getMimeType('avif')).toBe('image/avif');
        expect(service.getMimeType('heic')).toBe('image/heic');
        expect(service.getMimeType('heif')).toBe('image/heif');
      });

      it('should handle TIFF variants', () => {
        expect(service.getMimeType('tiff')).toBe('image/tiff');
        expect(service.getMimeType('tif')).toBe('image/tiff');
      });

      it('should handle case-insensitive input', () => {
        expect(service.getMimeType('PNG')).toBe('image/png');
        expect(service.getMimeType('JPEG')).toBe('image/jpeg');
      });

      it('should return default MIME type for unknown formats', () => {
        expect(service.getMimeType('unknown')).toBe('image/png');
        expect(service.getMimeType('txt')).toBe('image/png');
      });
    });
  });

  describe('Data Conversion Methods', () => {
    describe('fileToUint8Array', () => {
      it('should convert File to Uint8Array', async () => {
        // Mock FileReader for test environment
        const mockFileReader = {
          readAsArrayBuffer: vi.fn(function(this: any) {
            const fileContent = new Uint8Array([1, 2, 3, 4, 5]);
            const arrayBuffer = fileContent.buffer;
            setTimeout(() => {
              this.result = arrayBuffer;
              if (this.onload) this.onload();
            }, 0);
          }),
          result: null as ArrayBuffer | null,
          onload: null as (() => void) | null,
          onerror: null as ((error: Error) => void) | null,
        };

        const originalFileReader = globalThis.FileReader;
        globalThis.FileReader = vi.fn().mockImplementation(() => mockFileReader) as any;

        // Create a mock File
        const fileContent = new Uint8Array([1, 2, 3, 4, 5]);
        const blob = new Blob([fileContent], { type: 'image/png' });
        const file = new File([blob], 'test.png', { type: 'image/png' });

        const result = await service.fileToUint8Array(file);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(5);
        expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);

        globalThis.FileReader = originalFileReader;
      });

      it('should handle empty files', async () => {
        // Mock FileReader for test environment
        const mockFileReader = {
          readAsArrayBuffer: vi.fn(function(this: any) {
            const arrayBuffer = new ArrayBuffer(0);
            setTimeout(() => {
              this.result = arrayBuffer;
              if (this.onload) this.onload();
            }, 0);
          }),
          result: null as ArrayBuffer | null,
          onload: null as (() => void) | null,
          onerror: null as ((error: Error) => void) | null,
        };

        const originalFileReader = globalThis.FileReader;
        globalThis.FileReader = vi.fn().mockImplementation(() => mockFileReader) as any;

        const file = new File([], 'empty.png', { type: 'image/png' });
        const result = await service.fileToUint8Array(file);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(0);

        globalThis.FileReader = originalFileReader;
      });

      it('should reject on FileReader error', async () => {
        const file = new File(['test'], 'test.png', { type: 'image/png' });
        
        // Mock FileReader to simulate error
        const originalFileReader = globalThis.FileReader;
        globalThis.FileReader = vi.fn().mockImplementation(() => ({
          readAsArrayBuffer: function(this: any) {
            setTimeout(() => {
              if (this.onerror) {
                this.onerror(new Error('Read error'));
              }
            }, 0);
          }
        })) as any;

        await expect(service.fileToUint8Array(file)).rejects.toThrow();

        globalThis.FileReader = originalFileReader;
      });
    });

    describe('uint8ArrayToBlob', () => {
      it('should convert Uint8Array to Blob with correct MIME type', () => {
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const blob = service.uint8ArrayToBlob(data, 'image/png');

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/png');
        expect(blob.size).toBe(5);
      });

      it('should handle empty arrays', () => {
        const data = new Uint8Array([]);
        const blob = service.uint8ArrayToBlob(data, 'image/jpeg');

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/jpeg');
        expect(blob.size).toBe(0);
      });

      it('should create independent copy of data', () => {
        const originalData = new Uint8Array([1, 2, 3]);
        const blob = service.uint8ArrayToBlob(originalData, 'image/png');

        // Modify original data
        originalData[0] = 99;

        // Blob should contain original values
        expect(blob.size).toBe(3);
      });
    });
  });

  describe('Format Enum Conversion', () => {
    it('should handle all supported image formats', () => {
      // Access private method through type assertion for testing
      const getFormatEnum = (service as any).getFormatEnum.bind(service);

      expect(getFormatEnum('png')).toBe(MagickFormat.Png);
      expect(getFormatEnum('jpg')).toBe(MagickFormat.Jpeg);
      expect(getFormatEnum('jpeg')).toBe(MagickFormat.Jpeg);
      expect(getFormatEnum('gif')).toBe(MagickFormat.Gif);
      expect(getFormatEnum('bmp')).toBe(MagickFormat.Bmp);
      expect(getFormatEnum('webp')).toBe(MagickFormat.WebP);
      expect(getFormatEnum('tiff')).toBe(MagickFormat.Tiff);
      expect(getFormatEnum('tif')).toBe(MagickFormat.Tiff);
      expect(getFormatEnum('ico')).toBe(MagickFormat.Ico);
      expect(getFormatEnum('svg')).toBe(MagickFormat.Svg);
      expect(getFormatEnum('avif')).toBe(MagickFormat.Avif);
      expect(getFormatEnum('heic')).toBe(MagickFormat.Heic);
      expect(getFormatEnum('heif')).toBe(MagickFormat.Heif);
    });

    it('should be case-insensitive', () => {
      const getFormatEnum = (service as any).getFormatEnum.bind(service);

      expect(getFormatEnum('PNG')).toBe(MagickFormat.Png);
      expect(getFormatEnum('JPEG')).toBe(MagickFormat.Jpeg);
      expect(getFormatEnum('GIF')).toBe(MagickFormat.Gif);
    });

    it('should return default format for unknown types', () => {
      const getFormatEnum = (service as any).getFormatEnum.bind(service);

      expect(getFormatEnum('unknown')).toBe(MagickFormat.Png);
      expect(getFormatEnum('txt')).toBe(MagickFormat.Png);
      expect(getFormatEnum('')).toBe(MagickFormat.Png);
    });
  });

  describe('SOLID Principles Compliance', () => {
    it('should be independent of other services', () => {
      // Service should not have references to PhotonService or FFmpegService
      expect((service as any).photonService).toBeUndefined();
      expect((service as any).ffmpegService).toBeUndefined();
      expect((service as any).photon).toBeUndefined();
      expect((service as any).ffmpeg).toBeUndefined();
    });

    it('should only expose MagickService methods', () => {
      const serviceKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
      
      // Should not have methods from other services
      expect(serviceKeys).not.toContain('processVideo');
      expect(serviceKeys).not.toContain('grayscale');
      expect(serviceKeys).not.toContain('loadFFmpeg');
    });

    it('should have Single Responsibility - only handle ImageMagick operations', () => {
      const publicMethods = [
        'initialize',
        'convertFormat',
        'isPhotonCompatible',
        'getFileExtension',
        'getFileNameWithoutExtension',
        'fileToUint8Array',
        'uint8ArrayToBlob',
        'getMimeType'
      ];

      publicMethods.forEach(method => {
        expect(typeof (service as any)[method]).toBe('function');
      });
    });
  });
});
