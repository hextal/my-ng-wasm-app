import { Injectable, inject } from '@angular/core';
import { CanvasService } from './canvas.service';

export type ShapeClipType = 'circle' | 'rounded-square' | 'heart' | 'star' | 'hexagon' | 'diamond';

/**
 * ImageTransformationService handles image transformations.
 * Follows Single Responsibility Principle - ONLY handles image transformations.
 */
@Injectable({
  providedIn: 'root'
})
export class ImageTransformationService {
  private canvasService = inject(CanvasService);

  /**
   * Flip image horizontally
   */
  flipHorizontal(imgData: ImageData): ImageData {
    const width = imgData.width;
    const height = imgData.height;
    
    // Draw original image to temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imgData, 0, 0);
    
    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d')!;
    
    // Apply horizontal flip transformation
    ctx.scale(-1, 1);
    ctx.drawImage(tempCanvas, -width, 0);
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Flip image vertically
   */
  flipVertical(imgData: ImageData): ImageData {
    const width = imgData.width;
    const height = imgData.height;
    
    // Draw original image to temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imgData, 0, 0);
    
    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d')!;
    
    // Apply vertical flip transformation
    ctx.scale(1, -1);
    ctx.drawImage(tempCanvas, 0, -height);
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Rotate image by specified angle
   */
  rotate(imgData: ImageData, angle: number): ImageData {
    // Store original dimensions
    const origWidth = imgData.width;
    const origHeight = imgData.height;
    
    // Draw original image to temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = origWidth;
    tempCanvas.height = origHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imgData, 0, 0);
    
    const radians = (angle * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    
    // Calculate new canvas size to fit rotated image
    const newWidth = Math.ceil(origWidth * cos + origHeight * sin);
    const newHeight = Math.ceil(origWidth * sin + origHeight * cos);
    
    // Create output canvas with new dimensions
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = newWidth;
    outputCanvas.height = newHeight;
    const ctx = outputCanvas.getContext('2d')!;
    
    // Translate to center and rotate
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(tempCanvas, -origWidth / 2, -origHeight / 2);
    
    return ctx.getImageData(0, 0, newWidth, newHeight);
  }

  /**
   * Crop image to specified rectangle
   */
  crop(imgData: ImageData, x: number, y: number, width: number, height: number): ImageData {
    // Clamp values to image bounds
    const clampedX = Math.max(0, Math.min(x, imgData.width - 1));
    const clampedY = Math.max(0, Math.min(y, imgData.height - 1));
    const clampedWidth = Math.min(width, imgData.width - clampedX);
    const clampedHeight = Math.min(height, imgData.height - clampedY);
    
    if (clampedWidth <= 0 || clampedHeight <= 0) {
      throw new Error('Invalid crop dimensions');
    }
    
    // Create temporary canvas with current image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imgData.width;
    tempCanvas.height = imgData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imgData, 0, 0);
    
    // Create new canvas for cropped image
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = clampedWidth;
    cropCanvas.height = clampedHeight;
    const cropCtx = cropCanvas.getContext('2d')!;
    
    // Draw the cropped portion
    cropCtx.drawImage(
      tempCanvas,
      clampedX, clampedY, clampedWidth, clampedHeight,
      0, 0, clampedWidth, clampedHeight
    );
    
    return cropCtx.getImageData(0, 0, clampedWidth, clampedHeight);
  }

  /**
   * Apply shape clip to image
   */
  applyShapeClip(
    imgData: ImageData,
    shape: ShapeClipType,
    borderWidth: number = 0,
    borderColor: string = '#000000',
    backgroundColor: string = 'transparent'
  ): ImageData {
    const width = imgData.width;
    const height = imgData.height;
    
    // Draw original image to temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imgData, 0, 0);
    
    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d')!;
    
    // Fill background color if specified
    if (backgroundColor && backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    
    // Create clipping path
    ctx.save();
    this.createShapePath(ctx, width, height, shape);
    ctx.clip();
    
    // Draw image inside clip
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
    
    // Draw border if specified
    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      this.createShapePath(ctx, width, height, shape);
      ctx.stroke();
    }
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Apply corner radius to image
   */
  applyCornerRadius(imgData: ImageData, radiusPercentage: number): ImageData {
    if (radiusPercentage === 0) return imgData;
    
    const width = imgData.width;
    const height = imgData.height;
    
    // Draw original image to temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imgData, 0, 0);
    
    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d')!;
    
    // Calculate radius as percentage of smaller dimension
    const smallerDimension = Math.min(width, height);
    const radiusInPixels = (radiusPercentage / 100) * (smallerDimension / 2);
    
    // Create rounded rectangle clip path
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    this.canvasService.roundRect(ctx, 0, 0, width, height, radiusInPixels);
    ctx.closePath();
    ctx.clip();
    
    // Draw the image from temp canvas
    ctx.drawImage(tempCanvas, 0, 0);
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Invert colors
   */
  invert(imgData: ImageData): ImageData {
    const data = new Uint8ClampedArray(imgData.data);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];         // Red
      data[i + 1] = 255 - data[i + 1]; // Green
      data[i + 2] = 255 - data[i + 2]; // Blue
    }
    return new ImageData(data, imgData.width, imgData.height);
  }

  /**
   * Create shape path for clipping
   */
  private createShapePath(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    shape: ShapeClipType
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height);
    const radius = size / 2;
    
    ctx.beginPath();
    
    switch (shape) {
      case 'circle':
        const circleRadius = Math.min(width, height) / 2;
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
        break;
        
      case 'rounded-square':
        const squareSize = Math.min(width, height);
        const x = (width - squareSize) / 2;
        const y = (height - squareSize) / 2;
        const cornerRadius = squareSize * 0.1;
        this.canvasService.roundRect(ctx, x, y, squareSize, squareSize, cornerRadius);
        break;
        
      case 'heart':
        this.drawHeart(ctx, centerX, centerY, size * 0.45);
        break;
        
      case 'star':
        this.drawStar(ctx, centerX, centerY, 5, radius * 0.9, radius * 0.4);
        break;
        
      case 'hexagon':
        this.drawPolygon(ctx, centerX, centerY, 6, radius * 0.9);
        break;
        
      case 'diamond':
        this.drawDiamond(ctx, centerX, centerY, size * 0.8);
        break;
    }
    
    ctx.closePath();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const topY = y - size * 0.3;
    ctx.moveTo(x, topY + size);
    ctx.bezierCurveTo(x, topY, x - size / 2, topY - size / 2, x - size, topY);
    ctx.bezierCurveTo(x - size * 1.3, topY, x - size * 1.3, topY + size / 3, x - size * 1.3, topY + size / 3);
    ctx.bezierCurveTo(x - size * 1.3, topY + size * 0.55, x - size * 0.9, topY + size * 0.77, x, topY + size * 1.3);
    ctx.bezierCurveTo(x + size * 0.9, topY + size * 0.77, x + size * 1.3, topY + size * 0.55, x + size * 1.3, topY + size / 3);
    ctx.bezierCurveTo(x + size * 1.3, topY + size / 3, x + size * 1.3, topY, x + size, topY);
    ctx.bezierCurveTo(x + size / 2, topY - size / 2, x, topY, x, topY + size);
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
  }

  private drawPolygon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    sides: number,
    radius: number
  ): void {
    const angle = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;
    
    for (let i = 0; i <= sides; i++) {
      const x = cx + radius * Math.cos(startAngle + i * angle);
      const y = cy + radius * Math.sin(startAngle + i * angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    const halfSize = size / 2;
    ctx.moveTo(cx, cy - halfSize);
    ctx.lineTo(cx + halfSize, cy);
    ctx.lineTo(cx, cy + halfSize);
    ctx.lineTo(cx - halfSize, cy);
    ctx.lineTo(cx, cy - halfSize);
  }
}
