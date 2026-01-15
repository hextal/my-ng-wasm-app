import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { vi } from 'vitest';

// Initialize the Angular testing environment
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  {
    teardown: { destroyAfterEach: true }
  }
);

// Make jasmine available globally for compatibility
(globalThis as any).jasmine = {
  createSpyObj: (baseName: string, methods: string[]) => {
    const spy: any = {};
    methods.forEach(method => {
      spy[method] = vi.fn();
      spy[method].and = {
        returnValue: (value: any) => {
          spy[method].mockReturnValue(value);
          return spy[method];
        },
        resolveTo: (value: any) => {
          spy[method].mockResolvedValue(value);
          return spy[method];
        },
        rejectWith: (error: any) => {
          spy[method].mockRejectedValue(error);
          return spy[method];
        },
      };
    });
    return spy;
  },
};

// Polyfill ImageData for Node.js test environment
if (typeof ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(widthOrData: number | Uint8ClampedArray, heightOrWidth?: number, height?: number) {
      if (typeof widthOrData === 'number') {
        // new ImageData(width, height)
        this.width = widthOrData;
        this.height = heightOrWidth!;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        // new ImageData(data, width, height)
        this.data = widthOrData;
        this.width = heightOrWidth!;
        this.height = height!;
      }
    }
  }
  
  (global as any).ImageData = ImageDataPolyfill;
  (globalThis as any).ImageData = ImageDataPolyfill;
}
