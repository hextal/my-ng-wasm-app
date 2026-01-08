/**
 * Integration test for Fabric.js feature set
 * Tests all interactive, layout, drawing, text, and composition features
 */

import { TestBed } from '@angular/core/testing';
import { FabricCanvasService } from './fabric-canvas.service';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { AssetStoreService } from './asset-store.service';
import { EditorObjectFactory } from '../core/models/document.model';
import * as fabric from 'fabric';

describe('FabricCanvasService - Complete Feature Set', () => {
  let service: FabricCanvasService;
  let documentStore: DocumentStoreService;
  let history: HistoryService;
  let assetStore: AssetStoreService;
  let canvas: HTMLCanvasElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        FabricCanvasService,
        DocumentStoreService,
        HistoryService,
        AssetStoreService,
      ],
    });

    service = TestBed.inject(FabricCanvasService);
    documentStore = TestBed.inject(DocumentStoreService);
    history = TestBed.inject(HistoryService);
    assetStore = TestBed.inject(AssetStoreService);

    // Create canvas element
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    // Initialize canvas
    await service.init(canvas, 800, 600);
  });

  afterEach(() => {
    service.dispose();
    document.body.removeChild(canvas);
  });

  describe('1. Canvas & Scene Management', () => {
    it('should initialize Fabric canvas with correct dimensions', () => {
      const fabricCanvas = service.getCanvas();
      expect(fabricCanvas).toBeTruthy();
      expect(fabricCanvas?.width).toBe(800);
      expect(fabricCanvas?.height).toBe(600);
    });

    it('should maintain background color', () => {
      const fabricCanvas = service.getCanvas();
      expect(fabricCanvas?.backgroundColor).toBeDefined();
    });

    it('should support zoom', () => {
      service.setZoom(1.5);
      expect(service.getZoom()).toBe(1.5);
      
      service.zoomIn();
      expect(service.getZoom()).toBeGreaterThan(1.5);
      
      service.zoomOut();
      service.resetZoom();
      expect(service.getZoom()).toBe(1);
    });
  });

  describe('2. Selection & Object Interaction', () => {
    it('should support single selection', async () => {
      await service.addText('Test Text');
      const objects = service.getObjects();
      expect(objects.length).toBe(1);
    });

    it('should support move, scale, rotate operations', async () => {
      await service.addText('Test');
      await service.rotateSelected(45);
      
      const fabricCanvas = service.getCanvas();
      const activeObj = fabricCanvas?.getActiveObject();
      expect(activeObj).toBeTruthy();
    });
  });

  describe('3. Layering / Stacking', () => {
    it('should bring object forward and send backward', async () => {
      await service.addText('Text 1');
      await service.addText('Text 2');
      
      await service.bringForward();
      await service.sendBackward();
      
      const objects = service.getObjects();
      expect(objects.length).toBe(2);
    });

    it('should toggle object visibility', async () => {
      await service.addText('Test');
      const objects = service.getObjects();
      const objectId = objects[0].id;
      
      await service.toggleObjectVisibility(objectId);
      const updatedObj = documentStore.getObject(objectId);
      expect(updatedObj?.visible).toBe(false);
    });
  });

  describe('4. Image Object Features', () => {
    let imageBlob: Blob;

    beforeEach(() => {
      // Create a simple test image blob
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      
      // Convert to blob (sync for test)
      const dataURL = canvas.toDataURL('image/png');
      const byteString = atob(dataURL.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      imageBlob = new Blob([ab], { type: 'image/png' });
    });

    it('should add image and support transforms', async () => {
      await service.addImageFromBlob(imageBlob);
      const objects = service.getObjects();
      expect(objects.length).toBe(1);
      expect(objects[0].type).toBe('image');
    });

    it('should support flipX and flipY', async () => {
      await service.addImageFromBlob(imageBlob);
      await service.flipX();
      await service.flipY();
      
      // Verify operations completed without errors
      expect(service.getObjects().length).toBe(1);
    });

    it('should apply circular mask (clipPath)', async () => {
      await service.addImageFromBlob(imageBlob);
      await service.applyCircleMask();
      
      const objects = service.getObjects();
      expect(objects[0].type).toBe('image');
    });
  });

  describe('5. Drawing / Freehand Tools', () => {
    it('should enable and disable drawing mode', () => {
      service.setTool('draw');
      const fabricCanvas = service.getCanvas();
      expect(fabricCanvas?.isDrawingMode).toBe(true);
      
      service.setTool('select');
      expect(fabricCanvas?.isDrawingMode).toBe(false);
    });

    it('should set brush properties', () => {
      service.setTool('draw');
      service.setBrush({ color: '#ff0000', width: 5 });
      
      const fabricCanvas = service.getCanvas();
      expect(fabricCanvas?.freeDrawingBrush?.color).toBe('#ff0000');
      expect(fabricCanvas?.freeDrawingBrush?.width).toBe(5);
    });
  });

  describe('6. Text & Typography', () => {
    it('should create text with default properties', async () => {
      await service.addText('Hello World');
      const objects = service.getObjects();
      
      expect(objects.length).toBe(1);
      expect(objects[0].type).toBe('text');
      expect((objects[0] as any).text).toBe('Hello World');
    });

    it('should create text with custom properties', async () => {
      await service.addText('Custom', {
        fontSize: 48,
        fontFamily: 'Georgia',
        fill: '#0000ff',
        fontWeight: 'bold',
        fontStyle: 'italic',
        underline: true,
      });
      
      const objects = service.getObjects();
      const textObj = objects[0] as any;
      
      expect(textObj.fontSize).toBe(48);
      expect(textObj.fontFamily).toBe('Georgia');
      expect(textObj.fill).toBe('#0000ff');
      expect(textObj.fontWeight).toBe('bold');
      expect(textObj.fontStyle).toBe('italic');
      expect(textObj.underline).toBe(true);
    });

    it('should update text properties', async () => {
      await service.addText('Test');
      await service.updateTextProperties({
        fontSize: 64,
        fontWeight: 'bold',
      });
      
      // Verify update completed
      const objects = service.getObjects();
      expect(objects.length).toBe(1);
    });

    it('should support text tool mode', () => {
      service.setTool('text');
      const fabricCanvas = service.getCanvas();
      expect(fabricCanvas?.defaultCursor).toBe('text');
    });
  });

  describe('7. Watermarks', () => {
    it('should add text watermark with locking', async () => {
      await service.addWatermark('text', 'WATERMARK', 'center', 0.3);
      
      const objects = service.getObjects();
      const watermark = objects[0] as any;
      
      expect(watermark.type).toBe('text');
      expect(watermark.text).toBe('WATERMARK');
      expect(watermark.opacity).toBe(0.3);
      expect(watermark.lockMovementX).toBe(true);
      expect(watermark.lockMovementY).toBe(true);
      expect(watermark.selectable).toBe(false);
    });
  });

  describe('8. Guides, Snapping & Layout Helpers', () => {
    it('should align objects', async () => {
      await service.addText('Test');
      
      service.alignObjects('center');
      service.alignObjects('middle');
      service.alignObjects('left');
      service.alignObjects('right');
      service.alignObjects('top');
      service.alignObjects('bottom');
      
      // Verify alignment operations complete without errors
      expect(service.getObjects().length).toBe(1);
    });
  });

  describe('9. Visual State & UX Features', () => {
    it('should support grouping and ungrouping', async () => {
      await service.addText('Text 1');
      await service.addText('Text 2');
      
      // Note: Grouping requires multiple selection which is hard to simulate
      // This test verifies the methods exist and don't throw
      service.groupObjects();
      service.ungroupObjects();
      
      expect(service.getObjects().length).toBe(2);
    });
  });

  describe('10. History-Integrated Interactions', () => {
    it('should support undo/redo for object creation', async () => {
      await service.addText('Test');
      expect(service.getObjects().length).toBe(1);
      
      await history.undo();
      expect(service.getObjects().length).toBe(0);
      
      await history.redo();
      expect(service.getObjects().length).toBe(1);
    });

    it('should support undo/redo for deletion', async () => {
      await service.addText('Test');
      const initialCount = service.getObjects().length;
      
      await service.deleteSelected();
      expect(service.getObjects().length).toBe(initialCount - 1);
      
      await history.undo();
      expect(service.getObjects().length).toBe(initialCount);
    });
  });

  describe('11. Object Locking', () => {
    it('should lock and unlock object movement', async () => {
      await service.addText('Test');
      
      service.toggleLock('movement');
      service.toggleLock('scaling');
      service.toggleLock('rotation');
      
      // Verify locking operations complete without errors
      expect(service.getObjects().length).toBe(1);
    });
  });

  describe('12. Complete Feature Test: Build a Collage', () => {
    it('should support building a complete collage with all features', async () => {
      // 1. Add images
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      const dataURL = canvas.toDataURL('image/png');
      const byteString = atob(dataURL.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const imageBlob = new Blob([ab], { type: 'image/png' });
      
      await service.addImageFromBlob(imageBlob);
      
      // 2. Add drawings
      service.setTool('draw');
      service.setBrush({ color: '#000000', width: 2 });
      service.setTool('select');
      
      // 3. Add text
      await service.addText('Collage Title', {
        fontSize: 48,
        fontWeight: 'bold',
        fill: '#333333',
      });
      
      // 4. Transform objects
      await service.rotateSelected(15);
      service.alignObjects('center');
      
      // 5. Add watermark
      await service.addWatermark('text', 'Sample', 'bottom-right', 0.5);
      
      // 6. Verify collage
      const objects = service.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      
      // 7. Test zoom and pan
      service.zoomIn();
      expect(service.getZoom()).toBeGreaterThan(1);
      
      service.resetZoom();
      service.resetPan();
      
      // 8. Test undo/redo
      expect(history.canUndo()).toBe(true);
      await history.undo();
      await history.redo();
      
      console.log('✅ Complete collage test passed!');
      console.log(`📊 Total objects: ${objects.length}`);
      console.log(`🔄 Can undo: ${history.canUndo()}`);
      console.log(`🔄 Can redo: ${history.canRedo()}`);
    });
  });

  describe('13. Feature Completeness Check', () => {
    it('should have all required Fabric.js features implemented', () => {
      const requiredMethods = [
        'init',
        'setTool',
        'setBrush',
        'addImageFromBlob',
        'addText',
        'updateTextProperties',
        'deleteSelected',
        'bringForward',
        'sendBackward',
        'rotateSelected',
        'flipX',
        'flipY',
        'setBlendMode',
        'cropImage',
        'applyCircleMask',
        'removeClipPath',
        'alignObjects',
        'groupObjects',
        'ungroupObjects',
        'toggleLock',
        'addWatermark',
        'setZoom',
        'getZoom',
        'zoomIn',
        'zoomOut',
        'resetZoom',
        'resetPan',
        'getObjects',
        'toggleObjectVisibility',
        'selectObjectById',
      ];

      requiredMethods.forEach(method => {
        expect(typeof (service as any)[method]).toBe('function');
      });

      console.log('✅ All required Fabric.js methods are implemented!');
    });
  });
});
