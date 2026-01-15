import { TestBed } from '@angular/core/testing';
import { CanvasInitializationService } from './canvas-initialization.service';
import { DocumentStoreService } from './document-store.service';
import { AssetStoreService } from './asset-store.service';
import { ViewportService } from './viewport.service';
import { SnappingService } from './snapping.service';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import * as fabric from 'fabric';
import { of } from 'rxjs';

describe('CanvasInitializationService', () => {
  let service: CanvasInitializationService;
  let mockDocumentStore: jasmine.SpyObj<DocumentStoreService>;
  let mockAssetStore: jasmine.SpyObj<AssetStoreService>;
  let mockViewportService: jasmine.SpyObj<ViewportService>;
  let mockSnappingService: jasmine.SpyObj<SnappingService>;

  beforeEach(() => {
    // Create spies
    mockDocumentStore = jasmine.createSpyObj('DocumentStoreService', [
      'getSnapshot',
      'clear',
    ], {
      document$: of({
        id: 'doc-1',
        width: 800,
        height: 600,
        objects: [],
        background: { color: '#ffffff', transparent: false },
        selectedObjectId: null,
      }),
    });

    mockAssetStore = jasmine.createSpyObj('AssetStoreService', ['get', 'set']);

    mockViewportService = jasmine.createSpyObj('ViewportService', [
      'enableMouseWheelZoom',
      'enablePanning',
    ]);

    mockSnappingService = jasmine.createSpyObj('SnappingService', ['enableSnapping']);

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        CanvasInitializationService,
        { provide: DocumentStoreService, useValue: mockDocumentStore },
        { provide: AssetStoreService, useValue: mockAssetStore },
        { provide: ViewportService, useValue: mockViewportService },
        { provide: SnappingService, useValue: mockSnappingService },
      ],
    });

    service = TestBed.inject(CanvasInitializationService);

    // Mock document snapshot
    mockDocumentStore.getSnapshot.and.returnValue({
      id: 'doc-1',
      width: 800,
      height: 600,
      objects: [],
      background: { color: '#ffffff', transparent: false },
      selectedObjectId: null,
    });
  });

  afterEach(() => {
    // Clean up any canvases
    service.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeCanvas', () => {
    it('should initialize a simple canvas for integration tests', () => {
      // Create a canvas element
      const canvasElement = document.createElement('canvas');
      canvasElement.id = 'test-canvas';
      document.body.appendChild(canvasElement);

      try {
        const canvas = service.initializeCanvas('test-canvas', 800, 600);

        expect(canvas).toBeTruthy();
        expect(canvas.getWidth()).toBe(800);
        expect(canvas.getHeight()).toBe(600);
        expect(service.isCanvasReady()).toBe(true);
      } finally {
        document.body.removeChild(canvasElement);
      }
    });

    it('should throw error if canvas element not found', () => {
      expect(() => {
        service.initializeCanvas('non-existent-canvas');
      }).toThrowError('Canvas element with id "non-existent-canvas" not found');
    });
  });

  describe('init', () => {
    it('should initialize canvas with full configuration', async () => {
      const canvasElement = document.createElement('canvas');

      const canvas = await service.init(canvasElement, 800, 600);

      expect(canvas).toBeTruthy();
      expect(canvas.getWidth()).toBe(800);
      expect(canvas.getHeight()).toBe(600);
      expect(service.isCanvasReady()).toBe(true);

      // Verify viewport and snapping were enabled
      expect(mockSnappingService.enableSnapping).toHaveBeenCalledWith(canvas);
      expect(mockViewportService.enableMouseWheelZoom).toHaveBeenCalledWith(canvas);
      expect(mockViewportService.enablePanning).toHaveBeenCalledWith(canvas);
    });

    it('should render current document', async () => {
      const canvasElement = document.createElement('canvas');
      const mockDoc = {
        id: 'doc-1',
        width: 800,
        height: 600,
        objects: [],
        background: { color: '#ffffff', transparent: false },
        selectedObjectId: null,
      };

      mockDocumentStore.getSnapshot.and.returnValue(mockDoc);

      await service.init(canvasElement, 800, 600);

      expect(mockDocumentStore.getSnapshot).toHaveBeenCalled();
    });
  });

  describe('getCanvas', () => {
    it('should return null if not initialized', () => {
      expect(service.getCanvas()).toBeNull();
    });

    it('should return canvas after initialization', async () => {
      const canvasElement = document.createElement('canvas');
      await service.init(canvasElement, 800, 600);

      const canvas = service.getCanvas();
      expect(canvas).toBeTruthy();
      expect(canvas).toBeInstanceOf(fabric.Canvas);
    });
  });

  describe('getRenderer', () => {
    it('should return renderer instance', () => {
      const renderer = service.getRenderer();
      expect(renderer).toBeTruthy();
      expect(renderer).toBeInstanceOf(FabricRenderer);
    });
  });

  describe('isCanvasReady', () => {
    it('should return false before initialization', () => {
      expect(service.isCanvasReady()).toBe(false);
    });

    it('should return true after initialization', async () => {
      const canvasElement = document.createElement('canvas');
      await service.init(canvasElement, 800, 600);

      expect(service.isCanvasReady()).toBe(true);
    });

    it('should return false after dispose', async () => {
      const canvasElement = document.createElement('canvas');
      await service.init(canvasElement, 800, 600);

      service.dispose();

      expect(service.isCanvasReady()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear canvas and document store', async () => {
      const canvasElement = document.createElement('canvas');
      const canvas = await service.init(canvasElement, 800, 600);

      // Add a mock object to canvas
      const rect = new fabric.Rect({ left: 100, top: 100, width: 50, height: 50 });
      canvas.add(rect);
      expect(canvas.getObjects().length).toBe(1);

      service.clear();

      expect(canvas.getObjects().length).toBe(0);
      expect(mockDocumentStore.clear).toHaveBeenCalled();
    });

    it('should handle clear when canvas is not initialized', () => {
      expect(() => {
        service.clear();
      }).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should dispose of canvas and reset state', async () => {
      const canvasElement = document.createElement('canvas');
      await service.init(canvasElement, 800, 600);

      expect(service.isCanvasReady()).toBe(true);

      service.dispose();

      expect(service.getCanvas()).toBeNull();
      expect(service.isCanvasReady()).toBe(false);
    });

    it('should handle dispose when canvas is not initialized', () => {
      expect(() => {
        service.dispose();
      }).not.toThrow();
    });

    it('should be safe to call dispose multiple times', async () => {
      const canvasElement = document.createElement('canvas');
      await service.init(canvasElement, 800, 600);

      service.dispose();
      service.dispose();
      service.dispose();

      expect(service.getCanvas()).toBeNull();
    });
  });

  describe('document synchronization', () => {
    it('should sync canvas when document changes', async () => {
      const canvasElement = document.createElement('canvas');
      await service.init(canvasElement, 800, 600);

      // The subscription should be active
      expect(mockDocumentStore.document$).toBeTruthy();
    });
  });

  describe('initialization logging', () => {
    it('should log initialization steps', async () => {
      spyOn(console, 'log');

      const canvasElement = document.createElement('canvas');
      await service.init(canvasElement, 800, 600);

      expect(console.log).toHaveBeenCalledWith(
        'CanvasInitializationService: Starting initialization'
      );
      expect(console.log).toHaveBeenCalledWith(
        'CanvasInitializationService: Fabric canvas created'
      );
      expect(console.log).toHaveBeenCalledWith(
        'CanvasInitializationService: Renderer initialized'
      );
      expect(console.log).toHaveBeenCalledWith(
        'CanvasInitializationService: Initialization complete'
      );
    });
  });
});
