import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { DocumentStoreService } from './document-store.service';
import { AssetStoreService } from './asset-store.service';
import { MagickService } from '../../core/services/magick.service';
import { DocumentModel, EditorObject, ImageObject, PathObject, TextObject } from '../core/models/document.model';

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp' | 'tiff' | 'bmp';
  quality?: number; // 0-1 for jpeg/webp
  scale?: number; // Scale multiplier (e.g., 2 for 2x resolution)
  targetWidth?: number; // Explicit target width
  targetHeight?: number; // Explicit target height
  background?: {
    color?: string;
    transparent?: boolean;
  };
}

/**
 * ExportService - Handles document export with offscreen rendering
 * Uses Fabric for offscreen rendering, then ImageMagick for format conversion
 */
@Injectable({
  providedIn: 'root',
})
export class ExportService {
  constructor(
    private documentStore: DocumentStoreService,
    private assetStore: AssetStoreService,
    private magickService: MagickService
  ) {}

  /**
   * Export the current document to a file
   */
  async export(options: ExportOptions): Promise<Blob> {
    // Get document snapshot
    const doc = this.documentStore.getSnapshot();

    // Calculate dimensions
    const { width, height } = this.calculateDimensions(doc, options);

    // Render to offscreen canvas
    const pngBlob = await this.renderToCanvas(doc, width, height, options);

    // If PNG and no background conversion needed, return directly
    if (options.format === 'png' && !this.needsBackgroundConversion(doc, options)) {
      return pngBlob;
    }

    // Convert using ImageMagick
    return this.convertFormat(pngBlob, options);
  }

  /**
   * Calculate export dimensions based on options
   */
  private calculateDimensions(
    doc: DocumentModel,
    options: ExportOptions
  ): { width: number; height: number } {
    if (options.targetWidth && options.targetHeight) {
      return { width: options.targetWidth, height: options.targetHeight };
    }

    const scale = options.scale ?? 1;
    
    if (options.targetWidth) {
      const aspectRatio = doc.height / doc.width;
      return {
        width: options.targetWidth,
        height: Math.round(options.targetWidth * aspectRatio),
      };
    }

    if (options.targetHeight) {
      const aspectRatio = doc.width / doc.height;
      return {
        width: Math.round(options.targetHeight * aspectRatio),
        height: options.targetHeight,
      };
    }

    return {
      width: Math.round(doc.width * scale),
      height: Math.round(doc.height * scale),
    };
  }

  /**
   * Render document to an offscreen canvas
   */
  private async renderToCanvas(
    doc: DocumentModel,
    targetWidth: number,
    targetHeight: number,
    options: ExportOptions
  ): Promise<Blob> {
    // Create offscreen canvas element
    const canvasElement = document.createElement('canvas');
    canvasElement.width = targetWidth;
    canvasElement.height = targetHeight;

    // Create Fabric canvas
    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: targetWidth,
      height: targetHeight,
      renderOnAddRemove: false,
      selection: false,
    });

    // Calculate scale factors
    const scaleX = targetWidth / doc.width;
    const scaleY = targetHeight / doc.height;

    // Set background
    const background = options.background ?? doc.background;
    if (background.transparent) {
      fabricCanvas.backgroundColor = 'transparent';
    } else {
      fabricCanvas.backgroundColor = background.color || '#ffffff';
    }

    // Sort objects by z-index
    const sortedObjects = [...doc.objects].sort((a, b) => a.zIndex - b.zIndex);

    // Add objects to canvas
    for (const obj of sortedObjects) {
      if (!obj.visible) continue;

      const fabricObj = await this.createFabricObjectForExport(
        obj,
        scaleX,
        scaleY
      );

      if (fabricObj) {
        fabricCanvas.add(fabricObj);
      }
    }

    // Render all objects
    fabricCanvas.renderAll();

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      fabricCanvas.getElement().toBlob((blob: Blob | null) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });

    // Clean up
    fabricCanvas.dispose();

    return blob;
  }

  /**
   * Create a Fabric object for export with proper scaling
   */
  private async createFabricObjectForExport(
    obj: EditorObject,
    scaleX: number,
    scaleY: number
  ): Promise<fabric.Object | null> {
    const scaledX = obj.x * scaleX;
    const scaledY = obj.y * scaleY;
    const scaledScaleX = obj.scaleX * scaleX;
    const scaledScaleY = obj.scaleY * scaleY;

    switch (obj.type) {
      case 'image':
        return this.createImageForExport(
          obj as ImageObject,
          scaledX,
          scaledY,
          scaledScaleX,
          scaledScaleY
        );

      case 'path':
        return this.createPathForExport(
          obj as PathObject,
          scaledX,
          scaledY,
          scaledScaleX,
          scaledScaleY
        );

      case 'text':
        return this.createTextForExport(
          obj as TextObject,
          scaledX,
          scaledY,
          scaledScaleX,
          scaledScaleY
        );

      default:
        return null;
    }
  }

  /**
   * Create image object for export
   */
  private async createImageForExport(
    obj: ImageObject,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number
  ): Promise<fabric.Image> {
    const blob = await this.assetStore.get(obj.assetId);
    const imgElement = await this.loadImageFromBlob(blob);

    return new fabric.Image(imgElement, {
      left: x,
      top: y,
      scaleX,
      scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      originX: 'center',
      originY: 'center',
      selectable: false,
    });
  }

  /**
   * Create path object for export
   */
  private createPathForExport(
    obj: PathObject,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number
  ): fabric.Path {
    return new fabric.Path(obj.path, {
      left: x,
      top: y,
      scaleX,
      scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      fill: obj.fill,
      originX: 'center',
      originY: 'center',
      selectable: false,
    });
  }

  /**
   * Create text object for export
   */
  private createTextForExport(
    obj: TextObject,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number
  ): fabric.Text {
    return new fabric.Text(obj.text, {
      left: x,
      top: y,
      scaleX,
      scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      fill: obj.fill,
      textAlign: obj.textAlign || 'left',
      originX: 'center',
      originY: 'center',
      selectable: false,
    });
  }

  /**
   * Convert PNG blob to target format using ImageMagick
   */
  private async convertFormat(
    pngBlob: Blob,
    options: ExportOptions
  ): Promise<Blob> {
    // Convert blob to Uint8Array
    const arrayBuffer = await pngBlob.arrayBuffer();
    const inputData = new Uint8Array(arrayBuffer);

    // Convert using ImageMagick
    const outputData = await this.magickService.convertFormat(
      inputData,
      'png',
      options.format
    );

    // Convert back to Blob
    return new Blob([outputData as any], {
      type: `image/${options.format}`,
    });
  }

  /**
   * Check if background conversion is needed
   */
  private needsBackgroundConversion(
    doc: DocumentModel,
    options: ExportOptions
  ): boolean {
    const background = options.background ?? doc.background;
    
    // JPEG doesn't support transparency
    if (options.format === 'jpeg' && background.transparent) {
      return true;
    }

    // Background color override
    if (options.background && options.background !== doc.background) {
      return true;
    }

    return false;
  }

  /**
   * Load image from blob
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
