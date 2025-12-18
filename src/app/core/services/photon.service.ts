import { Injectable, signal, computed, inject } from '@angular/core';
import type * as PhotonWasm from 'photon-wasm';
import { ImageCacheService } from './image-cache.service';

@Injectable({
  providedIn: 'root'
})
export class PhotonService {
  private photon = signal<typeof PhotonWasm | null>(null);
  private loading = signal<boolean>(false);
  private error = signal<Error | null>(null);
  private cacheService: ImageCacheService;

  readonly isReady = computed(() => this.photon() !== null);
  
  constructor(cacheService?: ImageCacheService) {
    // Support both DI and manual instantiation for testing
    this.cacheService = cacheService || inject(ImageCacheService);
  }

  // Detect browser/runtime environment
  private isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  private supportsMultiThreading = typeof SharedArrayBuffer !== 'undefined' && 
                                    (typeof window !== 'undefined' && (window as any).crossOriginIsolated === true);

  async initialize(): Promise<void> {
    if (this.photon()) {
      return; // Already initialized
    }

    if (this.loading()) {
      // Wait for ongoing initialization
      while (this.loading()) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // If we're on the server, skip initialization
      if (!this.isBrowser) {
        return;
      }

      // Check if test mock is available
      if ((globalThis as any).import) {
        const module = await (globalThis as any).import('photon-wasm');
        this.photon.set(module);
        return;
      }

      // Use static import for browser environment
      const module = await import('photon-wasm');

      // Check if already initialized
      if (!(module as any).initialized) {
        // Load the WASM file - let the module handle the loading
        await (module as any).initWasm(
          fetch('assets/photon-wasm/photon_bg.wasm')
        );
      }

      this.photon.set(module as any);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load photon-wasm');
      this.error.set(error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  getPhotonModule(): any | null {
    return this.photon();
  }

  isLoading(): boolean {
    return this.loading();
  }

  getError(): Error | null {
    return this.error();
  }

  // --- Helper method for applying filters ---
  private async applyFilter(imageData: ImageData, filterName: string, ...args: any[]): Promise<ImageData> {
    await this.ensureReady();
    if (!this.isBrowser) throw new Error('Photon transformations require a browser environment');
    
    const photonModule = this.photon();
    if (!photonModule) throw new Error('Photon module not initialized');
    
    // Create PhotonImage from ImageData
    const photonImage = this.imageDataToPhotonImage(imageData);
    
    // Get the filter function
    const filterFn = (photonModule as any)[filterName];
    if (!filterFn) {
      throw new Error(`Filter '${filterName}' not found in Photon module`);
    }
    
    // Apply filter - Photon filters mutate in-place
    filterFn(photonImage, ...args);
    
    // Convert back to ImageData
    const result = this.photonImageToImageData(photonImage);
    
    return result;
  }

  // --- Monochrome Effects ---
  async grayscale(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'grayscale');
  }

  async grayscale_human_corrected(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'grayscale_human_corrected');
  }

  async desaturate(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'desaturate');
  }

  async decompose_min(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'decompose_min');
  }

  async decompose_max(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'decompose_max');
  }

  async sepia(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'sepia');
  }

  async r_grayscale(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'r_grayscale');
  }

  async g_grayscale(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'g_grayscale');
  }

  async b_grayscale(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'b_grayscale');
  }

  async single_channel_grayscale(imageData: ImageData, channel: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'single_channel_grayscale', channel);
  }

  async threshold(imageData: ImageData, threshold: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'threshold', threshold);
  }

  async monochrome(imageData: ImageData, r: number, g: number, b: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'monochrome', r, g, b);
  }

  // --- Convolution Effects ---
  async box_blur(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'box_blur');
  }

  async blur(imageData: ImageData): Promise<ImageData> {
    return this.box_blur(imageData);
  }

  async gaussian_blur(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'gaussian_blur');
  }

  async sharpen(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'sharpen');
  }

  async edge_detection(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'edge_detection');
  }

  async edge_one(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'edge_one');
  }

  async emboss(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'emboss');
  }

  async sobel_horizontal(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'sobel_horizontal');
  }

  async sobel_vertical(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'sobel_vertical');
  }

  async laplace(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'laplace');
  }

  async prewitt_horizontal(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'prewitt_horizontal');
  }

  async identity(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'identity');
  }

  async detect_horizontal_lines(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'detect_horizontal_lines');
  }

  async detect_vertical_lines(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'detect_vertical_lines');
  }

  async detect_45_deg_lines(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'detect_45_deg_lines');
  }

  async detect_135_deg_lines(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'detect_135_deg_lines');
  }

  async noise_reduction(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'noise_reduction');
  }

  // --- Special Effects ---
  async solarize(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'solarize');
  }

  async oil(imageData: ImageData, radius: number = 4, intensity: number = 55): Promise<ImageData> {
    return this.applyFilter(imageData, 'oil', radius, intensity);
  }

  async pixelize(imageData: ImageData, pixelSize: number = 10): Promise<ImageData> {
    return this.applyFilter(imageData, 'pixelize', pixelSize);
  }

  async inc_brightness(imageData: ImageData, brightness: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'inc_brightness', brightness);
  }

  async offset(imageData: ImageData, offset: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'offset', offset);
  }

  async offset_red(imageData: ImageData, offset: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'offset_red', offset);
  }

  async offset_green(imageData: ImageData, offset: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'offset_green', offset);
  }

  async offset_blue(imageData: ImageData, offset: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'offset_blue', offset);
  }

  async multiple_offsets(imageData: ImageData, offset: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'multiple_offsets', offset);
  }

  async primary(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'primary');
  }

  async colorize(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'colorize');
  }

  async halftone(imageData: ImageData): Promise<ImageData> {
    return this.applyFilter(imageData, 'halftone');
  }

  async horizontal_strips(imageData: ImageData, num_strips: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'horizontal_strips', num_strips);
  }

  async vertical_strips(imageData: ImageData, num_strips: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'vertical_strips', num_strips);
  }

  // --- Colour Space Adjustments ---
  async hue_rotate_hsl(imageData: ImageData, degrees: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'hue_rotate_hsl', degrees);
  }

  async hue_rotate_hsv(imageData: ImageData, degrees: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'hue_rotate_hsv', degrees);
  }

  async hue_rotate_lch(imageData: ImageData, degrees: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'hue_rotate_lch', degrees);
  }

  async saturate_hsl(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'saturate_hsl', level);
  }

  async saturate_hsv(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'saturate_hsv', level);
  }

  async saturate_lch(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'saturate_lch', level);
  }

  async desaturate_hsl(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'desaturate_hsl', level);
  }

  async desaturate_hsv(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'desaturate_hsv', level);
  }

  async desaturate_lch(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'desaturate_lch', level);
  }

  async lighten_hsl(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'lighten_hsl', level);
  }

  async lighten_hsv(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'lighten_hsv', level);
  }

  async lighten_lch(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'lighten_lch', level);
  }

  async darken_hsl(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'darken_hsl', level);
  }

  async darken_hsv(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'darken_hsv', level);
  }

  async darken_lch(imageData: ImageData, level: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'darken_lch', level);
  }

  // --- Effects ---
  /**
   * Adjust the contrast of an image by a factor.
   * @param imageData - The image to adjust
   * @param contrast - Contrast factor between -255.0 and 255.0
   * @returns The adjusted image
   */
  async adjust_contrast(imageData: ImageData, contrast: number): Promise<ImageData> {
    return this.applyFilter(imageData, 'adjust_contrast', contrast);
  }

  // --- Preset Filters ---
  async filter(imageData: ImageData, filterName: string): Promise<ImageData> {
    // Special effects with default parameters or simple effects
    const specialEffects: Record<string, () => Promise<ImageData>> = {
      'solarize': () => this.solarize(imageData),
      'oil': () => this.oil(imageData, 4, 55), // Default: radius=4, intensity=55
      'pixelize': () => this.pixelize(imageData, 10), // Default: pixelSize=10
      'sepia': () => this.sepia(imageData),
    };
    
    // Handle special effects with parameters
    if (filterName in specialEffects) {
      return specialEffects[filterName]();
    }
    
    // List of filters that are standalone functions (not string-based)
    const standaloneFunctions = [
      'lix', 'neue', 'ryo', 'lofi', 'golden', 'cali', 
      'dramatic', 'pastel_pink', 'firenze', 'obsidian'
    ];
    
    // If it's a standalone function, call it directly
    if (standaloneFunctions.includes(filterName)) {
      return this.applyFilter(imageData, filterName);
    }
    
    // Otherwise, use the filter() function with the filter name as parameter
    return this.applyFilter(imageData, 'filter', filterName);
  }

  private imageDataToPhotonImage(imageData: ImageData): any {
    const photonModule = this.photon();
    if (!photonModule) throw new Error('Photon module not initialized');
    
    // Check if PhotonImage constructor exists
    if (!(photonModule as any).PhotonImage) {
      throw new Error('PhotonImage constructor not available');
    }
    
    // Optimize: Use slice() instead of manual copy for better performance
    const pixelData = imageData.data.slice();
    
    // Create a PhotonImage from ImageData using the constructor
    return new (photonModule as any).PhotonImage(
      pixelData,
      imageData.width,
      imageData.height
    );
  }

  private photonImageToImageData(photonImage: any): ImageData {
    const photonModule = this.photon();
    if (!photonModule) throw new Error('Photon module not initialized');
    
    // Check if to_image_data function exists
    if (!(photonModule as any).to_image_data) {
      throw new Error('to_image_data function not available');
    }
    
    // Convert PhotonImage back to ImageData using the module function
    return (photonModule as any).to_image_data(photonImage);
  }

  private async ensureReady(): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }
    if (!this.isReady()) {
      throw new Error('Photon-WASM module not loaded');
    }
  }
}