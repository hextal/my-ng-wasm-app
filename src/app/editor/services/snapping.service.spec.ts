import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnappingService } from './snapping.service';
import { DocumentStoreService } from './document-store.service';
import * as fabric from 'fabric';

describe('SnappingService', () => {
  let service: SnappingService;
  let mockDocumentStore: any;
  let mockCanvas: any;

  beforeEach(() => {
    // Mock DocumentStoreService
    mockDocumentStore = {
      getDimensions: vi.fn().mockReturnValue({ width: 800, height: 600 }),
    };

    service = new SnappingService(mockDocumentStore);

    // Create mock canvas
    mockCanvas = {
      on: vi.fn(),
      off: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      requestRenderAll: vi.fn(),
    };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('enableSnapping', () => {
    it('should register object:moving and object:modified event handlers', () => {
      service.enableSnapping(mockCanvas, 10);
      expect(mockCanvas.on).toHaveBeenCalledWith('object:moving', expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('object:modified', expect.any(Function));
    });

    it('should use default threshold of 10 if not provided', () => {
      service.enableSnapping(mockCanvas);
      expect(mockCanvas.on).toHaveBeenCalledWith('object:moving', expect.any(Function));
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.enableSnapping(null as any)).not.toThrow();
    });

    it('should snap object to center when within threshold', () => {
      service.enableSnapping(mockCanvas, 10);
      
      // Get the registered callback
      const callback = mockCanvas.on.mock.calls.find((call: any) => call[0] === 'object:moving')[1];
      
      // Create mock object near center
      const mockObj = {
        left: 405, // Near center X (400)
        top: 305,  // Near center Y (300)
        set: vi.fn(),
        setCoords: vi.fn(),
      };

      // Simulate object:moving event
      callback({ target: mockObj });

      // Verify object was snapped to center
      expect(mockObj.set).toHaveBeenCalledWith({ left: 400 });
      expect(mockObj.set).toHaveBeenCalledWith({ top: 300 });
    });

    it('should snap object to edges when within threshold', () => {
      service.enableSnapping(mockCanvas, 10);
      
      const callback = mockCanvas.on.mock.calls.find((call: any) => call[0] === 'object:moving')[1];
      
      // Create mock object near left edge
      const mockObj = {
        left: 5, // Near edge (0)
        top: 5,  // Near edge (0)
        set: vi.fn(),
        setCoords: vi.fn(),
      };

      callback({ target: mockObj });

      // Verify object was snapped to edges
      expect(mockObj.set).toHaveBeenCalledWith({ left: 0 });
      expect(mockObj.set).toHaveBeenCalledWith({ top: 0 });
    });

    it('should show guide lines when snapping to center', () => {
      service.enableSnapping(mockCanvas, 10);
      
      const callback = mockCanvas.on.mock.calls.find((call: any) => call[0] === 'object:moving')[1];
      
      const mockObj = {
        left: 405,
        top: 305,
        set: vi.fn(),
        setCoords: vi.fn(),
      };

      callback({ target: mockObj });

      // Verify guide lines were added
      expect(mockCanvas.add).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should hide guide lines on object:modified', () => {
      service.enableSnapping(mockCanvas, 10);
      
      // First show guide lines
      const movingCallback = mockCanvas.on.mock.calls.find((call: any) => call[0] === 'object:moving')[1];
      const mockObj = {
        left: 405,
        top: 305,
        set: vi.fn(),
        setCoords: vi.fn(),
      };
      movingCallback({ target: mockObj });

      // Then trigger object:modified
      const modifiedCallback = mockCanvas.on.mock.calls.find((call: any) => call[0] === 'object:modified')[1];
      modifiedCallback();

      // Verify guide lines were removed
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('disableSnapping', () => {
    it('should remove event listeners', () => {
      service.disableSnapping(mockCanvas);
      expect(mockCanvas.off).toHaveBeenCalledWith('object:moving');
      expect(mockCanvas.off).toHaveBeenCalledWith('object:modified');
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.disableSnapping(null as any)).not.toThrow();
    });
  });

  describe('clearGuideLines', () => {
    it('should clear all guide lines', () => {
      // First enable snapping and show guide lines
      service.enableSnapping(mockCanvas, 10);
      const callback = mockCanvas.on.mock.calls.find((call: any) => call[0] === 'object:moving')[1];
      const mockObj = {
        left: 405,
        top: 305,
        set: vi.fn(),
        setCoords: vi.fn(),
      };
      callback({ target: mockObj });

      // Clear guide lines
      service.clearGuideLines(mockCanvas);

      // Verify guide lines were removed
      expect(mockCanvas.remove).toHaveBeenCalled();
    });

    it('should handle canvas without guide lines', () => {
      expect(() => service.clearGuideLines(mockCanvas)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle object:moving event with no target', () => {
      service.enableSnapping(mockCanvas, 10);
      const callback = mockCanvas.on.mock.calls.find((call: any) => call[0] === 'object:moving')[1];
      
      expect(() => callback({ target: null })).not.toThrow();
    });

    it('should handle custom threshold values', () => {
      service.enableSnapping(mockCanvas, 50);
      expect(mockCanvas.on).toHaveBeenCalledWith('object:moving', expect.any(Function));
    });
  });
});
