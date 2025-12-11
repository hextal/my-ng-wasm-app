import { Injectable } from '@angular/core';

/**
 * Performance monitoring service
 * Tracks and logs performance metrics
 */
@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private isBrowser = typeof window !== 'undefined' && typeof performance !== 'undefined';
  private marks = new Map<string, number>();

  /**
   * Start timing an operation
   */
  mark(name: string): void {
    if (!this.isBrowser) return;
    
    const markName = `perf-${name}`;
    performance.mark(markName);
    this.marks.set(name, performance.now());
  }

  /**
   * End timing and log the duration
   */
  measure(name: string, log: boolean = true): number {
    if (!this.isBrowser) return 0;
    
    const startTime = this.marks.get(name);
    if (!startTime) {
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    // Also use Performance API
    try {
      const markName = `perf-${name}`;
      performance.measure(name, markName);
    } catch (e) {
      // Ignore if marks are cleared
    }

    return duration;
  }

  /**
   * Get all performance entries
   */
  getEntries(): PerformanceEntryList {
    if (!this.isBrowser) return [];
    return performance.getEntriesByType('measure');
  }

  /**
   * Get Core Web Vitals if available
   */
  getCoreWebVitals(): void {
    if (!this.isBrowser) return;

    // Largest Contentful Paint (LCP)
    try {
      const observer = new PerformanceObserver((list) => {
        // Track LCP silently
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }

    // First Input Delay (FID)
    try {
      const observer = new PerformanceObserver((list) => {
        // Track FID silently
      });
      observer.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsScore = 0;
      const observer = new PerformanceObserver((list) => {
        // Track CLS silently
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }
  }

  /**
   * Log navigation timing
   */
  logNavigationTiming(): void {
    if (!this.isBrowser) return;

    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!perfData) return;

    // Navigation timing tracked silently
  }

  /**
   * Log resource timing
   */
  logResourceTiming(): void {
    if (!this.isBrowser) return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const grouped = new Map<string, PerformanceResourceTiming[]>();

    resources.forEach(resource => {
      const url = new URL(resource.name);
      const extension = url.pathname.split('.').pop() || 'other';
      if (!grouped.has(extension)) {
        grouped.set(extension, []);
      }
      grouped.get(extension)!.push(resource);
    });

    // Resource timing tracked silently
  }

  /**
   * Clear all performance data
   */
  clearMarks(): void {
    if (!this.isBrowser) return;
    performance.clearMarks();
    performance.clearMeasures();
    this.marks.clear();
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): any {
    if (!this.isBrowser) return null;
    
    const perf = performance as any;
    if (perf.memory) {
      return {
        usedJSHeapSize: (perf.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (perf.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        jsHeapSizeLimit: (perf.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
      };
    }
    return null;
  }
}
