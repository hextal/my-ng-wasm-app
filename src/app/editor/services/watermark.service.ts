import { Injectable } from '@angular/core';
import { DocumentStoreService } from './document-store.service';
import { AssetStoreService } from './asset-store.service';
import { HistoryService } from './history.service';
import { AddObjectCommand } from '../core/commands/object.commands';
import { EditorObjectFactory, TextObject, ImageObject } from '../core/models/document.model';

/**
 * WatermarkService - Manages watermark creation and positioning
 * Handles text and image watermarks following Single Responsibility Principle
 */
@Injectable({
  providedIn: 'root',
})
export class WatermarkService {
  constructor(
    private documentStore: DocumentStoreService,
    private assetStore: AssetStoreService,
    private history: HistoryService
  ) {}

  /**
   * Add watermark (text or image)
   * @param type - 'text' or 'image'
   * @param content - Text string or image Blob
   * @param position - Position on canvas
   * @param opacity - Watermark opacity (0-1)
   */
  async addWatermark(
    type: 'text' | 'image',
    content: string | Blob,
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'center',
    opacity: number = 0.3
  ): Promise<void> {
    const dims = this.documentStore.getDimensions();
    const { x, y } = this.calculatePosition(position, dims);

    if (type === 'text') {
      const watermarkText = EditorObjectFactory.createTextObject(
        content as string,
        x,
        y,
        48,
        'Arial',
        '#ffffff'
      );
      watermarkText.opacity = opacity;

      await this.history.run(new AddObjectCommand(watermarkText));
    } else {
      // Image watermark
      const blob = content as Blob;
      const { assetId } = await this.assetStore.put(blob);
      const img = await this.loadImageFromBlob(blob);

      // Auto-scale watermark if it's too large (max 20% of canvas dimensions)
      const maxWatermarkSize = Math.min(dims.width, dims.height) * 0.2;
      let scaleX = 1;
      let scaleY = 1;

      if (img.width > maxWatermarkSize || img.height > maxWatermarkSize) {
        const scale = maxWatermarkSize / Math.max(img.width, img.height);
        scaleX = scale;
        scaleY = scale;
      }

      const watermarkImage = EditorObjectFactory.createImageObject(
        assetId,
        blob.type,
        img.width,
        img.height,
        x,
        y
      );
      watermarkImage.scaleX = scaleX;
      watermarkImage.scaleY = scaleY;
      watermarkImage.opacity = opacity;

      await this.history.run(new AddObjectCommand(watermarkImage));
    }
  }

  /**
   * Calculate position coordinates based on position name
   * @param position - Position name
   * @param dims - Canvas dimensions
   * @returns x, y coordinates
   */
  private calculatePosition(
    position: string,
    dims: { width: number; height: number }
  ): { x: number; y: number } {
    let x = dims.width / 2;
    let y = dims.height / 2;

    const margin = 50;
    switch (position) {
      case 'top-left':
        x = margin;
        y = margin;
        break;
      case 'top-right':
        x = dims.width - margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = dims.height - margin;
        break;
      case 'bottom-right':
        x = dims.width - margin;
        y = dims.height - margin;
        break;
    }

    return { x, y };
  }

  /**
   * Load image from blob to get dimensions
   * @param blob - Image blob
   * @returns Promise with HTMLImageElement
   */
  private async loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }
}
