import { TestBed } from '@angular/core/testing';
import { ImageManipulationService } from './image-manipulation.service';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { ShapeService } from './shape.service';
import * as fabric from 'fabric';
import { ImageObject } from '../core/models/document.model';

describe('ImageManipulationService', () => {
  let service: ImageManipulationService;
  let mockDocumentStore: jasmine.SpyObj<DocumentStoreService>;
  let mockHistory: jasmine.SpyObj<HistoryService>;
  let mockShapeService: jasmine.SpyObj<ShapeService>;
  let mockCanvas: jasmine.SpyObj<fabric.Canvas>;

  beforeEach(() => {
    mockDocumentStore = jasmine.createSpyObj('DocumentStoreService', ['getObject']);
    mockHistory = jasmine.createSpyObj('HistoryService', ['run']);
    mockShapeService = jasmine.createSpyObj('ShapeService', [
      'createShapeClipPath',
      'createRoundedRectClipPath',
    ]);
    mockCanvas = jasmine.createSpyObj('Canvas', ['getActiveObject', 'requestRenderAll']);

    TestBed.configureTestingModule({
      providers: [
        ImageManipulationService,
        { provide: DocumentStoreService, useValue: mockDocumentStore },
        { provide: HistoryService, useValue: mockHistory },
        { provide: ShapeService, useValue: mockShapeService },
      ],
    });

    service = TestBed.inject(ImageManipulationService);
    mockHistory.run.and.returnValue(Promise.resolve());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setBlendMode', () => {
    it('should set blend mode for selected image', async () => {
      const mockImage = new fabric.Image(new Image());
      const imageObj: ImageObject = {
        id: 'img-1',
        type: 'image',
        assetId: 'asset-1',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      };

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockDocumentStore.getObject.and.returnValue(imageObj);

      const getFabricObjectId = jasmine.createSpy('getFabricObjectId').and.returnValue('img-1');
      const updateObject = jasmine.createSpy('updateObject').and.returnValue(Promise.resolve());

      await service.setBlendMode(mockCanvas, getFabricObjectId, updateObject, 'multiply');

      expect(updateObject).toHaveBeenCalledWith(jasmine.objectContaining({
        globalCompositeOperation: 'multiply',
      }));
    });

    it('should handle no active object', async () => {
      mockCanvas.getActiveObject.and.returnValue(null);
      const updateObject = jasmine.createSpy('updateObject');

      await service.setBlendMode(mockCanvas, () => null, updateObject, 'multiply');

      expect(updateObject).not.toHaveBeenCalled();
    });
  });

  describe('setOpacity', () => {
    it('should set opacity for selected object', async () => {
      const mockImage = new fabric.Image(new Image());
      const imageObj: ImageObject = {
        id: 'img-1',
        type: 'image',
        assetId: 'asset-1',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      };

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockDocumentStore.getObject.and.returnValue(imageObj);

      const getFabricObjectId = jasmine.createSpy('getFabricObjectId').and.returnValue('img-1');
      const updateObject = jasmine.createSpy('updateObject').and.returnValue(Promise.resolve());

      await service.setOpacity(mockCanvas, getFabricObjectId, updateObject, 0.5);

      expect(updateObject).toHaveBeenCalledWith(jasmine.objectContaining({
        opacity: 0.5,
      }));
    });
  });

  describe('applyShapeMask', () => {
    it('should apply shape mask to image', async () => {
      const mockImage = new fabric.Image(new Image());
      mockImage.set({ width: 100, height: 100 });
      const imageObj: ImageObject = {
        id: 'img-1',
        type: 'image',
        assetId: 'asset-1',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      };

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockDocumentStore.getObject.and.returnValue(imageObj);
      mockShapeService.createShapeClipPath.and.returnValue(new fabric.Circle({ radius: 50 }));

      const getFabricObjectId = jasmine.createSpy('getFabricObjectId').and.returnValue('img-1');
      const selectObjectById = jasmine.createSpy('selectObjectById');
      const setIsProgrammaticUpdate = jasmine.createSpy('setIsProgrammaticUpdate');

      await service.applyShapeMask(
        mockCanvas,
        getFabricObjectId,
        selectObjectById,
        setIsProgrammaticUpdate,
        'circle'
      );

      expect(mockShapeService.createShapeClipPath).toHaveBeenCalledWith('circle', 100, 100);
      expect(mockHistory.run).toHaveBeenCalled();
    });
  });

  describe('applyRoundedCorners', () => {
    it('should apply rounded corners to image', async () => {
      const mockImage = new fabric.Image(new Image());
      mockImage.set({ width: 100, height: 100 });
      const imageObj: ImageObject = {
        id: 'img-1',
        type: 'image',
        assetId: 'asset-1',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      };

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockDocumentStore.getObject.and.returnValue(imageObj);
      mockShapeService.createRoundedRectClipPath.and.returnValue(
        new fabric.Rect({ width: 100, height: 100, rx: 10, ry: 10 })
      );

      const getFabricObjectId = jasmine.createSpy('getFabricObjectId').and.returnValue('img-1');
      const selectObjectById = jasmine.createSpy('selectObjectById');
      const setIsProgrammaticUpdate = jasmine.createSpy('setIsProgrammaticUpdate');

      await service.applyRoundedCorners(
        mockCanvas,
        getFabricObjectId,
        selectObjectById,
        setIsProgrammaticUpdate,
        20
      );

      expect(mockShapeService.createRoundedRectClipPath).toHaveBeenCalledWith(100, 100, 20);
      expect(mockHistory.run).toHaveBeenCalled();
    });
  });

  describe('removeClipPath', () => {
    it('should remove clip path from image', async () => {
      const mockImage = new fabric.Image(new Image());
      const imageObj: ImageObject = {
        id: 'img-1',
        type: 'image',
        assetId: 'asset-1',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      };

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockDocumentStore.getObject.and.returnValue(imageObj);

      const getFabricObjectId = jasmine.createSpy('getFabricObjectId').and.returnValue('img-1');
      const selectObjectById = jasmine.createSpy('selectObjectById');
      const setIsProgrammaticUpdate = jasmine.createSpy('setIsProgrammaticUpdate');

      await service.removeClipPath(
        mockCanvas,
        getFabricObjectId,
        selectObjectById,
        setIsProgrammaticUpdate
      );

      expect(mockHistory.run).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
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
      });
      mockImage.setCoords = jasmine.createSpy('setCoords');

      const imageObj: ImageObject = {
        id: 'img-1',
        type: 'image',
        assetId: 'asset-1',
        x: 100,
        y: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      };

      mockCanvas.getActiveObject.and.returnValue(mockImage);
      mockDocumentStore.getObject.and.returnValue(imageObj);

      const getFabricObjectId = jasmine.createSpy('getFabricObjectId').and.returnValue('img-1');

      await service.resizeImage(mockCanvas, getFabricObjectId, 400, 200);

      expect(mockHistory.run).toHaveBeenCalled();
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });
  });
});
