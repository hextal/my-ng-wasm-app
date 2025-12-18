import { Injectable } from '@angular/core';
import { PhotonService } from './photon.service';

export interface TuningAdjustments {
  opacity: number;        // 0-10 (10 = 100% opaque)
  brightness: number;     // 0-10 (5 = neutral)
  contrast: number;       // 0-10 (5 = neutral)
  saturation: number;     // 0-10 (5 = neutral)
  hueRotation: number;    // 0-10 (5 = neutral, maps to -180° to +180°)
  sharpenIntensity: number; // 0-10 (0-3 iterations max)
  noiseIntensity: number;   // 0-10 (0-3 iterations max)
}

export interface CornerRadiusOptions {
  radiusPercentage: number; // 0-100
}

/**
 * TuningService manages image tuning adjustments (brightness, contrast, saturation, etc.).
 * Follows Single Responsibility Principle - ONLY handles image tuning operations.
 */
@Injectable({
  providedIn: 'root'
})
export class TuningService {
  // Default neutral values
  private readonly DEFAULTS: TuningAdjustments = {
    opacity: 10,
    brightness: 5,
    contrast: 5,
    saturation: 5,
    hueRotation: 5,
    sharpenIntensity: 0,
    noiseIntensity: 0
  };

  constructor(private photonService: PhotonService) {}

  /**
   * Get default tuning values
   */
  getDefaults(): TuningAdjustments {
    return { ...this.DEFAULTS };
  }

  /**
   * Check if adjustments are at default/neutral values
   */
  isNeutral(adjustments: TuningAdjustments): boolean {
    return (
      adjustments.opacity === this.DEFAULTS.opacity &&
      adjustments.brightness === this.DEFAULTS.brightness &&
      adjustments.contrast === this.DEFAULTS.contrast &&
      adjustments.saturation === this.DEFAULTS.saturation &&
      adjustments.hueRotation === this.DEFAULTS.hueRotation &&
      adjustments.sharpenIntensity === this.DEFAULTS.sharpenIntensity &&
      adjustments.noiseIntensity === this.DEFAULTS.noiseIntensity
    );
  }

  /**
   * Apply all tuning adjustments to image data
   * Follows order: Opacity -> Brightness -> Contrast -> Saturation -> Hue -> Sharpen -> Noise
   */
  async applyAllAdjustments(
    originalImageData: ImageData,
    adjustments: TuningAdjustments
  ): Promise<ImageData> {
    // Start from original image
    let data = originalImageData.data.slice();

    // 1. Apply Opacity (0-10 scale, where 10 = 100% opaque)
    if (adjustments.opacity !== 10) {
      const alpha = adjustments.opacity / 10;
      for (let i = 0; i < data.length; i += 4) {
        data[i + 3] = Math.round(data[i + 3] * alpha);
      }
    }

    // 2. Apply Brightness (0-10 scale, where 5 = neutral)
    // Convert: 0 = -50, 5 = 0, 10 = +50 (10 units per step)
    if (adjustments.brightness !== 5) {
      const brightnessValue = (adjustments.brightness - 5) * 10;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + brightnessValue));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightnessValue));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightnessValue));
      }
    }

    // 3. Apply Contrast (0-10 scale, where 5 = neutral)
    // Convert: 0 = -50, 5 = 0, 10 = +50 (10 units per step)
    if (adjustments.contrast !== 5) {
      const contrastValue = (adjustments.contrast - 5) * 10;
      const factor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }
    }

    // Create intermediate image data for photon effects
    let currentData = new ImageData(data, originalImageData.width, originalImageData.height);

    // 4. Apply Saturation/Desaturation (0-10 scale, where 5 = neutral)
    // Convert: 0 = -1.0 (full desaturate), 5 = 0 (no change), 10 = +1.0 (full saturate)
    if (adjustments.saturation > 5) {
      // Saturate: convert 6-10 to 0.2-1.0 (0.2 per step)
      const saturationLevel = (adjustments.saturation - 5) * 0.2;
      currentData = await this.photonService.saturate_hsl(currentData, saturationLevel);
    } else if (adjustments.saturation < 5) {
      // Desaturate: convert 0-4 to 1.0-0.2 (0.2 per step)
      const desaturationLevel = (5 - adjustments.saturation) * 0.2;
      currentData = await this.photonService.desaturate_hsl(currentData, desaturationLevel);
    }

    // 5. Apply Hue Rotation (0-10 scale, where 5 = neutral)
    // Convert: 0 = -180°, 5 = 0°, 10 = +180° (36 degrees per step)
    if (adjustments.hueRotation !== 5) {
      const hueValue = (adjustments.hueRotation - 5) * 36;
      currentData = await this.photonService.hue_rotate_hsl(currentData, hueValue);
    }

    // 6. Apply Sharpen (0-10 scale)
    // Map to 0-3 iterations max to prevent over-sharpening
    if (adjustments.sharpenIntensity > 0) {
      const iterations = Math.floor(adjustments.sharpenIntensity / 3.33);
      for (let i = 0; i < iterations; i++) {
        currentData = await this.photonService.sharpen(currentData);
      }
    }

    // 7. Apply Noise Reduction (0-10 scale)
    // Map to 0-3 iterations max to prevent excessive blur
    if (adjustments.noiseIntensity > 0) {
      const iterations = Math.floor(adjustments.noiseIntensity / 3.33);
      for (let i = 0; i < iterations; i++) {
        currentData = await this.photonService.noise_reduction(currentData);
      }
    }

    return currentData;
  }

  /**
   * Apply corner radius to image data
   * Returns new ImageData with rounded corners
   */
  async applyCornerRadius(
    imageData: ImageData,
    options: CornerRadiusOptions
  ): Promise<ImageData> {
    if (options.radiusPercentage === 0) {
      // No radius - return copy of original
      return new ImageData(
        imageData.data.slice(),
        imageData.width,
        imageData.height
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;

    // First, draw the original image to a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    // Calculate radius as percentage of smaller dimension
    const smallerDimension = Math.min(imageData.width, imageData.height);
    const radiusInPixels = (options.radiusPercentage / 100) * (smallerDimension / 2);

    // Create the rounded rectangle clip path
    ctx.beginPath();
    ctx.moveTo(radiusInPixels, 0);
    ctx.lineTo(imageData.width - radiusInPixels, 0);
    ctx.quadraticCurveTo(imageData.width, 0, imageData.width, radiusInPixels);
    ctx.lineTo(imageData.width, imageData.height - radiusInPixels);
    ctx.quadraticCurveTo(
      imageData.width,
      imageData.height,
      imageData.width - radiusInPixels,
      imageData.height
    );
    ctx.lineTo(radiusInPixels, imageData.height);
    ctx.quadraticCurveTo(0, imageData.height, 0, imageData.height - radiusInPixels);
    ctx.lineTo(0, radiusInPixels);
    ctx.quadraticCurveTo(0, 0, radiusInPixels, 0);
    ctx.closePath();
    ctx.clip();

    // Draw the image with the clip path applied
    ctx.drawImage(tempCanvas, 0, 0);

    // Get the result as ImageData
    return ctx.getImageData(0, 0, imageData.width, imageData.height);
  }

  /**
   * Convert slider value (0-10) to brightness value (-50 to +50)
   */
  sliderToBrightness(sliderValue: number): number {
    return (sliderValue - 5) * 10;
  }

  /**
   * Convert slider value (0-10) to contrast value (-50 to +50)
   */
  sliderToContrast(sliderValue: number): number {
    return (sliderValue - 5) * 10;
  }

  /**
   * Convert slider value (0-10) to saturation value (-1.0 to +1.0)
   */
  sliderToSaturation(sliderValue: number): number {
    return (sliderValue - 5) * 0.2;
  }

  /**
   * Convert slider value (0-10) to hue rotation degrees (-180 to +180)
   */
  sliderToHueRotation(sliderValue: number): number {
    return (sliderValue - 5) * 36;
  }

  /**
   * Convert slider value (0-10) to sharpen iterations (0-3)
   */
  sliderToSharpenIterations(sliderValue: number): number {
    return Math.floor(sliderValue / 3.33);
  }

  /**
   * Convert slider value (0-10) to noise reduction iterations (0-3)
   */
  sliderToNoiseIterations(sliderValue: number): number {
    return Math.floor(sliderValue / 3.33);
  }

  /**
   * Convert slider value (0-10) to opacity (0.0 to 1.0)
   */
  sliderToOpacity(sliderValue: number): number {
    return sliderValue / 10;
  }
}
