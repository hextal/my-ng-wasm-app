import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from './history.service';
import { CanvasService } from './canvas.service';

describe('HistoryService', () => {
  let service: HistoryService;
  let canvasService: CanvasService;
  let testImageData: ImageData;

  beforeEach(() => {
    canvasService = new CanvasService();
    service = new HistoryService(canvasService);
    
    // Create test image data
    testImageData = new ImageData(100, 100);
    // Fill with some test data
    for (let i = 0; i < testImageData.data.length; i += 4) {
      testImageData.data[i] = 255;     // R
      testImageData.data[i + 1] = 0;   // G
      testImageData.data[i + 2] = 0;   // B
      testImageData.data[i + 3] = 255; // A
    }
  });

  describe('initialization', () => {
    it('should initialize with empty history', () => {
      const stats = service.getStats();
      expect(stats.size).toBe(0);
      expect(stats.index).toBe(-1);
      expect(stats.canUndo).toBe(false);
      expect(stats.canRedo).toBe(false);
    });

    it('should initialize history with an image', () => {
      service.initialize(testImageData);
      
      const stats = service.getStats();
      expect(stats.size).toBe(1);
      expect(stats.index).toBe(0);
      expect(stats.canUndo).toBe(false);
      expect(stats.canRedo).toBe(false);
    });

    it('should create a copy of the image data on initialization', () => {
      service.initialize(testImageData);
      
      // Modify original
      testImageData.data[0] = 0;
      
      // Get current should return unmodified copy
      const current = service.getCurrent();
      expect(current).not.toBeNull();
      expect(current!.data[0]).toBe(255);
    });
  });

  describe('save', () => {
    beforeEach(() => {
      service.initialize(testImageData);
    });

    it('should save a new state to history', () => {
      const newImageData = new ImageData(100, 100);
      newImageData.data[0] = 128;
      
      service.save(newImageData);
      
      const stats = service.getStats();
      expect(stats.size).toBe(2);
      expect(stats.index).toBe(1);
      expect(stats.canUndo).toBe(true);
    });

    it('should create a copy when saving', () => {
      const newImageData = new ImageData(100, 100);
      newImageData.data[0] = 128;
      
      service.save(newImageData);
      
      // Modify original
      newImageData.data[0] = 64;
      
      // Current should be unmodified
      const current = service.getCurrent();
      expect(current!.data[0]).toBe(128);
    });

    it('should remove forward history after new save', () => {
      // Save multiple states
      const img1 = new ImageData(100, 100);
      img1.data[0] = 100;
      service.save(img1);
      
      const img2 = new ImageData(100, 100);
      img2.data[0] = 150;
      service.save(img2);
      
      // Undo once
      service.undo();
      
      expect(service.getStats().canRedo).toBe(true);
      
      // Save new state
      const img3 = new ImageData(100, 100);
      img3.data[0] = 200;
      service.save(img3);
      
      // Forward history should be cleared
      expect(service.getStats().canRedo).toBe(false);
      expect(service.getStats().size).toBe(3); // initial + img1 + img3
    });

    it('should limit history to MAX_HISTORY_SIZE', () => {
      // Save 25 states (initial + 25 = 26 total, should be limited to 20)
      for (let i = 0; i < 25; i++) {
        const img = new ImageData(100, 100);
        img.data[0] = i;
        service.save(img);
      }
      
      const stats = service.getStats();
      expect(stats.size).toBe(20);
      expect(stats.index).toBe(19);
    });
  });

  describe('undo', () => {
    beforeEach(() => {
      service.initialize(testImageData);
    });

    it('should return null when no undo available', () => {
      const result = service.undo();
      expect(result).toBeNull();
    });

    it('should undo to previous state', () => {
      const img1 = new ImageData(100, 100);
      img1.data[0] = 100;
      service.save(img1);
      
      const undone = service.undo();
      expect(undone).not.toBeNull();
      expect(undone!.data[0]).toBe(255); // Back to initial
      expect(service.getStats().index).toBe(0);
    });

    it('should allow multiple undos', () => {
      // Save 3 states
      const img1 = new ImageData(100, 100);
      img1.data[0] = 100;
      service.save(img1);
      
      const img2 = new ImageData(100, 100);
      img2.data[0] = 150;
      service.save(img2);
      
      const img3 = new ImageData(100, 100);
      img3.data[0] = 200;
      service.save(img3);
      
      // Undo 3 times
      const undo1 = service.undo();
      expect(undo1!.data[0]).toBe(150);
      
      const undo2 = service.undo();
      expect(undo2!.data[0]).toBe(100);
      
      const undo3 = service.undo();
      expect(undo3!.data[0]).toBe(255);
      
      expect(service.canUndo()).toBe(false);
    });

    it('should return a copy of the image data', () => {
      const img1 = new ImageData(100, 100);
      img1.data[0] = 100;
      service.save(img1);
      
      const undone = service.undo();
      
      // Modify the returned data
      undone!.data[0] = 50;
      
      // Redo should return unmodified data
      const redone = service.redo();
      expect(redone!.data[0]).toBe(100);
    });
  });

  describe('redo', () => {
    beforeEach(() => {
      service.initialize(testImageData);
    });

    it('should return null when no redo available', () => {
      const result = service.redo();
      expect(result).toBeNull();
    });

    it('should redo to next state', () => {
      const img1 = new ImageData(100, 100);
      img1.data[0] = 100;
      service.save(img1);
      
      service.undo();
      
      const redone = service.redo();
      expect(redone).not.toBeNull();
      expect(redone!.data[0]).toBe(100);
      expect(service.getStats().index).toBe(1);
    });

    it('should allow multiple redos', () => {
      // Save states and undo all
      const img1 = new ImageData(100, 100);
      img1.data[0] = 100;
      service.save(img1);
      
      const img2 = new ImageData(100, 100);
      img2.data[0] = 150;
      service.save(img2);
      
      service.undo();
      service.undo();
      
      // Redo twice
      const redo1 = service.redo();
      expect(redo1!.data[0]).toBe(100);
      
      const redo2 = service.redo();
      expect(redo2!.data[0]).toBe(150);
      
      expect(service.canRedo()).toBe(false);
    });
  });

  describe('canUndo and canRedo', () => {
    beforeEach(() => {
      service.initialize(testImageData);
    });

    it('should return correct canUndo state', () => {
      expect(service.canUndo()).toBe(false);
      
      const img1 = new ImageData(100, 100);
      service.save(img1);
      
      expect(service.canUndo()).toBe(true);
      
      service.undo();
      expect(service.canUndo()).toBe(false);
    });

    it('should return correct canRedo state', () => {
      expect(service.canRedo()).toBe(false);
      
      const img1 = new ImageData(100, 100);
      service.save(img1);
      
      expect(service.canRedo()).toBe(false);
      
      service.undo();
      expect(service.canRedo()).toBe(true);
      
      service.redo();
      expect(service.canRedo()).toBe(false);
    });
  });

  describe('getCurrent', () => {
    it('should return null when no history', () => {
      const current = service.getCurrent();
      expect(current).toBeNull();
    });

    it('should return current state without modifying history', () => {
      service.initialize(testImageData);
      
      const statsBefore = service.getStats();
      const current = service.getCurrent();
      const statsAfter = service.getStats();
      
      expect(current).not.toBeNull();
      expect(statsAfter).toEqual(statsBefore);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      service.initialize(testImageData);
      
      const img1 = new ImageData(100, 100);
      service.save(img1);
      
      service.clear();
      
      const stats = service.getStats();
      expect(stats.size).toBe(0);
      expect(stats.index).toBe(-1);
      expect(service.getCurrent()).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      service.initialize(testImageData);
      
      const img1 = new ImageData(100, 100);
      service.save(img1);
      
      const stats = service.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.index).toBe(1);
      expect(stats.canUndo).toBe(true);
      expect(stats.canRedo).toBe(false);
    });
  });
});
