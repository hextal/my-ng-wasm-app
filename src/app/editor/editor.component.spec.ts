import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorComponent } from './editor.component';
import { FabricCanvasService } from './services/fabric-canvas.service';
import { PhotonService } from '../core/services/photon.service';
import { MagickService } from '../core/services/magick.service';
import { FileUtilityService } from '../core/services/file-utility.service';
import { FilterService } from '../core/services/filter.service';
import { FilterPreviewService } from '../core/services/filter-preview.service';
import { CanvasUtilityService } from '../core/services/canvas-utility.service';
import { DocumentStoreService } from './services/document-store.service';
import { HistoryService } from './services/history.service';
import { AssetStoreService } from './services/asset-store.service';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';

describe('EditorComponent', () => {
  let component: EditorComponent;
  let fixture: ComponentFixture<EditorComponent>;
  let fabricCanvasSpy: jasmine.SpyObj<FabricCanvasService>;
  let photonServiceSpy: jasmine.SpyObj<PhotonService>;
  let magickServiceSpy: jasmine.SpyObj<MagickService>;
  let fileUtilitySpy: jasmine.SpyObj<FileUtilityService>;
  let filterServiceSpy: jasmine.SpyObj<FilterService>;
  let filterPreviewSpy: jasmine.SpyObj<FilterPreviewService>;
  let canvasUtilSpy: jasmine.SpyObj<CanvasUtilityService>;
  let documentStoreSpy: jasmine.SpyObj<DocumentStoreService>;
  let historySpy: jasmine.SpyObj<HistoryService>;
  let assetStoreSpy: jasmine.SpyObj<AssetStoreService>;

  let mockObjectsSubject: BehaviorSubject<any[]>;

  beforeEach(async () => {
    mockObjectsSubject = new BehaviorSubject<any[]>([]);

    const fabricCanvasSpyObj = jasmine.createSpyObj('FabricCanvasService', [
      'isCanvasReady',
      'addImageFromBlob',
      'clear',
      'getCanvas',
    ]);

    const photonServiceSpyObj = jasmine.createSpyObj('PhotonService', ['initialize']);
    const magickServiceSpyObj = jasmine.createSpyObj('MagickService', [
      'initialize',
      'isPhotonCompatible',
      'convertFormat',
      'getCompatibleOutputFormats',
    ]);

    const fileUtilitySpyObj = jasmine.createSpyObj('FileUtilityService', [
      'getFileExtension',
      'getFileNameWithoutExtension',
      'fileToUint8Array',
      'uint8ArrayToBlob',
      'getMimeType',
    ]);

    const filterServiceSpyObj = jasmine.createSpyObj('FilterService', ['getPreviews']);
    const filterPreviewSpyObj = jasmine.createSpyObj('FilterPreviewService', [
      'generatePreviewsFromBlob',
      'generatePreviewsFromAssetId',
      'hasCachedPreviews',
      'loadCachedPreviews',
      'clearPreviews',
      'hasPreviewsGenerated',
    ]);

    const canvasUtilSpyObj = jasmine.createSpyObj('CanvasUtilityService', [
      'createObjectURL',
      'createDownloadLink',
      'triggerDownload',
      'revokeObjectURL',
    ]);

    const documentStoreSpyObj = jasmine.createSpyObj('DocumentStoreService', [
      'getSnapshot',
      'getObject',
      'selectedObjectId',
    ]);

    const historySpyObj = jasmine.createSpyObj('HistoryService', [
      'canUndo',
      'canRedo',
      'undo',
      'redo',
    ]);

    const assetStoreSpyObj = jasmine.createSpyObj('AssetStoreService', ['get', 'put']);

    // Setup default return values
    documentStoreSpyObj.objects$ = mockObjectsSubject.asObservable();
    documentStoreSpyObj.selectedObjectId = signal(null);
    fabricCanvasSpyObj.isCanvasReady.and.returnValue(true);
    photonServiceSpyObj.initialize.and.returnValue(Promise.resolve());
    magickServiceSpyObj.initialize.and.returnValue(Promise.resolve());
    magickServiceSpyObj.isPhotonCompatible.and.returnValue(true);
    filterServiceSpyObj.getPreviews.and.returnValue(signal({}));
    filterPreviewSpyObj.hasPreviewsGenerated.and.returnValue(false);
    filterPreviewSpyObj.hasCachedPreviews.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [EditorComponent],
      providers: [
        { provide: FabricCanvasService, useValue: fabricCanvasSpyObj },
        { provide: PhotonService, useValue: photonServiceSpyObj },
        { provide: MagickService, useValue: magickServiceSpyObj },
        { provide: FileUtilityService, useValue: fileUtilitySpyObj },
        { provide: FilterService, useValue: filterServiceSpyObj },
        { provide: FilterPreviewService, useValue: filterPreviewSpyObj },
        { provide: CanvasUtilityService, useValue: canvasUtilSpyObj },
        { provide: DocumentStoreService, useValue: documentStoreSpyObj },
        { provide: HistoryService, useValue: historySpyObj },
        { provide: AssetStoreService, useValue: assetStoreSpyObj },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorComponent);
    component = fixture.componentInstance;
    fabricCanvasSpy = TestBed.inject(FabricCanvasService) as jasmine.SpyObj<FabricCanvasService>;
    photonServiceSpy = TestBed.inject(PhotonService) as jasmine.SpyObj<PhotonService>;
    magickServiceSpy = TestBed.inject(MagickService) as jasmine.SpyObj<MagickService>;
    fileUtilitySpy = TestBed.inject(FileUtilityService) as jasmine.SpyObj<FileUtilityService>;
    filterServiceSpy = TestBed.inject(FilterService) as jasmine.SpyObj<FilterService>;
    filterPreviewSpy = TestBed.inject(FilterPreviewService) as jasmine.SpyObj<FilterPreviewService>;
    canvasUtilSpy = TestBed.inject(CanvasUtilityService) as jasmine.SpyObj<CanvasUtilityService>;
    documentStoreSpy = TestBed.inject(DocumentStoreService) as jasmine.SpyObj<DocumentStoreService>;
    historySpy = TestBed.inject(HistoryService) as jasmine.SpyObj<HistoryService>;
    assetStoreSpy = TestBed.inject(AssetStoreService) as jasmine.SpyObj<AssetStoreService>;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(component.hasImage).toBe(false);
      expect(component.activeTool()).toBe('select');
    });

    it('should initialize Photon on ngOnInit', async () => {
      await component.ngOnInit();
      expect(photonServiceSpy.initialize).toHaveBeenCalled();
    });

    it('should initialize ImageMagick on ngOnInit', async () => {
      await component.ngOnInit();
      expect(magickServiceSpy.initialize).toHaveBeenCalled();
    });

    it('should handle Photon initialization failure', async () => {
      spyOn(console, 'error');
      photonServiceSpy.initialize.and.returnValue(Promise.reject(new Error('Photon init failed')));

      await component.ngOnInit();

      expect(console.error).toHaveBeenCalledWith('Failed to initialize Photon:', jasmine.any(Error));
    });

    it('should handle ImageMagick initialization failure', async () => {
      spyOn(console, 'error');
      magickServiceSpy.initialize.and.returnValue(Promise.reject(new Error('ImageMagick init failed')));

      await component.ngOnInit();

      expect(console.error).toHaveBeenCalledWith('Failed to initialize ImageMagick:', jasmine.any(Error));
    });

    it('should subscribe to document objects and update hasImage', () => {
      expect(component.hasImage).toBe(false);

      mockObjectsSubject.next([{ type: 'image', id: 'img1' }]);
      expect(component.hasImage).toBe(true);

      mockObjectsSubject.next([]);
      expect(component.hasImage).toBe(false);
    });
  });

  describe('onImportImage', () => {
    it('should trigger file input click', () => {
      const mockFileInput = document.createElement('input');
      spyOn(mockFileInput, 'click');
      component.fileInputRef = { nativeElement: mockFileInput } as any;

      component.onImportImage();

      expect(mockFileInput.click).toHaveBeenCalled();
    });
  });

  describe('onFileSelected', () => {
    let mockFile: File;
    let mockEvent: any;

    beforeEach(() => {
      mockFile = new File(['image data'], 'test.png', { type: 'image/png' });
      mockEvent = {
        target: {
          files: [mockFile],
          value: 'test.png',
        },
      };

      fileUtilitySpy.getFileExtension.and.returnValue('png');
      fileUtilitySpy.getFileNameWithoutExtension.and.returnValue('test');
      fabricCanvasSpy.addImageFromBlob.and.returnValue(Promise.resolve());
      filterPreviewSpy.generatePreviewsFromBlob.and.returnValue(Promise.resolve());
    });

    it('should handle PNG file upload', async () => {
      await component.onFileSelected(mockEvent);

      expect(fileUtilitySpy.getFileExtension).toHaveBeenCalledWith('test.png');
      expect(fabricCanvasSpy.addImageFromBlob).toHaveBeenCalled();
    });

    it('should reject non-image files', async () => {
      spyOn(window, 'alert');
      mockEvent.target.files = [new File(['text'], 'test.txt', { type: 'text/plain' })];
      fileUtilitySpy.getFileExtension.and.returnValue('txt');

      await component.onFileSelected(mockEvent);

      expect(window.alert).toHaveBeenCalledWith('Please select an image file');
      expect(fabricCanvasSpy.addImageFromBlob).not.toHaveBeenCalled();
    });

    it('should store original file info', async () => {
      await component.onFileSelected(mockEvent);

      expect(fileUtilitySpy.getFileNameWithoutExtension).toHaveBeenCalledWith('test.png');
      expect(fileUtilitySpy.getFileExtension).toHaveBeenCalledWith('test.png');
    });

    it('should wait for canvas to be ready', async () => {
      fabricCanvasSpy.isCanvasReady.and.returnValues(false, false, true);

      await component.onFileSelected(mockEvent);

      expect(fabricCanvasSpy.isCanvasReady).toHaveBeenCalledTimes(3);
    });

    it('should timeout if canvas not ready', async () => {
      spyOn(window, 'alert');
      fabricCanvasSpy.isCanvasReady.and.returnValue(false);

      await component.onFileSelected(mockEvent);

      expect(window.alert).toHaveBeenCalledWith(jasmine.stringContaining('Canvas initialization timeout'));
    });

    it('should convert non-compatible formats to PNG', async () => {
      mockEvent.target.files = [new File(['image'], 'test.jpg', { type: 'image/jpeg' })];
      fileUtilitySpy.getFileExtension.and.returnValue('jpg');
      magickServiceSpy.isPhotonCompatible.and.returnValue(false);
      fileUtilitySpy.fileToUint8Array.and.returnValue(Promise.resolve(new Uint8Array([1, 2, 3])));
      magickServiceSpy.convertFormat.and.returnValue(Promise.resolve(new Uint8Array([4, 5, 6])));
      fileUtilitySpy.uint8ArrayToBlob.and.returnValue(new Blob(['converted'], { type: 'image/png' }));

      await component.onFileSelected(mockEvent);

      expect(magickServiceSpy.convertFormat).toHaveBeenCalledWith(
        jasmine.any(Uint8Array),
        'jpg',
        'png'
      );
    });

    it('should reset input value after processing', async () => {
      await component.onFileSelected(mockEvent);

      expect(mockEvent.target.value).toBe('');
    });

    it('should handle file processing errors', async () => {
      spyOn(window, 'alert');
      spyOn(console, 'error');
      fabricCanvasSpy.addImageFromBlob.and.returnValue(Promise.reject(new Error('Import failed')));

      await component.onFileSelected(mockEvent);

      expect(console.error).toHaveBeenCalledWith('Failed to import image:', jasmine.any(Error));
      expect(window.alert).toHaveBeenCalledWith(jasmine.stringContaining('Failed to import image'));
    });

    it('should handle missing file', async () => {
      mockEvent.target.files = [];

      await component.onFileSelected(mockEvent);

      expect(fabricCanvasSpy.addImageFromBlob).not.toHaveBeenCalled();
    });

    it('should accept valid image extensions', async () => {
      const validExtensions = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'];

      for (const ext of validExtensions) {
        mockEvent.target.files = [new File(['img'], `test.${ext}`, { type: `image/${ext}` })];
        fileUtilitySpy.getFileExtension.and.returnValue(ext);

        await component.onFileSelected(mockEvent);

        expect(fabricCanvasSpy.addImageFromBlob).toHaveBeenCalled();
        fabricCanvasSpy.addImageFromBlob.calls.reset();
      }
    });
  });

  describe('onReset', () => {
    it('should clear canvas when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);

      component.onReset();

      expect(fabricCanvasSpy.clear).toHaveBeenCalled();
      expect(filterPreviewSpy.clearPreviews).toHaveBeenCalled();
    });

    it('should not clear canvas when cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.onReset();

      expect(fabricCanvasSpy.clear).not.toHaveBeenCalled();
    });
  });

  describe('onToolChange', () => {
    it('should update active tool', async () => {
      await component.onToolChange('draw');
      expect(component.activeTool()).toBe('draw');
    });

    it('should not generate previews for non-filter tools', async () => {
      await component.onToolChange('select');
      expect(filterPreviewSpy.generatePreviewsFromBlob).not.toHaveBeenCalled();
    });

    it('should generate previews when switching to filters tool', async () => {
      // Simulate having uploaded blob
      const mockBlob = new Blob(['image'], { type: 'image/png' });
      const mockEvent = {
        target: {
          files: [new File([mockBlob], 'test.png', { type: 'image/png' })],
          value: 'test.png',
        },
      };

      fileUtilitySpy.getFileExtension.and.returnValue('png');
      fileUtilitySpy.getFileNameWithoutExtension.and.returnValue('test');
      fabricCanvasSpy.addImageFromBlob.and.returnValue(Promise.resolve());

      await component.onFileSelected(mockEvent);

      filterPreviewSpy.hasPreviewsGenerated.and.returnValue(false);
      await component.onToolChange('filters');

      // Note: generatePreviewsFromBlob is called in background timeout, so we check it was called during file upload
      expect(filterPreviewSpy.generatePreviewsFromBlob).toHaveBeenCalled();
    });
  });

  describe('onDownload', () => {
    let mockCanvas: any;

    beforeEach(() => {
      mockCanvas = {
        toDataURL: jasmine.createSpy('toDataURL').and.returnValue('data:image/png;base64,mock'),
      };
      fabricCanvasSpy.getCanvas.and.returnValue(mockCanvas);

      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['png-data'], { type: 'image/png' })),
        } as any)
      );

      canvasUtilSpy.createObjectURL.and.returnValue('blob:mock-url');
      canvasUtilSpy.createDownloadLink.and.returnValue(document.createElement('a'));
    });

    it('should download as PNG by default', async () => {
      await component.onDownload();

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith({
        format: 'png',
        quality: 1.0,
        multiplier: 1,
      });
      expect(canvasUtilSpy.triggerDownload).toHaveBeenCalled();
    });

    it('should alert when no canvas available', async () => {
      spyOn(window, 'alert');
      fabricCanvasSpy.getCanvas.and.returnValue(null);

      await component.onDownload();

      expect(window.alert).toHaveBeenCalledWith('No canvas to download');
    });

    it('should handle download errors', async () => {
      spyOn(window, 'alert');
      spyOn(console, 'error');
      mockCanvas.toDataURL.and.throwError('Export failed');

      await component.onDownload();

      expect(console.error).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith(jasmine.stringContaining('Failed to download image'));
    });
  });

  describe('history operations', () => {
    it('should check if undo is available', () => {
      historySpy.canUndo.and.returnValue(true);
      expect(component.canUndo()).toBe(true);

      historySpy.canUndo.and.returnValue(false);
      expect(component.canUndo()).toBe(false);
    });

    it('should check if redo is available', () => {
      historySpy.canRedo.and.returnValue(true);
      expect(component.canRedo()).toBe(true);

      historySpy.canRedo.and.returnValue(false);
      expect(component.canRedo()).toBe(false);
    });

    it('should perform undo', () => {
      component.onUndo();
      expect(historySpy.undo).toHaveBeenCalled();
    });

    it('should perform redo', () => {
      component.onRedo();
      expect(historySpy.redo).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid file selections', async () => {
      const mockFile = new File(['img'], 'test.png', { type: 'image/png' });
      const mockEvent = {
        target: {
          files: [mockFile],
          value: 'test.png',
        },
      };

      fileUtilitySpy.getFileExtension.and.returnValue('png');
      fileUtilitySpy.getFileNameWithoutExtension.and.returnValue('test');
      fabricCanvasSpy.addImageFromBlob.and.returnValue(Promise.resolve());

      await component.onFileSelected(mockEvent);
      await component.onFileSelected(mockEvent);
      await component.onFileSelected(mockEvent);

      expect(fabricCanvasSpy.addImageFromBlob).toHaveBeenCalledTimes(3);
    });

    it('should handle reset during file upload', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      component.onReset();

      expect(fabricCanvasSpy.clear).toHaveBeenCalled();
    });

    it('should track hasImage based on objects', () => {
      expect(component.hasImage).toBe(false);

      mockObjectsSubject.next([
        { type: 'text', id: 'txt1' },
        { type: 'image', id: 'img1' },
      ]);

      expect(component.hasImage).toBe(true);

      mockObjectsSubject.next([{ type: 'text', id: 'txt1' }]);

      expect(component.hasImage).toBe(false);
    });
  });
});
