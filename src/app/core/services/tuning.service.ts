import { Injectable } from '@angular/core';
import { PhotonService } from './photon.service';
import { CanvasUtilityService } from './canvas-utility.service';

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

  constructor(
    private photonService: PhotonService,
    private canvasUtil: CanvasUtilityService
  ) {}

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
   * Apply brightness adjustment only
   */
  async applyBrightness(imageData: ImageData, value: number): Promise<ImageData> {
    await this.photonService.initialize();
    
    if (value === 5) return imageData; // Neutral
    
    // Convert 0-10 scale to brightness increment
    // PhotonService.inc_brightness expects 0-255 range
    const brightnessValue = Math.round((value - 5) * 10);
    
    if (brightnessValue > 0) {
      return await this.photonService.inc_brightness(imageData, brightnessValue);
    } else {
      // For negative brightness, we can use inc_brightness with negative value
      // or just apply it as-is since photon handles it
      return await this.photonService.inc_brightness(imageData, brightnessValue);
    }
  }

  /**
   * Apply contrast adjustment only
   * Note: Photon doesn't have a direct contrast method, so we'll do it manually
   */
  async applyContrast(imageData: ImageData, value: number): Promise<ImageData> {
    if (value === 5) return imageData; // Neutral
    
    // Manual contrast adjustment
    const data = new Uint8ClampedArray(imageData.data);
    const contrastValue = (value - 5) * 10;
    const factor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = factor * (data[i] - 128) + 128;
      data[i + 1] = factor * (data[i + 1] - 128) + 128;
      data[i + 2] = factor * (data[i + 2] - 128) + 128;
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * Apply saturation adjustment only
   */
  async applySaturation(imageData: ImageData, value: number): Promise<ImageData> {
    await this.photonService.initialize();
    
    if (value > 5) {
      const saturationLevel = (value - 5) * 0.2;
      return await this.photonService.saturate_hsl(imageData, saturationLevel);
    } else if (value < 5) {
      const desaturationLevel = (5 - value) * 0.2;
      return await this.photonService.desaturate_hsl(imageData, desaturationLevel);
    }
    
    return imageData;
  }

  /**
   * Apply hue rotation adjustment only
   */
  async applyHueRotation(imageData: ImageData, value: number): Promise<ImageData> {
    await this.photonService.initialize();
    
    if (value === 5) return imageData;
    
    const hueValue = (value - 5) * 36;
    return await this.photonService.hue_rotate_hsl(imageData, hueValue);
  }

  /**
   * Apply all tuning adjustments (for backward compatibility)
   * Chains individual adjustments together
   */
  async applyAllAdjustments(
    originalImageData: ImageData,
    adjustments: TuningAdjustments
  ): Promise<ImageData> {
    let currentData = originalImageData;
    
    // Apply adjustments in sequence
    if (adjustments.brightness !== 5) {
      currentData = await this.applyBrightness(currentData, adjustments.brightness);
    }
    
    if (adjustments.contrast !== 5) {
      currentData = await this.applyContrast(currentData, adjustments.contrast);
    }
    
    if (adjustments.saturation !== 5) {
      currentData = await this.applySaturation(currentData, adjustments.saturation);
    }
    
    if (adjustments.hueRotation !== 5) {
      currentData = await this.applyHueRotation(currentData, adjustments.hueRotation);
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

    const canvas = this.canvasUtil.createCanvas(imageData.width, imageData.height);
    const ctx = this.canvasUtil.getContext2D(canvas);

    // First, draw the original image to a temporary canvas
    const tempCanvas = this.canvasUtil.createCanvas(imageData.width, imageData.height);
    const tempCtx = this.canvasUtil.getContext2D(tempCanvas);
    this.canvasUtil.putImageData(tempCtx, imageData, 0, 0);

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
    this.canvasUtil.drawImage(ctx, tempCanvas, 0, 0);

    // Get the result as ImageData
    return this.canvasUtil.getImageData(ctx, 0, 0, imageData.width, imageData.height);
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
