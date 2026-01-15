import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasUtilityService } from './canvas-utility.service';

describe('CanvasUtilityService', () => {
  let service: CanvasUtilityService;

  beforeEach(() => {
    service = new CanvasUtilityService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createCanvas', () => {
    it('should create canvas without dimensions', () => {
      const canvas = service.createCanvas();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    });

    it('should create canvas with dimensions', () => {
      const canvas = service.createCanvas(800, 600);
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });
  });

  describe('getContext2D', () => {
    it('should get 2D context from canvas', () => {
      const canvas = service.createCanvas(100, 100);
      const ctx = service.getContext2D(canvas);
      expect(ctx).toBeInstanceOf(CanvasRenderingContext2D);
    });
  });

  describe('createDownloadLink', () => {
    it('should create download link with filename and href', () => {
      const link = service.createDownloadLink('test.png', 'http://test.com/test.png');
      expect(link.download).toBe('test.png');
      expect(link.href).toBe('http://test.com/test.png');
    });
  });

  describe('createFileInput', () => {
    it('should create file input', () => {
      const input = service.createFileInput();
      expect(input.type).toBe('file');
    });

    it('should create file input with accept attribute', () => {
      const input = service.createFileInput('image/*', false);
      expect(input.accept).toBe('image/*');
      expect(input.multiple).toBe(false);
    });
  });

  describe('createObjectURL and revokeObjectURL', () => {
    it('should create and revoke object URL', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const url = service.createObjectURL(blob);
      expect(url).toMatch(/^blob:/);
      service.revokeObjectURL(url);
    });
  });

  describe('canvasToDataURL', () => {
    it('should convert canvas to data URL', () => {
      const canvas = service.createCanvas(10, 10);
      const dataURL = service.canvasToDataURL(canvas);
      expect(dataURL).toMatch(/^data:image\/png/);
    });
  });

  describe('clearCanvas', () => {
    it('should clear canvas', () => {
      const canvas = service.createCanvas(10, 10);
      const ctx = service.getContext2D(canvas);
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 10, 10);
      
      service.clearCanvas(canvas);
      
      const imageData = service.getImageData(ctx, 0, 0, 10, 10);
      // Check first pixel is transparent (all zeros)
      expect(imageData.data[0]).toBe(0);
      expect(imageData.data[1]).toBe(0);
      expect(imageData.data[2]).toBe(0);
      expect(imageData.data[3]).toBe(0);
    });
  });

  describe('getImageData and putImageData', () => {
    it('should get and put image data', () => {
      const canvas = service.createCanvas(10, 10);
      const ctx = service.getContext2D(canvas);
      
      // Create test image data
      const testData = service.getImageData(ctx, 0, 0, 10, 10);
      testData.data[0] = 255; // Set first pixel red
      
      service.putImageData(ctx, testData, 0, 0);
      
      const result = service.getImageData(ctx, 0, 0, 10, 10);
      expect(result.data[0]).toBe(255);
    });
  });

  describe('drawImage', () => {
    it('should draw image on canvas', () => {
      const srcCanvas = service.createCanvas(10, 10);
      const srcCtx = service.getContext2D(srcCanvas);
      srcCtx.fillStyle = 'red';
      srcCtx.fillRect(0, 0, 10, 10);
      
      const destCanvas = service.createCanvas(10, 10);
      const destCtx = service.getContext2D(destCanvas);
      
      service.drawImage(destCtx, srcCanvas, 0, 0);
      
      const imageData = service.getImageData(destCtx, 0, 0, 10, 10);
      expect(imageData.data[0]).toBeGreaterThan(200); // Should be red
    });
  });
});
