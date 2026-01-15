import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewportService } from './viewport.service';
import * as fabric from 'fabric';

describe('ViewportService', () => {
  let service: ViewportService;
  let mockCanvas: any;

  beforeEach(() => {
    service = new ViewportService();

    // Create mock canvas with all required methods
    mockCanvas = {
      setZoom: vi.fn(),
      getZoom: vi.fn().mockReturnValue(1),
      requestRenderAll: vi.fn(),
      on: vi.fn(),
      viewportTransform: [1, 0, 0, 1, 0, 0],
      selection: true,
    };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setZoom', () => {
    it('should set zoom level', () => {
      service.setZoom(mockCanvas, 1.5);
      expect(mockCanvas.setZoom).toHaveBeenCalledWith(1.5);
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should clamp zoom to minimum 0.1', () => {
      service.setZoom(mockCanvas, 0.05);
      expect(mockCanvas.setZoom).toHaveBeenCalledWith(0.1);
    });

    it('should clamp zoom to maximum 5', () => {
      service.setZoom(mockCanvas, 10);
      expect(mockCanvas.setZoom).toHaveBeenCalledWith(5);
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.setZoom(null as any, 1.5)).not.toThrow();
    });
  });

  describe('getZoom', () => {
    it('should get current zoom level', () => {
      mockCanvas.getZoom.mockReturnValue(1.5);
      const zoom = service.getZoom(mockCanvas);
      expect(zoom).toBe(1.5);
    });

    it('should return 1 for null canvas', () => {
      const zoom = service.getZoom(null as any);
      expect(zoom).toBe(1);
    });
  });

  describe('zoomIn', () => {
    it('should zoom in by 10%', () => {
      mockCanvas.getZoom.mockReturnValue(1.0);
      service.zoomIn(mockCanvas);
      expect(mockCanvas.setZoom).toHaveBeenCalledWith(1.1);
    });
  });

  describe('zoomOut', () => {
    it('should zoom out by 10%', () => {
      mockCanvas.getZoom.mockReturnValue(1.0);
      service.zoomOut(mockCanvas);
      expect(mockCanvas.setZoom).toHaveBeenCalledWith(1.0 / 1.1);
    });
  });

  describe('resetZoom', () => {
    it('should reset zoom to 100%', () => {
      service.resetZoom(mockCanvas);
      expect(mockCanvas.setZoom).toHaveBeenCalledWith(1);
    });
  });

  describe('enableMouseWheelZoom', () => {
    it('should register mouse:wheel event handler', () => {
      service.enableMouseWheelZoom(mockCanvas);
      expect(mockCanvas.on).toHaveBeenCalledWith('mouse:wheel', expect.any(Function));
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.enableMouseWheelZoom(null as any)).not.toThrow();
    });
  });

  describe('enablePanning', () => {
    it('should register mouse event handlers', () => {
      service.enablePanning(mockCanvas);
      expect(mockCanvas.on).toHaveBeenCalledWith('mouse:down', expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('mouse:move', expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('mouse:up', expect.any(Function));
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.enablePanning(null as any)).not.toThrow();
    });
  });

  describe('resetPan', () => {
    it('should reset viewport transform', () => {
      mockCanvas.viewportTransform = [2, 0, 0, 2, 100, 100];
      service.resetPan(mockCanvas);
      expect(mockCanvas.viewportTransform).toEqual([1, 0, 0, 1, 0, 0]);
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.resetPan(null as any)).not.toThrow();
    });
  });
});
