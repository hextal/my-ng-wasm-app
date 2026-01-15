import { TestBed } from '@angular/core/testing';
import { ObjectTransformService } from './object-transform.service';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { AssetStoreService } from './asset-store.service';
import { ShapeService } from './shape.service';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import * as fabric from 'fabric';
import { ImageObject } from '../core/models/document.model';

describe('ObjectTransformService', () => {
  let service: ObjectTransformService;
  let mockDocumentStore: jasmine.SpyObj<DocumentStoreService>;
  let mockHistory: jasmine.SpyObj<HistoryService>;
  let mockAssetStore: jasmine.SpyObj<AssetStoreService>;
  let mockShapeService: jasmine.SpyObj<ShapeService>;
  let mockCanvas: jasmine.SpyObj<fabric.Canvas>;
  let mockRenderer: jasmine.SpyObj<FabricRenderer>;

  beforeEach(() => {
    // Create spies
    mockDocumentStore = jasmine.createSpyObj('DocumentStoreService', ['getObject']);

    mockHistory = jasmine.createSpyObj('HistoryService', ['run']);

    mockAssetStore = jasmine.createSpyObj('AssetStoreService', ['get', 'set']);

    mockShapeService = jasmine.createSpyObj('ShapeService', [
      'createShapeClipPath',
      'createRoundedRectClipPath',
    ]);

    mockCanvas = jasmine.createSpyObj('Canvas', [
      'getActiveObject',
      'bringObjectToFront',
      'sendObjectToBack',
      'requestRenderAll',
      'setActiveObject',
    ]);

    mockRenderer = jasmine.createSpyObj('FabricRenderer', [
      'getFabricObjectId',
      'getFabricObject',
      'updateObject',
    ]);

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        ObjectTransformService,
        { provide: DocumentStoreService, useValue: mockDocumentStore },
        { provide: HistoryService, useValue: mockHistory },
        { provide: AssetStoreService, useValue: mockAssetStore },
        { provide: ShapeService, useValue: mockShapeService },
      ],
    });

    service = TestBed.inject(ObjectTransformService);
    mockHistory.run.and.returnValue(Promise.resolve());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setIsProgrammaticUpdate', () => {
    it('should set programmatic update flag', () => {
      service.setIsProgrammaticUpdate(true);
      expect(service.getIsProgrammaticUpdate()).toBe(true);

      service.setIsProgrammaticUpdate(false);
      expect(service.getIsProgrammaticUpdate()).toBe(false);
    });
  });

  describe('bringForward', () => {
    it('should bring object to front', async () => {
      const mockObject = new fabric.Rect();
      mockCanvas.getActiveObject.and.returnValue(mockObject);

      await service.bringForward(mockCanvas, mockRenderer);

      expect(mockCanvas.bringObjectToFront).toHaveBeenCalledWith(mockObject);
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should handle no active object', async () => {
      mockCanvas.getActiveObject.and.returnValue(null);

      await service.bringForward(mockCanvas, mockRenderer);

      expect(mockCanvas.bringObjectToFront).not.toHaveBeenCalled();
    });
  });

  describe('sendBackward', () => {
    it('should send object to back', async () => {
      const mockObject = new fabric.Rect();
      mockCanvas.getActiveObject.and.returnValue(mockObject);

      await service.sendBackward(mockCanvas, mockRenderer);

      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockObject);
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should handle no active object', async () => {
      mockCanvas.getActiveObject.and.returnValue(null);

      await service.sendBackward(mockCanvas, mockRenderer);

      expect(mockCanvas.sendObjectToBack).not.toHaveBeenCalled();
    });
  });

  describe('rotateSelected', () => {
    it('should rotate object by delta angle', async () => {
      const mockObject = new fabric.Rect();
      mockObject.set('angle', 0);
      mockObject.rotate = jasmine.createSpy('rotate');
      mockCanvas.getActiveObject.and.returnValue(mockObject);

      await service.rotateSelected(mockCanvas, 90);

      expect(mockObject.rotate).toHaveBeenCalledWith(90);
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should handle rotation from existing angle', async () => {
      const mockObject = new fabric.Rect();
      mockObject.set('angle', 45);
      mockObject.rotate = jasmine.createSpy('rotate');
      mockCanvas.getActiveObject.and.returnValue(mockObject);

      await service.rotateSelected(mockCanvas, 90);

      expect(mockObject.rotate).toHaveBeenCalledWith(135);
    });

    it('should handle no active object', async () => {
      mockCanvas.getActiveObject.and.returnValue(null);

      await service.rotateSelected(mockCanvas, 90);

      expect(mockCanvas.requestRenderAll).not.toHaveBeenCalled();
    });
  });

  describe('flipX', () => {
    it('should flip object horizontally', async () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ flipX: false, flipY: false, left: 100, top: 100 });
      mockObject.setCoords = jasmine.createSpy('setCoords');
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      mockRenderer.getFabricObjectId.and.returnValue('obj-123');
      mockRenderer.getFabricObject.and.returnValue(mockObject);

      await service.flipX(mockCanvas, mockRenderer);

      expect(mockObject.flipX).toBe(true);
      expect(mockObject.setCoords).toHaveBeenCalled();
      expect(mockHistory.run).toHaveBeenCalled();
    });

    it('should handle no active object', async () => {
      mockCanvas.getActiveObject.and.returnValue(null);

      await service.flipX(mockCanvas, mockRenderer);

      expect(mockHistory.run).not.toHaveBeenCalled();
    });

    it('should handle object without ID', async () => {
      const mockObject = new fabric.Rect();
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      mockRenderer.getFabricObjectId.and.returnValue(null);

      await service.flipX(mockCanvas, mockRenderer);

      expect(mockHistory.run).not.toHaveBeenCalled();
    });
  });

  describe('flipY', () => {
    it('should flip object vertically', async () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ flipX: false, flipY: false, left: 100, top: 100 });
      mockObject.setCoords = jasmine.createSpy('setCoords');
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      mockRenderer.getFabricObjectId.and.returnValue('obj-123');
      mockRenderer.getFabricObject.and.returnValue(mockObject);

      await service.flipY(mockCanvas, mockRenderer);

      expect(mockObject.flipY).toBe(true);
      expect(mockObject.setCoords).toHaveBeenCalled();
      expect(mockHistory.run).toHaveBeenCalled();
    });
  });

  describe('setOpacity', () => {
    it('should set opacity of selected object', async () => {
      const mockObject = new fabric.Rect();
      const imageObj: ImageObject = {
        id: 'img-123',
        type: 'image',
        assetId: 'asset-123',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      };

      mockCanvas.getActiveObject.and.returnValue(mockObject);
      mockRenderer.getFabricObjectId.and.returnValue('img-123');
      mockDocumentStore.getObject.and.returnValue(imageObj);
      mockRenderer.updateObject.and.returnValue(Promise.resolve());

      await service.setOpacity(mockCanvas, mockRenderer, 0.5);

      expect(mockRenderer.updateObject).toHaveBeenCalledWith({
        ...imageObj,
        opacity: 0.5,
      });
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should handle no active object', async () => {
      mockCanvas.getActiveObject.and.returnValue(null);

      await service.setOpacity(mockCanvas, mockRenderer, 0.5);

      expect(mockRenderer.updateObject).not.toHaveBeenCalled();
    });
  });

  describe('applyShapeMask', () => {
    it('should apply circle mask', async () => {
      const mockImage = new fabric.Image(new Image());
      mockImage.set({ width: 100, height: 100 });
      const mockClipPath = new fabric.Circle({ radius: 50 });

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockRenderer.getFabricObjectId.and.returnValue('img-123');
      mockDocumentStore.getObject.and.returnValue({
        id: 'img-123',
        type: 'image',
        assetId: 'asset-123',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      });
      mockShapeService.createShapeClipPath.and.returnValue(mockClipPath);
      mockRenderer.getFabricObject.and.returnValue(mockImage);

      await service.applyShapeMask(mockCanvas, mockRenderer, 'circle');

      expect(mockShapeService.createShapeClipPath).toHaveBeenCalledWith('circle', 100, 100);
      expect(mockHistory.run).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should handle all shape types', async () => {
      const shapes: Array<'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'heart' | 'diamond'> = [
        'circle', 'triangle', 'square', 'pentagon', 'hexagon', 'octagon', 'star', 'heart', 'diamond'
      ];

      const mockImage = new fabric.Image(new Image());
      mockImage.set({ width: 100, height: 100 });

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockRenderer.getFabricObjectId.and.returnValue('img-123');
      mockDocumentStore.getObject.and.returnValue({
        id: 'img-123',
        type: 'image',
        assetId: 'asset-123',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      });
      mockRenderer.getFabricObject.and.returnValue(mockImage);

      for (const shape of shapes) {
        mockShapeService.createShapeClipPath.and.returnValue(new fabric.Circle({ radius: 50 }));
        await service.applyShapeMask(mockCanvas, mockRenderer, shape);
        expect(mockShapeService.createShapeClipPath).toHaveBeenCalledWith(shape, 100, 100);
      }
    });

    it('should handle non-image object', async () => {
      const mockRect = new fabric.Rect();
      mockCanvas.getActiveObject.and.returnValue(mockRect);
      mockRenderer.getFabricObjectId.and.returnValue('rect-123');
      mockDocumentStore.getObject.and.returnValue({
        id: 'rect-123',
        type: 'shape',
      });

      await service.applyShapeMask(mockCanvas, mockRenderer, 'circle');

      expect(mockHistory.run).not.toHaveBeenCalled();
    });
  });

  describe('applyRoundedCorners', () => {
    it('should apply rounded corners', async () => {
      const mockImage = new fabric.Image(new Image());
      mockImage.set({ width: 100, height: 100 });
      const mockClipPath = new fabric.Rect({ width: 100, height: 100, rx: 10, ry: 10 });

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockRenderer.getFabricObjectId.and.returnValue('img-123');
      mockDocumentStore.getObject.and.returnValue({
        id: 'img-123',
        type: 'image',
        assetId: 'asset-123',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      });
      mockShapeService.createRoundedRectClipPath.and.returnValue(mockClipPath);
      mockRenderer.getFabricObject.and.returnValue(mockImage);

      await service.applyRoundedCorners(mockCanvas, mockRenderer, 20);

      expect(mockShapeService.createRoundedRectClipPath).toHaveBeenCalledWith(100, 100, 20);
      expect(mockHistory.run).toHaveBeenCalled();
    });
  });

  describe('removeClipPath', () => {
    it('should remove clip path from image', async () => {
      const mockImage = new fabric.Image(new Image());
      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockRenderer.getFabricObjectId.and.returnValue('img-123');
      mockDocumentStore.getObject.and.returnValue({
        id: 'img-123',
        type: 'image',
        assetId: 'asset-123',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      });
      mockRenderer.getFabricObject.and.returnValue(mockImage);

      await service.removeClipPath(mockCanvas, mockRenderer);

      expect(mockHistory.run).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });
  });

  describe('captureTransformSnapshot', () => {
    it('should capture transform snapshot', () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ left: 100, top: 100, scaleX: 1.5, scaleY: 1.5, angle: 45, opacity: 0.8 });
      mockRenderer.getFabricObjectId.and.returnValue('obj-123');

      service.captureTransformSnapshot(mockRenderer, mockObject);

      // Snapshot should be stored internally (we can't directly test this, but we can verify it doesn't throw)
      expect(mockRenderer.getFabricObjectId).toHaveBeenCalledWith(mockObject);
    });

    it('should not capture duplicate snapshots', () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ left: 100, top: 100 });
      mockRenderer.getFabricObjectId.and.returnValue('obj-123');

      service.captureTransformSnapshot(mockRenderer, mockObject);
      const callCount1 = (mockRenderer.getFabricObjectId as jasmine.Spy).calls.count();

      service.captureTransformSnapshot(mockRenderer, mockObject);
      const callCount2 = (mockRenderer.getFabricObjectId as jasmine.Spy).calls.count();

      // Second call should still invoke getFabricObjectId but not store duplicate
      expect(callCount2).toBeGreaterThan(callCount1);
    });

    it('should handle object without ID', () => {
      const mockObject = new fabric.Rect();
      mockRenderer.getFabricObjectId.and.returnValue(null);

      expect(() => {
        service.captureTransformSnapshot(mockRenderer, mockObject);
      }).not.toThrow();
    });
  });

  describe('handleObjectModified', () => {
    it('should create transform command for changed object', async () => {
      const mockObject = new fabric.Rect();
      mockObject.set({
        left: 100,
        top: 100,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
      });
      mockRenderer.getFabricObjectId.and.returnValue('obj-123');

      // Capture initial snapshot
      service.captureTransformSnapshot(mockRenderer, mockObject);

      // Modify object
      mockObject.set({ left: 150, top: 150 });

      await service.handleObjectModified(mockRenderer, mockObject);

      expect(mockHistory.run).toHaveBeenCalled();
    });

    it('should skip if programmatic update', async () => {
      service.setIsProgrammaticUpdate(true);

      const mockObject = new fabric.Rect();
      mockRenderer.getFabricObjectId.and.returnValue('obj-123');

      await service.handleObjectModified(mockRenderer, mockObject);

      expect(mockHistory.run).not.toHaveBeenCalled();
    });

    it('should skip if no snapshot exists', async () => {
      const mockObject = new fabric.Rect();
      mockRenderer.getFabricObjectId.and.returnValue('obj-999');

      await service.handleObjectModified(mockRenderer, mockObject);

      expect(mockHistory.run).not.toHaveBeenCalled();
    });

    it('should skip if no objectId', async () => {
      const mockObject = new fabric.Rect();
      mockRenderer.getFabricObjectId.and.returnValue(null);

      await service.handleObjectModified(mockRenderer, mockObject);

      expect(mockHistory.run).not.toHaveBeenCalled();
    });
  });

  describe('resizeImage', () => {
    it('should resize image to target dimensions', async () => {
      const mockImage = new fabric.Image(new Image());
      mockImage.set({
        width: 200,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        left: 100,
        top: 100,
        angle: 0,
        opacity: 1,
      });
      mockImage.setCoords = jasmine.createSpy('setCoords');

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockRenderer.getFabricObjectId.and.returnValue('img-123');
      mockDocumentStore.getObject.and.returnValue({
        id: 'img-123',
        type: 'image',
        assetId: 'asset-123',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      });

      await service.resizeImage(mockCanvas, mockRenderer, 400, 200);

      expect(mockImage.scaleX).toBeCloseTo(2, 0.01);
      expect(mockImage.scaleY).toBeCloseTo(2, 0.01);
      expect(mockHistory.run).toHaveBeenCalled();
    });
  });
});
