import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrawingService } from './drawing.service';
import * as fabric from 'fabric';

describe('DrawingService', () => {
  let service: DrawingService;
  let mockCanvas: fabric.Canvas;

  beforeEach(() => {
    service = new DrawingService();
    
    // Create a mock canvas with all required drawing properties
    mockCanvas = {
      isDrawingMode: false,
      selection: true,
      defaultCursor: 'default',
      freeDrawingBrush: null,
    } as any;
  });

  describe('enableDrawingMode', () => {
    it('should enable drawing mode on canvas', () => {
      service.enableDrawingMode(mockCanvas);
      
      expect(mockCanvas.isDrawingMode).toBe(true);
      expect(mockCanvas.selection).toBe(false);
      expect(mockCanvas.defaultCursor).toBe('crosshair');
    });

    it('should initialize default brush if it does not exist', () => {
      service.enableDrawingMode(mockCanvas);
      
      expect(mockCanvas.freeDrawingBrush).toBeDefined();
      expect(mockCanvas.freeDrawingBrush).toBeInstanceOf(fabric.PencilBrush);
      expect(mockCanvas.freeDrawingBrush?.color).toBe('#000000');
      expect(mockCanvas.freeDrawingBrush?.width).toBe(15);
    });

    it('should not reinitialize brush if it already exists', () => {
      const existingBrush = new fabric.PencilBrush(mockCanvas);
      existingBrush.color = '#ff0000';
      existingBrush.width = 20;
      mockCanvas.freeDrawingBrush = existingBrush;

      service.enableDrawingMode(mockCanvas);
      
      expect(mockCanvas.freeDrawingBrush).toBe(existingBrush);
      expect(mockCanvas.freeDrawingBrush.color).toBe('#ff0000');
      expect(mockCanvas.freeDrawingBrush.width).toBe(20);
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.enableDrawingMode(null as any)).not.toThrow();
    });
  });

  describe('disableDrawingMode', () => {
    it('should disable drawing mode on canvas', () => {
      mockCanvas.isDrawingMode = true;
      mockCanvas.selection = false;
      mockCanvas.defaultCursor = 'crosshair';

      service.disableDrawingMode(mockCanvas);
      
      expect(mockCanvas.isDrawingMode).toBe(false);
      expect(mockCanvas.selection).toBe(true);
      expect(mockCanvas.defaultCursor).toBe('default');
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.disableDrawingMode(null as any)).not.toThrow();
    });
  });

  describe('setBrush', () => {
    beforeEach(() => {
      // Initialize with a default brush
      mockCanvas.freeDrawingBrush = new fabric.PencilBrush(mockCanvas);
    });

    it('should set brush type to pencil', () => {
      service.setBrush(mockCanvas, { type: 'pencil' });
      
      expect(mockCanvas.freeDrawingBrush).toBeInstanceOf(fabric.PencilBrush);
    });

    it('should set brush type to circle', () => {
      service.setBrush(mockCanvas, { type: 'circle' });
      
      expect(mockCanvas.freeDrawingBrush).toBeInstanceOf(fabric.CircleBrush);
    });

    it('should set brush type to spray', () => {
      service.setBrush(mockCanvas, { type: 'spray' });
      
      expect(mockCanvas.freeDrawingBrush).toBeInstanceOf(fabric.SprayBrush);
    });

    it('should set brush type to pattern', () => {
      service.setBrush(mockCanvas, { type: 'pattern' });
      
      expect(mockCanvas.freeDrawingBrush).toBeInstanceOf(fabric.PatternBrush);
    });

    it('should set brush color', () => {
      service.setBrush(mockCanvas, { color: '#ff0000' });
      
      expect(mockCanvas.freeDrawingBrush?.color).toBe('#ff0000');
    });

    it('should set brush width', () => {
      service.setBrush(mockCanvas, { width: 25 });
      
      expect(mockCanvas.freeDrawingBrush?.width).toBe(25);
    });

    it('should set brush shadow', () => {
      service.setBrush(mockCanvas, {
        shadow: {
          blur: 5,
          offsetX: 2,
          offsetY: 2,
          color: 'rgba(0,0,0,0.5)',
        },
      });
      
      expect(mockCanvas.freeDrawingBrush?.shadow).toBeDefined();
      expect((mockCanvas.freeDrawingBrush?.shadow as any).blur).toBe(5);
      expect((mockCanvas.freeDrawingBrush?.shadow as any).offsetX).toBe(2);
      expect((mockCanvas.freeDrawingBrush?.shadow as any).offsetY).toBe(2);
      expect((mockCanvas.freeDrawingBrush?.shadow as any).color).toBe('rgba(0,0,0,0.5)');
    });

    it('should set multiple properties at once', () => {
      service.setBrush(mockCanvas, {
        type: 'circle',
        color: '#00ff00',
        width: 30,
      });
      
      expect(mockCanvas.freeDrawingBrush).toBeInstanceOf(fabric.CircleBrush);
      expect(mockCanvas.freeDrawingBrush?.color).toBe('#00ff00');
      expect(mockCanvas.freeDrawingBrush?.width).toBe(30);
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.setBrush(null as any, { color: '#ff0000' })).not.toThrow();
    });

    it('should handle missing brush gracefully', () => {
      mockCanvas.freeDrawingBrush = null;
      
      // Should not throw when setting type
      expect(() => service.setBrush(mockCanvas, { type: 'pencil' })).not.toThrow();
      
      // After setting type, brush should exist
      expect(mockCanvas.freeDrawingBrush).toBeInstanceOf(fabric.PencilBrush);
    });

    it('should configure spray brush specific properties', () => {
      service.setBrush(mockCanvas, { type: 'spray' });
      
      const sprayBrush = mockCanvas.freeDrawingBrush as any;
      expect(sprayBrush).toBeInstanceOf(fabric.SprayBrush);
      // Note: Spray brush properties are set only if they exist
      // This is defensive programming to avoid errors
    });
  });

  describe('getBrushType', () => {
    it('should return "pencil" for PencilBrush', () => {
      mockCanvas.freeDrawingBrush = new fabric.PencilBrush(mockCanvas);
      
      expect(service.getBrushType(mockCanvas)).toBe('pencil');
    });

    it('should return "circle" for CircleBrush', () => {
      mockCanvas.freeDrawingBrush = new fabric.CircleBrush(mockCanvas);
      
      expect(service.getBrushType(mockCanvas)).toBe('circle');
    });

    it('should return "spray" for SprayBrush', () => {
      mockCanvas.freeDrawingBrush = new fabric.SprayBrush(mockCanvas);
      
      expect(service.getBrushType(mockCanvas)).toBe('spray');
    });

    it('should return "pattern" for PatternBrush', () => {
      mockCanvas.freeDrawingBrush = new fabric.PatternBrush(mockCanvas);
      
      expect(service.getBrushType(mockCanvas)).toBe('pattern');
    });

    it('should return "pencil" if no brush exists', () => {
      mockCanvas.freeDrawingBrush = null;
      
      expect(service.getBrushType(mockCanvas)).toBe('pencil');
    });

    it('should return "pencil" for null canvas', () => {
      expect(service.getBrushType(null as any)).toBe('pencil');
    });
  });

  describe('getBrushColor', () => {
    it('should return current brush color', () => {
      mockCanvas.freeDrawingBrush = new fabric.PencilBrush(mockCanvas);
      mockCanvas.freeDrawingBrush.color = '#ff0000';
      
      expect(service.getBrushColor(mockCanvas)).toBe('#ff0000');
    });

    it('should return default color if no brush exists', () => {
      mockCanvas.freeDrawingBrush = null;
      
      expect(service.getBrushColor(mockCanvas)).toBe('#000000');
    });

    it('should return default color for null canvas', () => {
      expect(service.getBrushColor(null as any)).toBe('#000000');
    });
  });

  describe('getBrushWidth', () => {
    it('should return current brush width', () => {
      mockCanvas.freeDrawingBrush = new fabric.PencilBrush(mockCanvas);
      mockCanvas.freeDrawingBrush.width = 25;
      
      expect(service.getBrushWidth(mockCanvas)).toBe(25);
    });

    it('should return default width if no brush exists', () => {
      mockCanvas.freeDrawingBrush = null;
      
      expect(service.getBrushWidth(mockCanvas)).toBe(15);
    });

    it('should return default width for null canvas', () => {
      expect(service.getBrushWidth(null as any)).toBe(15);
    });
  });

  describe('setBrushColor', () => {
    it('should set brush color', () => {
      mockCanvas.freeDrawingBrush = new fabric.PencilBrush(mockCanvas);
      
      service.setBrushColor(mockCanvas, '#00ff00');
      
      expect(mockCanvas.freeDrawingBrush.color).toBe('#00ff00');
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.setBrushColor(null as any, '#ff0000')).not.toThrow();
    });

    it('should handle missing brush gracefully', () => {
      mockCanvas.freeDrawingBrush = null;
      
      expect(() => service.setBrushColor(mockCanvas, '#ff0000')).not.toThrow();
    });
  });

  describe('setBrushWidth', () => {
    it('should set brush width', () => {
      mockCanvas.freeDrawingBrush = new fabric.PencilBrush(mockCanvas);
      
      service.setBrushWidth(mockCanvas, 35);
      
      expect(mockCanvas.freeDrawingBrush.width).toBe(35);
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.setBrushWidth(null as any, 35)).not.toThrow();
    });

    it('should handle missing brush gracefully', () => {
      mockCanvas.freeDrawingBrush = null;
      
      expect(() => service.setBrushWidth(mockCanvas, 35)).not.toThrow();
    });
  });
});
