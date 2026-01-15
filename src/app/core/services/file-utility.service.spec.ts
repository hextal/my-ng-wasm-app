import { TestBed } from '@angular/core/testing';
import { FileUtilityService } from './file-utility.service';

describe('FileUtilityService', () => {
  let service: FileUtilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FileUtilityService],
    });

    service = TestBed.inject(FileUtilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(service.getFileExtension('image.png')).toBe('png');
      expect(service.getFileExtension('photo.jpg')).toBe('jpg');
      expect(service.getFileExtension('document.pdf')).toBe('pdf');
    });

    it('should handle multiple dots', () => {
      expect(service.getFileExtension('my.file.name.png')).toBe('png');
    });

    it('should return empty string for no extension', () => {
      expect(service.getFileExtension('filename')).toBe('');
    });

    it('should handle uppercase extensions', () => {
      expect(service.getFileExtension('IMAGE.PNG')).toBe('png');
    });

    it('should handle empty filename', () => {
      expect(service.getFileExtension('')).toBe('');
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it('should remove extension', () => {
      expect(service.getFileNameWithoutExtension('image.png')).toBe('image');
    });

    it('should handle multiple dots', () => {
      expect(service.getFileNameWithoutExtension('my.file.name.png')).toBe('my.file.name');
    });

    it('should return original for no extension', () => {
      expect(service.getFileNameWithoutExtension('filename')).toBe('filename');
    });

    it('should handle empty string', () => {
      expect(service.getFileNameWithoutExtension('')).toBe('');
    });
  });

  describe('fileToUint8Array', () => {
    it('should convert File to Uint8Array', async () => {
      const content = new Uint8Array([1, 2, 3, 4, 5]);
      const blob = new Blob([content]);
      const file = new File([blob], 'test.png', { type: 'image/png' });

      const result = await service.fileToUint8Array(file);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty file', async () => {
      const file = new File([], 'empty.txt');

      const result = await service.fileToUint8Array(file);

      expect(result.length).toBe(0);
    });
  });

  describe('uint8ArrayToBlob', () => {
    it('should convert Uint8Array to Blob', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const blob = service.uint8ArrayToBlob(data, 'image/png');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBe(5);
    });

    it('should handle different MIME types', () => {
      const data = new Uint8Array([1, 2, 3]);

      const pngBlob = service.uint8ArrayToBlob(data, 'image/png');
      const jpegBlob = service.uint8ArrayToBlob(data, 'image/jpeg');

      expect(pngBlob.type).toBe('image/png');
      expect(jpegBlob.type).toBe('image/jpeg');
    });

    it('should create copy of ArrayBuffer', async () => {
      const original = new Uint8Array([1, 2, 3]);
      const blob = service.uint8ArrayToBlob(original, 'image/png');

      const blobData = new Uint8Array(await blob.arrayBuffer());

      expect(Array.from(blobData)).toEqual([1, 2, 3]);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(service.getMimeType('png')).toBe('image/png');
      expect(service.getMimeType('jpg')).toBe('image/jpeg');
      expect(service.getMimeType('jpeg')).toBe('image/jpeg');
      expect(service.getMimeType('gif')).toBe('image/gif');
      expect(service.getMimeType('bmp')).toBe('image/bmp');
      expect(service.getMimeType('webp')).toBe('image/webp');
      expect(service.getMimeType('tiff')).toBe('image/tiff');
      expect(service.getMimeType('tif')).toBe('image/tiff');
      expect(service.getMimeType('ico')).toBe('image/x-icon');
      expect(service.getMimeType('svg')).toBe('image/svg+xml');
      expect(service.getMimeType('avif')).toBe('image/avif');
      expect(service.getMimeType('heic')).toBe('image/heic');
      expect(service.getMimeType('heif')).toBe('image/heif');
    });

    it('should handle uppercase extensions', () => {
      expect(service.getMimeType('PNG')).toBe('image/png');
      expect(service.getMimeType('JPG')).toBe('image/jpeg');
    });

    it('should return default for unknown extension', () => {
      expect(service.getMimeType('unknown')).toBe('image/png');
      expect(service.getMimeType('')).toBe('image/png');
    });
  });
});
