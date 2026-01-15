import { TestBed } from '@angular/core/testing';
import { PerformanceService } from './performance.service';

describe('PerformanceService', () => {
  let service: PerformanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PerformanceService],
    });

    service = TestBed.inject(PerformanceService);
  });

  afterEach(() => {
    service.clearMarks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('mark', () => {
    it('should create performance mark', () => {
      spyOn(performance, 'mark');

      service.mark('test-operation');

      expect(performance.mark).toHaveBeenCalledWith('perf-test-operation');
    });

    it('should handle browser environment', () => {
      expect(() => {
        service.mark('test');
      }).not.toThrow();
    });
  });

  describe('measure', () => {
    it('should measure duration between mark and measure', () => {
      service.mark('test');

      // Wait a bit
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Wait ~10ms
      }

      const duration = service.measure('test');

      expect(duration).toBeGreaterThan(0);
    });

    it('should return 0 if no mark exists', () => {
      const duration = service.measure('non-existent');

      expect(duration).toBe(0);
    });

    it('should delete mark after measure', () => {
      service.mark('test');
      service.measure('test');

      const duration = service.measure('test');

      expect(duration).toBe(0);
    });
  });

  describe('getEntries', () => {
    it('should return performance entries', () => {
      service.mark('test1');
      service.measure('test1');

      const entries = service.getEntries();

      expect(Array.isArray(entries)).toBe(true);
    });
  });

  describe('clearMarks', () => {
    it('should clear all marks and measures', () => {
      spyOn(performance, 'clearMarks');
      spyOn(performance, 'clearMeasures');

      service.mark('test1');
      service.mark('test2');
      service.clearMarks();

      expect(performance.clearMarks).toHaveBeenCalled();
      expect(performance.clearMeasures).toHaveBeenCalled();
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage if available', () => {
      // Mock memory API
      const mockPerformance = performance as any;
      const originalMemory = mockPerformance.memory;
      mockPerformance.memory = {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 50000000,
      };

      const memory = service.getMemoryUsage();

      expect(memory).toBeTruthy();
      if (memory) {
        expect(memory.usedJSHeapSize).toContain('MB');
        expect(memory.totalJSHeapSize).toContain('MB');
        expect(memory.jsHeapSizeLimit).toContain('MB');
      }

      mockPerformance.memory = originalMemory;
    });

    it('should return null if memory API not available', () => {
      const mockPerformance = performance as any;
      const originalMemory = mockPerformance.memory;
      delete mockPerformance.memory;

      const memory = service.getMemoryUsage();

      expect(memory).toBeNull();

      mockPerformance.memory = originalMemory;
    });
  });

  describe('getCoreWebVitals', () => {
    it('should not throw when setting up observers', () => {
      expect(() => {
        service.getCoreWebVitals();
      }).not.toThrow();
    });
  });

  describe('logNavigationTiming', () => {
    it('should not throw', () => {
      expect(() => {
        service.logNavigationTiming();
      }).not.toThrow();
    });
  });

  describe('logResourceTiming', () => {
    it('should not throw', () => {
      expect(() => {
        service.logResourceTiming();
      }).not.toThrow();
    });
  });
});
