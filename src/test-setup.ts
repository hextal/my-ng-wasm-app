import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Initialize the Angular testing environment
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

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
