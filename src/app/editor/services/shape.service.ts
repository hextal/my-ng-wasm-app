import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

/**
 * ShapeService - Manages shape creation and masking operations
 * Handles geometry calculations and clipPath creation
 * Following Single Responsibility Principle
 */
@Injectable({
  providedIn: 'root',
})
export class ShapeService {
  /**
   * Create shape geometry helper for polygons
   */
  createPolygonPoints(
    centerX: number,
    centerY: number,
    sides: number,
    radius: number
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = ((Math.PI * 2) / sides) * i - Math.PI / 2;
      points.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }
    return points;
  }

  /**
   * Create star shape geometry
   */
  createStarPoints(
    centerX: number,
    centerY: number,
    points: number,
    outerRadius: number,
    innerRadius: number
  ): { x: number; y: number }[] {
    const angle = Math.PI / points;
    const starPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const currentAngle = i * angle - Math.PI / 2;
      starPoints.push({
        x: centerX + radius * Math.cos(currentAngle),
        y: centerY + radius * Math.sin(currentAngle),
      });
    }

    return starPoints;
  }

  /**
   * Create heart shape path
   */
  createHeartPath(size: number): string {
    const scale = size / 100;
    return (
      `M ${50 * scale},${30 * scale} ` +
      `C ${50 * scale},${10 * scale} ${30 * scale},${0 * scale} ${10 * scale},${0 * scale} ` +
      `C ${-10 * scale},${0 * scale} ${-30 * scale},${10 * scale} ${-30 * scale},${30 * scale} ` +
      `C ${-30 * scale},${50 * scale} ${-10 * scale},${70 * scale} ${50 * scale},${110 * scale} ` +
      `C ${110 * scale},${70 * scale} ${130 * scale},${50 * scale} ${130 * scale},${30 * scale} ` +
      `C ${130 * scale},${10 * scale} ${110 * scale},${0 * scale} ${90 * scale},${0 * scale} ` +
      `C ${70 * scale},${0 * scale} ${50 * scale},${10 * scale} ${50 * scale},${30 * scale} Z`
    );
  }

  /**
   * Create shape clipPath for masking
   */
  createShapeClipPath(
    shapeType: 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'heart' | 'diamond',
    width: number,
    height: number
  ): fabric.Object {
    const size = Math.min(width, height) / 2;
    let clipPath: fabric.Object;

    switch (shapeType) {
      case 'circle':
        clipPath = new fabric.Circle({
          radius: size,
          originX: 'center',
          originY: 'center',
        });
        break;

      case 'square':
        clipPath = new fabric.Rect({
          width: size * 2,
          height: size * 2,
          originX: 'center',
          originY: 'center',
        });
        break;

      case 'triangle':
        clipPath = new fabric.Triangle({
          width: size * 2,
          height: size * 2,
          originX: 'center',
          originY: 'center',
        });
        break;

      case 'pentagon':
        clipPath = new fabric.Polygon(this.createPolygonPoints(0, 0, 5, size), {
          originX: 'center',
          originY: 'center',
        });
        break;

      case 'hexagon':
        clipPath = new fabric.Polygon(this.createPolygonPoints(0, 0, 6, size), {
          originX: 'center',
          originY: 'center',
        });
        break;

      case 'octagon':
        clipPath = new fabric.Polygon(this.createPolygonPoints(0, 0, 8, size), {
          originX: 'center',
          originY: 'center',
        });
        break;

      case 'star':
        clipPath = new fabric.Polygon(
          this.createStarPoints(0, 0, 5, size, size * 0.5),
          { originX: 'center', originY: 'center' }
        );
        break;

      case 'heart':
        clipPath = new fabric.Path(this.createHeartPath(size), {
          originX: 'center',
          originY: 'center',
        });
        break;

      case 'diamond':
        clipPath = new fabric.Polygon(
          [
            { x: 0, y: -size },
            { x: size * 0.7, y: 0 },
            { x: 0, y: size },
            { x: -size * 0.7, y: 0 },
          ],
          {
            originX: 'center',
            originY: 'center',
          }
        );
        break;

      default:
        throw new Error(`Unknown shape type: ${shapeType}`);
    }

    return clipPath;
  }

  /**
   * Add a basic shape to the canvas
   */
  createBasicShape(
    canvas: fabric.Canvas,
    shapeType: 'circle' | 'rect' | 'triangle',
    centerX: number,
    centerY: number,
    options?: any
  ): fabric.Object {
    let shape: fabric.Object;

    switch (shapeType) {
      case 'circle':
        shape = new fabric.Circle({
          left: centerX,
          top: centerY,
          radius: options?.radius || 50,
          fill: options?.fill || '#3b82f6',
          stroke: options?.stroke || '#1e40af',
          strokeWidth: options?.strokeWidth || 2,
        });
        break;

      case 'rect':
        shape = new fabric.Rect({
          left: centerX,
          top: centerY,
          width: options?.width || 100,
          height: options?.height || 100,
          fill: options?.fill || '#3b82f6',
          stroke: options?.stroke || '#1e40af',
          strokeWidth: options?.strokeWidth || 2,
        });
        break;

      case 'triangle':
        shape = new fabric.Triangle({
          left: centerX,
          top: centerY,
          width: options?.width || 100,
          height: options?.height || 100,
          fill: options?.fill || '#3b82f6',
          stroke: options?.stroke || '#1e40af',
          strokeWidth: options?.strokeWidth || 2,
        });
        break;

      default:
        throw new Error(`Unknown basic shape type: ${shapeType}`);
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.requestRenderAll();

    return shape;
  }

  /**
   * Create rounded rectangle clipPath
   */
  createRoundedRectClipPath(
    width: number,
    height: number,
    radiusPercent: number
  ): fabric.Rect | undefined {
    if (radiusPercent === 0) {
      return undefined;
    }

    const minDimension = Math.min(width, height);
    const radiusPixels = (radiusPercent / 100) * (minDimension / 2);

    return new fabric.Rect({
      width: width,
      height: height,
      rx: radiusPixels,
      ry: radiusPixels,
      originX: 'center',
      originY: 'center',
    });
  }
}
