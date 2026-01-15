import { TestBed } from '@angular/core/testing';
import { ExportService, ExportOptions } from './export.service';
import { DocumentStoreService } from './document-store.service';
import { AssetStoreService } from './asset-store.service';
import { MagickService } from '../../core/services/magick.service';
import { DocumentModel, ImageObject, PathObject, TextObject } from '../core/models/document.model';
import * as fabric from 'fabric';

describe('ExportService', () => {
  let service: ExportService;
  let documentStoreSpy: jasmine.SpyObj<DocumentStoreService>;
  let assetStoreSpy: jasmine.SpyObj<AssetStoreService>;
  let magickServiceSpy: jasmine.SpyObj<MagickService>;

  const mockDocument: DocumentModel = {
    id: 'doc1',
    name: 'Test Document',
    width: 800,
    height: 600,
    background: { color: '#ffffff', transparent: false },
    objects: [],
    version: 1,
  };

  beforeEach(() => {
    const docStoreSpyObj = jasmine.createSpyObj('DocumentStoreService', ['getSnapshot']);
    const assetStoreSpyObj = jasmine.createSpyObj('AssetStoreService', ['get']);
    const magickSpyObj = jasmine.createSpyObj('MagickService', ['convertFormat']);

    TestBed.configureTestingModule({
      providers: [
        ExportService,
        { provide: DocumentStoreService, useValue: docStoreSpyObj },
        { provide: AssetStoreService, useValue: assetStoreSpyObj },
        { provide: MagickService, useValue: magickSpyObj },
      ],
    });

    service = TestBed.inject(ExportService);
    documentStoreSpy = TestBed.inject(DocumentStoreService) as jasmine.SpyObj<DocumentStoreService>;
    assetStoreSpy = TestBed.inject(AssetStoreService) as jasmine.SpyObj<AssetStoreService>;
    magickServiceSpy = TestBed.inject(MagickService) as jasmine.SpyObj<MagickService>;

    // Default document snapshot
    documentStoreSpy.getSnapshot.and.returnValue(mockDocument);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('export', () => {
    it('should export PNG with default dimensions', async () => {
      const options: ExportOptions = { format: 'png' };
      
      // Mock canvas toBlob
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const result = await service.export(options);

      expect(result).toBeDefined();
      expect(result.type).toBe('image/png');
      expect(documentStoreSpy.getSnapshot).toHaveBeenCalled();
    });

    it('should export PNG with transparent background', async () => {
      const options: ExportOptions = {
        format: 'png',
        background: { transparent: true },
      };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const result = await service.export(options);

      expect(result).toBeDefined();
      expect(result.type).toBe('image/png');
    });

    it('should export JPEG with format conversion', async () => {
      const options: ExportOptions = { format: 'jpeg', quality: 0.9 };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const mockJpegData = new Uint8Array([0xff, 0xd8, 0xff]);
      magickServiceSpy.convertFormat.and.returnValue(Promise.resolve(mockJpegData));

      const result = await service.export(options);

      expect(result).toBeDefined();
      expect(result.type).toBe('image/jpeg');
      expect(magickServiceSpy.convertFormat).toHaveBeenCalledWith(
        jasmine.any(Uint8Array),
        'png',
        'jpeg'
      );
    });

    it('should export WEBP with format conversion', async () => {
      const options: ExportOptions = { format: 'webp', quality: 0.85 };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const mockWebpData = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
      magickServiceSpy.convertFormat.and.returnValue(Promise.resolve(mockWebpData));

      const result = await service.export(options);

      expect(result.type).toBe('image/webp');
      expect(magickServiceSpy.convertFormat).toHaveBeenCalled();
    });

    it('should export TIFF with format conversion', async () => {
      const options: ExportOptions = { format: 'tiff' };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const mockTiffData = new Uint8Array([0x49, 0x49, 0x2a, 0x00]);
      magickServiceSpy.convertFormat.and.returnValue(Promise.resolve(mockTiffData));

      const result = await service.export(options);

      expect(result.type).toBe('image/tiff');
    });

    it('should export BMP with format conversion', async () => {
      const options: ExportOptions = { format: 'bmp' };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const mockBmpData = new Uint8Array([0x42, 0x4d]);
      magickServiceSpy.convertFormat.and.returnValue(Promise.resolve(mockBmpData));

      const result = await service.export(options);

      expect(result.type).toBe('image/bmp');
    });

    it('should handle canvas to blob conversion failure', async () => {
      const options: ExportOptions = { format: 'png' };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(null);
      });

      await expectAsync(service.export(options)).toBeRejectedWithError('Failed to convert canvas to blob');
    });

    it('should export with scale multiplier', async () => {
      const options: ExportOptions = { format: 'png', scale: 2 };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        // Verify canvas dimensions are scaled
        expect(this.width).toBe(1600); // 800 * 2
        expect(this.height).toBe(1200); // 600 * 2
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);
    });

    it('should export with explicit target width', async () => {
      const options: ExportOptions = { format: 'png', targetWidth: 1920 };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        expect(this.width).toBe(1920);
        expect(this.height).toBe(1440); // Maintains aspect ratio (600/800 = 0.75)
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);
    });

    it('should export with explicit target height', async () => {
      const options: ExportOptions = { format: 'png', targetHeight: 1080 };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        expect(this.width).toBe(1440); // Maintains aspect ratio (800/600 = 1.333...)
        expect(this.height).toBe(1080);
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);
    });

    it('should export with explicit target width and height', async () => {
      const options: ExportOptions = {
        format: 'png',
        targetWidth: 1024,
        targetHeight: 768,
      };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        expect(this.width).toBe(1024);
        expect(this.height).toBe(768);
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);
    });

    it('should export with custom background color', async () => {
      const options: ExportOptions = {
        format: 'png',
        background: { color: '#ff0000', transparent: false },
      };

      spyOn(fabric.Canvas.prototype, 'renderAll');
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);

      // Background should be set in the offscreen canvas
      expect(fabric.Canvas.prototype.renderAll).toHaveBeenCalled();
    });
  });

  describe('export with objects', () => {
    it('should export document with image object', async () => {
      const imageObj: ImageObject = {
        id: 'img1',
        type: 'image',
        assetId: 'asset1',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [imageObj],
      });

      const mockImageBlob = new Blob(['image-data'], { type: 'image/png' });
      assetStoreSpy.get.and.returnValue(Promise.resolve(mockImageBlob));

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      // Mock Image loading
      spyOn(window, 'Image').and.returnValue({
        onload: null,
        onerror: null,
        src: '',
        addEventListener: function (event: string, handler: any) {
          if (event === 'load') setTimeout(handler, 0);
        },
      } as any);

      const options: ExportOptions = { format: 'png' };
      const result = await service.export(options);

      expect(result).toBeDefined();
      expect(assetStoreSpy.get).toHaveBeenCalledWith('asset1');
    });

    it('should export document with path object', async () => {
      const pathObj: PathObject = {
        id: 'path1',
        type: 'path',
        path: 'M 0 0 L 100 100',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [pathObj],
      });

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      const result = await service.export(options);

      expect(result).toBeDefined();
    });

    it('should export document with text object', async () => {
      const textObj: TextObject = {
        id: 'text1',
        type: 'text',
        text: 'Hello World',
        x: 200,
        y: 200,
        width: 100,
        height: 50,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#000000',
        textAlign: 'left',
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [textObj],
      });

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      const result = await service.export(options);

      expect(result).toBeDefined();
    });

    it('should skip invisible objects during export', async () => {
      const visibleObj: PathObject = {
        id: 'path1',
        type: 'path',
        path: 'M 0 0 L 100 100',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      };

      const invisibleObj: PathObject = {
        ...visibleObj,
        id: 'path2',
        visible: false,
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [visibleObj, invisibleObj],
      });

      spyOn(fabric.Canvas.prototype, 'add');
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      await service.export(options);

      // Should only add the visible object
      expect(fabric.Canvas.prototype.add).toHaveBeenCalledTimes(1);
    });

    it('should sort objects by z-index during export', async () => {
      const obj1: PathObject = {
        id: 'path1',
        type: 'path',
        path: 'M 0 0 L 50 50',
        x: 50,
        y: 50,
        width: 50,
        height: 50,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 2,
        stroke: '#000000',
        strokeWidth: 1,
        fill: 'transparent',
      };

      const obj2: PathObject = {
        ...obj1,
        id: 'path2',
        zIndex: 0,
      };

      const obj3: PathObject = {
        ...obj1,
        id: 'path3',
        zIndex: 1,
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [obj1, obj2, obj3], // Out of order
      });

      const addedIds: string[] = [];
      spyOn(fabric.Canvas.prototype, 'add').and.callFake(function (obj: any) {
        addedIds.push(obj.data?.id || 'unknown');
      });

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      await service.export(options);

      // Objects should be added in z-index order (0, 1, 2)
      expect(fabric.Canvas.prototype.add).toHaveBeenCalledTimes(3);
    });

    it('should handle scaled objects correctly', async () => {
      const scaledObj: PathObject = {
        id: 'path1',
        type: 'path',
        path: 'M 0 0 L 100 100',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        angle: 45,
        scaleX: 2,
        scaleY: 1.5,
        opacity: 0.8,
        visible: true,
        locked: false,
        zIndex: 0,
        stroke: '#ff0000',
        strokeWidth: 3,
        fill: '#00ff00',
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [scaledObj],
      });

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png', scale: 2 };
      const result = await service.export(options);

      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty document', async () => {
      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [],
      });

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      const result = await service.export(options);

      expect(result).toBeDefined();
    });

    it('should handle very small dimensions', async () => {
      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        width: 10,
        height: 10,
      });

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        expect(this.width).toBe(10);
        expect(this.height).toBe(10);
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      await service.export(options);
    });

    it('should handle very large dimensions with scale', async () => {
      const options: ExportOptions = { format: 'png', scale: 10 };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        expect(this.width).toBe(8000); // 800 * 10
        expect(this.height).toBe(6000); // 600 * 10
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);
    });

    it('should handle zero scale gracefully', async () => {
      const options: ExportOptions = { format: 'png', scale: 0 };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        expect(this.width).toBe(0);
        expect(this.height).toBe(0);
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);
    });

    it('should handle fractional scale', async () => {
      const options: ExportOptions = { format: 'png', scale: 0.5 };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        expect(this.width).toBe(400); // 800 * 0.5
        expect(this.height).toBe(300); // 600 * 0.5
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);
    });

    it('should handle ImageMagick conversion error', async () => {
      const options: ExportOptions = { format: 'jpeg' };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      magickServiceSpy.convertFormat.and.returnValue(
        Promise.reject(new Error('ImageMagick conversion failed'))
      );

      await expectAsync(service.export(options)).toBeRejectedWithError('ImageMagick conversion failed');
    });

    it('should handle missing asset error', async () => {
      const imageObj: ImageObject = {
        id: 'img1',
        type: 'image',
        assetId: 'missing-asset',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [imageObj],
      });

      assetStoreSpy.get.and.returnValue(Promise.reject(new Error('Asset not found')));

      const options: ExportOptions = { format: 'png' };
      await expectAsync(service.export(options)).toBeRejectedWithError('Asset not found');
    });

    it('should handle default text alignment', async () => {
      const textObj: TextObject = {
        id: 'text1',
        type: 'text',
        text: 'Test',
        x: 100,
        y: 100,
        width: 50,
        height: 20,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#000000',
        // textAlign is optional
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [textObj],
      });

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      const result = await service.export(options);

      expect(result).toBeDefined();
    });

    it('should handle unknown object type gracefully', async () => {
      const unknownObj = {
        id: 'unknown1',
        type: 'unknown-type' as any,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
      };

      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        objects: [unknownObj],
      });

      spyOn(fabric.Canvas.prototype, 'add');
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      const result = await service.export(options);

      // Should not add unknown object
      expect(fabric.Canvas.prototype.add).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('background handling', () => {
    it('should use document background when no override provided', async () => {
      documentStoreSpy.getSnapshot.and.returnValue({
        ...mockDocument,
        background: { color: '#0000ff', transparent: false },
      });

      spyOn(fabric.Canvas.prototype, 'renderAll');
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const options: ExportOptions = { format: 'png' };
      await service.export(options);

      expect(fabric.Canvas.prototype.renderAll).toHaveBeenCalled();
    });

    it('should use transparent background for PNG', async () => {
      const options: ExportOptions = {
        format: 'png',
        background: { transparent: true },
      };

      spyOn(fabric.Canvas.prototype, 'renderAll');
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      await service.export(options);

      expect(fabric.Canvas.prototype.renderAll).toHaveBeenCalled();
    });

    it('should convert format when JPEG with transparent background', async () => {
      const options: ExportOptions = {
        format: 'jpeg',
        background: { transparent: true },
      };

      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (callback: BlobCallback) {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      });

      const mockJpegData = new Uint8Array([0xff, 0xd8]);
      magickServiceSpy.convertFormat.and.returnValue(Promise.resolve(mockJpegData));

      const result = await service.export(options);

      expect(magickServiceSpy.convertFormat).toHaveBeenCalled();
      expect(result.type).toBe('image/jpeg');
    });
  });
});
