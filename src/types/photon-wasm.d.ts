// TypeScript declarations for photon-wasm
// Based on photon-wasm v0.0.4 API

export interface PhotonImage {
  get_width(): number;
  get_height(): number;
  get_raw_pixels(): Uint8Array;
  get_base64(): string;
  get_bytes(): Uint8Array;
}

export interface PhotonFilter {
  name: string;
  parameters?: Record<string, any>;
}

export declare function open_image_from_bytes(bytes: Uint8Array): PhotonImage;
export declare function get_image_data(photon_image: PhotonImage): ImageData;

// Filter functions
export declare function grayscale(photon_image: PhotonImage): void;
export declare function sepia(photon_image: PhotonImage): void;
export declare function filter(photon_image: PhotonImage, filter_name: string): void;

// Transform functions
export declare function crop(photon_image: PhotonImage, x: number, y: number, width: number, height: number): PhotonImage;
export declare function resize(photon_image: PhotonImage, width: number, height: number, filter: string): PhotonImage;
export declare function rotate(photon_image: PhotonImage, degrees: number): PhotonImage;
export declare function flip_horizontal(photon_image: PhotonImage): void;
export declare function flip_vertical(photon_image: PhotonImage): void;

// Adjustment functions
export declare function adjust_contrast(photon_image: PhotonImage, contrast: number): void;
export declare function adjust_brightness(photon_image: PhotonImage, brightness: number): void;
export declare function adjust_hue(photon_image: PhotonImage, hue: number): void;
export declare function adjust_saturation(photon_image: PhotonImage, saturation: number): void;

// Utility functions
export declare function putImageData(canvas: HTMLCanvasElement, image_data: ImageData): void;
export declare function to_image_data(photon_image: PhotonImage): ImageData;
export declare function base64_to_image(base64: string): PhotonImage;
export declare function base64_to_vec(base64: string): Uint8Array;

// Constants
export declare const FILTERS: {
  readonly GRAYSCALE: 'grayscale';
  readonly SEPIA: 'sepia';
  readonly BLUR: 'blur';
  readonly SHARPEN: 'sharpen';
  readonly BRIGHTNESS: 'brightness';
  readonly CONTRAST: 'contrast';
  readonly SATURATION: 'saturation';
  readonly HUE_ROTATE: 'hue_rotate';
};