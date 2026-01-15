import { TestBed } from '@angular/core/testing';
import { ShapeService } from './shape.service';
import * as fabric from 'fabric';

describe('ShapeService', () => {
  let service: ShapeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ShapeService],
    });

    service = TestBed.inject(ShapeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createPolygonPoints', () => {
    it('should create pentagon points (5 sides)', () => {
      const points = service.createPolygonPoints(0, 0, 5, 50);

      expect(points.length).toBe(5);
      points.forEach(point => {
        const distance = Math.sqrt(point.x ** 2 + point.y ** 2);
        expect(distance).toBeCloseTo(50, 0);
      });
    });

    it('should create hexagon points (6 sides)', () => {
      const points = service.createPolygonPoints(0, 0, 6, 50);

      expect(points.length).toBe(6);
    });

    it('should create octagon points (8 sides)', () => {
      const points = service.createPolygonPoints(0, 0, 8, 50);

      expect(points.length).toBe(8);
    });

    it('should handle different center coordinates', () => {
      const points = service.createPolygonPoints(100, 100, 4, 50);

      expect(points.length).toBe(4);
      // Points should be centered at (100, 100)
      const avgX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      expect(avgX).toBeCloseTo(100, 0);
      expect(avgY).toBeCloseTo(100, 0);
    });
  });

  describe('createStarPoints', () => {
    it('should create 5-point star', () => {
      const points = service.createStarPoints(0, 0, 5, 50, 25);

      expect(points.length).toBe(10); // 5 points * 2 (outer + inner)
    });

    it('should alternate between outer and inner radii', () => {
      const points = service.createStarPoints(0, 0, 5, 50, 25);

      for (let i = 0; i < points.length; i++) {
        const distance = Math.sqrt(points[i].x ** 2 + points[i].y ** 2);
        const expectedRadius = i % 2 === 0 ? 50 : 25;
        expect(distance).toBeCloseTo(expectedRadius, 0);
      }
    });
  });

  describe('createHeartPath', () => {
    it('should create heart shape path', () => {
      const path = service.createHeartPath(100);

      expect(path).toBeTruthy();
      expect(path).toContain('M');
      expect(path).toContain('C');
      expect(path).toContain('Z');
    });

    it('should scale with size parameter', () => {
      const path1 = service.createHeartPath(100);
      const path2 = service.createHeartPath(200);

      expect(path1).not.toBe(path2);
    });
  });

  describe('createShapeClipPath', () => {
    it('should create circle clipPath', () => {
      const clipPath = service.createShapeClipPath('circle', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Circle);
    });

    it('should create square clipPath', () => {
      const clipPath = service.createShapeClipPath('square', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Rect);
    });

    it('should create triangle clipPath', () => {
      const clipPath = service.createShapeClipPath('triangle', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Triangle);
    });

    it('should create pentagon clipPath', () => {
      const clipPath = service.createShapeClipPath('pentagon', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Polygon);
    });

    it('should create hexagon clipPath', () => {
      const clipPath = service.createShapeClipPath('hexagon', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Polygon);
    });

    it('should create octagon clipPath', () => {
      const clipPath = service.createShapeClipPath('octagon', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Polygon);
    });

    it('should create star clipPath', () => {
      const clipPath = service.createShapeClipPath('star', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Polygon);
    });

    it('should create heart clipPath', () => {
      const clipPath = service.createShapeClipPath('heart', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Path);
    });

    it('should create diamond clipPath', () => {
      const clipPath = service.createShapeClipPath('diamond', 100, 100);

      expect(clipPath).toBeInstanceOf(fabric.Polygon);
    });

    it('should throw error for unknown shape type', () => {
      expect(() => {
        service.createShapeClipPath('unknown' as any, 100, 100);
      }).toThrowError('Unknown shape type: unknown');
    });

    it('should use minimum dimension for size', () => {
      const clipPath1 = service.createShapeClipPath('circle', 100, 200);
      const clipPath2 = service.createShapeClipPath('circle', 200, 100);

      // Both should use 50 (100/2) as radius
      expect((clipPath1 as fabric.Circle).radius).toBe((clipPath2 as fabric.Circle).radius);
    });
  });

  describe('createBasicShape', () => {
    let mockCanvas: jasmine.SpyObj<fabric.Canvas>;

    beforeEach(() => {
      mockCanvas = jasmine.createSpyObj('Canvas', ['add', 'setActiveObject', 'requestRenderAll']);
    });

    it('should create circle shape', () => {
      const shape = service.createBasicShape(mockCanvas, 'circle', 100, 100);

      expect(shape).toBeInstanceOf(fabric.Circle);
      expect(mockCanvas.add).toHaveBeenCalledWith(shape);
      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(shape);
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should create rect shape', () => {
      const shape = service.createBasicShape(mockCanvas, 'rect', 100, 100);

      expect(shape).toBeInstanceOf(fabric.Rect);
    });

    it('should create triangle shape', () => {
      const shape = service.createBasicShape(mockCanvas, 'triangle', 100, 100);

      expect(shape).toBeInstanceOf(fabric.Triangle);
    });

    it('should apply custom options', () => {
      const shape = service.createBasicShape(mockCanvas, 'circle', 100, 100, {
        radius: 30,
        fill: '#ff0000',
      });

      const circle = shape as fabric.Circle;
      expect(circle.radius).toBe(30);
      expect(circle.fill).toBe('#ff0000');
    });

    it('should throw error for unknown shape type', () => {
      expect(() => {
        service.createBasicShape(mockCanvas, 'unknown' as any, 100, 100);
      }).toThrowError('Unknown basic shape type: unknown');
    });
  });

  describe('createRoundedRectClipPath', () => {
    it('should create rounded rectangle clipPath', () => {
      const clipPath = service.createRoundedRectClipPath(100, 100, 20);

      expect(clipPath).toBeInstanceOf(fabric.Rect);
      expect(clipPath?.rx).toBeGreaterThan(0);
      expect(clipPath?.ry).toBeGreaterThan(0);
    });

    it('should return undefined for 0 radius', () => {
      const clipPath = service.createRoundedRectClipPath(100, 100, 0);

      expect(clipPath).toBeUndefined();
    });

    it('should calculate radius as percentage', () => {
      const clipPath1 = service.createRoundedRectClipPath(100, 100, 50);
      const clipPath2 = service.createRoundedRectClipPath(200, 200, 50);

      // 50% of 50 (min dimension/2) = 25
      expect(clipPath1?.rx).toBe(25);
      // 50% of 100 (min dimension/2) = 50
      expect(clipPath2?.rx).toBe(50);
    });

    it('should use minimum dimension for radius calculation', () => {
      const clipPath = service.createRoundedRectClipPath(200, 100, 50);

      // Should use 100 (min dimension) for calculation: 50% of 50 = 25
      expect(clipPath?.rx).toBe(25);
    });
  });
});
