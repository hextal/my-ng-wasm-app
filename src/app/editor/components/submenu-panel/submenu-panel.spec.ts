import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubmenuPanel } from './submenu-panel';
import { FabricCanvasService } from '../../services/fabric-canvas.service';
import { DocumentStoreService } from '../../services/document-store.service';
import { PhotonFiltersService } from '../../services/photon-filters.service';
import { PhotonService } from '../../../core/services/photon.service';
import { FilterService } from '../../../core/services/filter.service';
import { TuningService } from '../../../core/services/tuning.service';
import { HistoryService } from '../../services/history.service';
import { AssetStoreService } from '../../services/asset-store.service';
import { ImageDataUtilityService } from '../../../core/services/image-data-utility.service';
import { CanvasUtilityService } from '../../../core/services/canvas-utility.service';
import { signal } from '@angular/core';

describe('SubmenuPanel', () => {
  let component: SubmenuPanel;
  let fixture: ComponentFixture<SubmenuPanel>;
  let fabricCanvasSpy: jasmine.SpyObj<FabricCanvasService>;
  let documentStoreSpy: jasmine.SpyObj<DocumentStoreService>;
  let photonFiltersSpy: jasmine.SpyObj<PhotonFiltersService>;
  let photonServiceSpy: jasmine.SpyObj<PhotonService>;
  let filterServiceSpy: jasmine.SpyObj<FilterService>;
  let historySpy: jasmine.SpyObj<HistoryService>;
  let assetStoreSpy: jasmine.SpyObj<AssetStoreService>;
  let imageDataUtilSpy: jasmine.SpyObj<ImageDataUtilityService>;
  let canvasUtilSpy: jasmine.SpyObj<CanvasUtilityService>;

  beforeEach(async () => {
    const fabricCanvasSpyObj = jasmine.createSpyObj('FabricCanvasService', [
      'setBrush', 'flipX', 'flipY', 'rotateSelected', 'setOpacity', 'setBlendMode',
      'bringForward', 'sendBackward', 'alignObjects', 'groupObjects', 'ungroupObjects',
      'getCanvas', 'addText', 'updateTextProperties', 'addWatermark', 'addShape',
      'addEmoji', 'applyBrightnessFilter', 'applyContrastFilter', 'applySaturationFilter',
      'applyHueRotationFilter', 'resetAllFilters', 'resizeImage', 'applyRoundedCorners',
      'applyShapeMask', 'removeClipPath', 'selectObjectById'
    ]);

    const documentStoreSpyObj = jasmine.createSpyObj('DocumentStoreService', [
      'getObject', 'getSelectedObjectId', 'selectedObjectId'
    ]);

    const photonFiltersSpyObj = jasmine.createSpyObj('PhotonFiltersService', [
      'getAvailableFilters', 'applyFilter'
    ]);

    const photonServiceSpyObj = jasmine.createSpyObj('PhotonService', ['initialize', 'filter']);
    const filterServiceSpyObj = jasmine.createSpyObj('FilterService', [
      'getPreviews', 'isLoadingPreviews', 'getActiveFilterId', 'setActiveFilterId'
    ]);
    const tuningServiceSpyObj = jasmine.createSpyObj('TuningService', []);
    const historySpyObj = jasmine.createSpyObj('HistoryService', ['run']);
    const assetStoreSpyObj = jasmine.createSpyObj('AssetStoreService', ['get', 'put']);
    const imageDataUtilSpyObj = jasmine.createSpyObj('ImageDataUtilityService', [
      'loadImageDataFromBlob', 'imageDataToBlob'
    ]);
    const canvasUtilSpyObj = jasmine.createSpyObj('CanvasUtilityService', ['createFileInput']);

    // Setup default return values
    photonFiltersSpyObj.getAvailableFilters.and.returnValue([
      { name: 'grayscale', displayName: 'Grayscale' },
      { name: 'sepia', displayName: 'Sepia' }
    ]);
    filterServiceSpyObj.getPreviews.and.returnValue({});
    filterServiceSpyObj.isLoadingPreviews.and.returnValue(false);
    filterServiceSpyObj.getActiveFilterId.and.returnValue(signal(null));
    documentStoreSpyObj.selectedObjectId = signal(null);

    await TestBed.configureTestingModule({
      imports: [SubmenuPanel],
      providers: [
        { provide: FabricCanvasService, useValue: fabricCanvasSpyObj },
        { provide: DocumentStoreService, useValue: documentStoreSpyObj },
        { provide: PhotonFiltersService, useValue: photonFiltersSpyObj },
        { provide: PhotonService, useValue: photonServiceSpyObj },
        { provide: FilterService, useValue: filterServiceSpyObj },
        { provide: TuningService, useValue: tuningServiceSpyObj },
        { provide: HistoryService, useValue: historySpyObj },
        { provide: AssetStoreService, useValue: assetStoreSpyObj },
        { provide: ImageDataUtilityService, useValue: imageDataUtilSpyObj },
        { provide: CanvasUtilityService, useValue: canvasUtilSpyObj },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmenuPanel);
    component = fixture.componentInstance;
    fabricCanvasSpy = TestBed.inject(FabricCanvasService) as jasmine.SpyObj<FabricCanvasService>;
    documentStoreSpy = TestBed.inject(DocumentStoreService) as jasmine.SpyObj<DocumentStoreService>;
    photonFiltersSpy = TestBed.inject(PhotonFiltersService) as jasmine.SpyObj<PhotonFiltersService>;
    photonServiceSpy = TestBed.inject(PhotonService) as jasmine.SpyObj<PhotonService>;
    filterServiceSpy = TestBed.inject(FilterService) as jasmine.SpyObj<FilterService>;
    historySpy = TestBed.inject(HistoryService) as jasmine.SpyObj<HistoryService>;
    assetStoreSpy = TestBed.inject(AssetStoreService) as jasmine.SpyObj<AssetStoreService>;
    imageDataUtilSpy = TestBed.inject(ImageDataUtilityService) as jasmine.SpyObj<ImageDataUtilityService>;
    canvasUtilSpy = TestBed.inject(CanvasUtilityService) as jasmine.SpyObj<CanvasUtilityService>;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load available filters on construction', () => {
      expect(component.availableFilters.length).toBe(2);
      expect(component.availableFilters[0].name).toBe('grayscale');
    });

    it('should initialize with default brush settings', () => {
      expect(component.brushColor()).toBe('#000000');
      expect(component.brushWidth()).toBe(2);
      expect(component.brushType()).toBe('pencil');
    });

    it('should initialize with default tuning settings', () => {
      expect(component.brightness()).toBe(5);
      expect(component.contrast()).toBe(5);
      expect(component.saturation()).toBe(5);
      expect(component.hueRotation()).toBe(5);
    });
  });

  describe('brush methods', () => {
    it('should update brush color', () => {
      component.onBrushColor('#ff0000');
      expect(component.brushColor()).toBe('#ff0000');
      expect(fabricCanvasSpy.setBrush).toHaveBeenCalled();
    });

    it('should update brush width', () => {
      component.onBrushWidth(5);
      expect(component.brushWidth()).toBe(5);
      expect(fabricCanvasSpy.setBrush).toHaveBeenCalled();
    });

    it('should update brush type', () => {
      component.onBrushType('circle');
      expect(component.brushType()).toBe('circle');
      expect(fabricCanvasSpy.setBrush).toHaveBeenCalled();
    });

    it('should update brush shadow settings', () => {
      component.onBrushShadowEnabled(true);
      expect(component.brushShadowEnabled()).toBe(true);
      expect(fabricCanvasSpy.setBrush).toHaveBeenCalled();
    });
  });

  describe('transform methods', () => {
    it('should flip X', async () => {
      await component.onFlipX();
      expect(fabricCanvasSpy.flipX).toHaveBeenCalled();
    });

    it('should flip Y', async () => {
      await component.onFlipY();
      expect(fabricCanvasSpy.flipY).toHaveBeenCalled();
    });

    it('should rotate by 90 degrees', async () => {
      await component.onRotate();
      expect(fabricCanvasSpy.rotateSelected).toHaveBeenCalledWith(90);
    });

    it('should change opacity', async () => {
      await component.onOpacityChange(50);
      expect(fabricCanvasSpy.setOpacity).toHaveBeenCalledWith(0.5);
    });

    it('should change blend mode', async () => {
      await component.onBlendMode('multiply');
      expect(fabricCanvasSpy.setBlendMode).toHaveBeenCalledWith('multiply');
    });
  });

  describe('text methods', () => {
    it('should add text with current settings', async () => {
      component.textInput.set('Hello World');
      component.textFontSize.set(32);
      component.textColor.set('#ff0000');
      
      await component.onAddText();
      
      expect(fabricCanvasSpy.addText).toHaveBeenCalledWith('Hello World', {
        fontSize: 32,
        fill: '#ff0000',
        fontFamily: 'Arial'
      });
    });

    it('should not add empty text', async () => {
      component.textInput.set('');
      spyOn(window, 'alert');
      
      await component.onAddText();
      
      expect(fabricCanvasSpy.addText).not.toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Please enter some text');
    });

    it('should reset text input after adding', async () => {
      component.textInput.set('Test');
      await component.onAddText();
      expect(component.textInput()).toBe('Enter text...');
    });

    it('should update text properties', async () => {
      await component.onTextProperty('fontSize', 24);
      expect(fabricCanvasSpy.updateTextProperties).toHaveBeenCalledWith({ fontSize: 24 });
    });
  });

  describe('tuning methods', () => {
    it('should apply brightness adjustment', () => {
      component.onBrightness(7);
      expect(component.brightness()).toBe(7);
      expect(fabricCanvasSpy.applyBrightnessFilter).toHaveBeenCalledWith(0.4); // (7-5)/5
    });

    it('should apply contrast adjustment', async () => {
      await component.onContrast(3);
      expect(component.contrast()).toBe(3);
      expect(fabricCanvasSpy.applyContrastFilter).toHaveBeenCalledWith(-0.4); // (3-5)/5
    });

    it('should reset all tuning settings', async () => {
      component.brightness.set(8);
      component.contrast.set(7);
      
      await component.onResetTuning();
      
      expect(component.brightness()).toBe(5);
      expect(component.contrast()).toBe(5);
      expect(fabricCanvasSpy.resetAllFilters).toHaveBeenCalled();
    });
  });

  describe('shape methods', () => {
    it('should select shape', () => {
      component.onSelectShape('rect');
      expect(component.selectedShape()).toBe('rect');
    });

    it('should add shape with colors', async () => {
      component.selectedShape.set('circle');
      component.shapeFillColor.set('#ff0000');
      component.shapeStrokeColor.set('#000000');
      
      await component.onAddShape();
      
      expect(fabricCanvasSpy.addShape).toHaveBeenCalledWith('circle', {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2
      });
    });
  });

  describe('filter methods', () => {
    it('should select filter', () => {
      component.onSelectFilter('grayscale');
      expect(component.selectedFilter()).toBe('grayscale');
    });

    it('should not apply filter without selection', async () => {
      spyOn(window, 'alert');
      documentStoreSpy.getSelectedObjectId.and.returnValue(null);
      
      await component.onApplyFilter();
      
      expect(window.alert).toHaveBeenCalledWith('Please select an image first');
    });

    it('should apply filter to selected image', async () => {
      const mockBlob = new Blob(['data'], { type: 'image/png' });
      const mockFilteredBlob = new Blob(['filtered'], { type: 'image/png' });
      
      component.selectedFilter.set('grayscale');
      documentStoreSpy.getSelectedObjectId.and.returnValue('img1');
      documentStoreSpy.getObject.and.returnValue({
        id: 'img1',
        type: 'image',
        assetId: 'asset1'
      } as any);
      
      assetStoreSpy.get.and.returnValue(Promise.resolve(mockBlob));
      photonFiltersSpy.applyFilter.and.returnValue(Promise.resolve(mockFilteredBlob));
      assetStoreSpy.put.and.returnValue(Promise.resolve({ assetId: 'asset2' } as any));
      historySpy.run.and.returnValue(Promise.resolve());
      
      await component.onApplyFilter();
      
      expect(photonFiltersSpy.applyFilter).toHaveBeenCalledWith(mockBlob, 'grayscale');
      expect(historySpy.run).toHaveBeenCalled();
    });
  });

  describe('crop methods', () => {
    it('should update crop dimensions', () => {
      component.onCropWidth(800);
      component.onCropHeight(600);
      
      expect(component.cropWidth()).toBe(800);
      expect(component.cropHeight()).toBe(600);
    });

    it('should apply crop with valid dimensions', async () => {
      component.cropWidth.set(640);
      component.cropHeight.set(480);
      
      await component.onApplyCrop();
      
      expect(fabricCanvasSpy.resizeImage).toHaveBeenCalledWith(640, 480);
    });

    it('should not apply crop with invalid dimensions', async () => {
      spyOn(console, 'warn');
      component.cropWidth.set(0);
      component.cropHeight.set(0);
      
      await component.onApplyCrop();
      
      expect(fabricCanvasSpy.resizeImage).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('Invalid crop dimensions');
    });

    it('should cancel crop', () => {
      component.cropWidth.set(800);
      component.cropHeight.set(600);
      
      component.onCancelCrop();
      
      expect(component.cropWidth()).toBeNull();
      expect(component.cropHeight()).toBeNull();
    });
  });

  describe('corner methods', () => {
    it('should apply corner radius', async () => {
      documentStoreSpy.getObject.and.returnValue({ type: 'image' } as any);
      documentStoreSpy.selectedObjectId = signal('img1');
      
      await component.onCornerRadiusChange(20);
      
      expect(component.cornerRadius()).toBe(20);
      expect(fabricCanvasSpy.applyRoundedCorners).toHaveBeenCalledWith(20);
    });

    it('should reset corner radius', async () => {
      await component.onResetCornerRadius();
      
      expect(component.cornerRadius()).toBe(0);
      expect(fabricCanvasSpy.applyRoundedCorners).toHaveBeenCalledWith(0);
    });
  });

  describe('mask methods', () => {
    it('should apply shape mask to selected image', async () => {
      documentStoreSpy.getObject.and.returnValue({ type: 'image' } as any);
      documentStoreSpy.selectedObjectId = signal('img1');
      
      await component.onApplyShapeMask('circle');
      
      expect(fabricCanvasSpy.applyShapeMask).toHaveBeenCalledWith('circle');
    });

    it('should not apply mask without selection', async () => {
      spyOn(window, 'alert');
      documentStoreSpy.selectedObjectId = signal(null);
      
      await component.onApplyShapeMask('circle');
      
      expect(window.alert).toHaveBeenCalledWith('Please select an image first');
      expect(fabricCanvasSpy.applyShapeMask).not.toHaveBeenCalled();
    });

    it('should remove mask', async () => {
      documentStoreSpy.getObject.and.returnValue({ type: 'image' } as any);
      documentStoreSpy.selectedObjectId = signal('img1');
      
      await component.onRemoveMask();
      
      expect(fabricCanvasSpy.removeClipPath).toHaveBeenCalled();
    });
  });

  describe('emoji picker', () => {
    it('should toggle emoji picker', () => {
      expect(component.showEmojiPicker()).toBe(false);
      
      component.toggleEmojiPicker();
      expect(component.showEmojiPicker()).toBe(true);
      
      component.toggleEmojiPicker();
      expect(component.showEmojiPicker()).toBe(false);
    });

    it('should add emoji on selection', () => {
      const event = { emoji: { native: '😀' } };
      component.iconSize.set(48);
      
      component.onEmojiSelect(event);
      
      expect(fabricCanvasSpy.addEmoji).toHaveBeenCalledWith('😀', { size: 48 });
      expect(component.showEmojiPicker()).toBe(false);
    });
  });

  describe('computed properties', () => {
    it('should compute selected object', () => {
      const mockObject = { id: 'obj1', type: 'image' };
      documentStoreSpy.selectedObjectId = signal('obj1');
      documentStoreSpy.getObject.and.returnValue(mockObject as any);
      
      expect(component.selectedObject()).toBe(mockObject);
    });

    it('should detect image selection', () => {
      documentStoreSpy.selectedObjectId = signal('img1');
      documentStoreSpy.getObject.and.returnValue({ type: 'image' } as any);
      
      expect(component.isImageSelected()).toBe(true);
    });

    it('should detect text selection', () => {
      documentStoreSpy.selectedObjectId = signal('txt1');
      documentStoreSpy.getObject.and.returnValue({ type: 'text' } as any);
      
      expect(component.isTextSelected()).toBe(true);
    });

    it('should compute selected opacity', () => {
      documentStoreSpy.selectedObjectId = signal('obj1');
      documentStoreSpy.getObject.and.returnValue({ opacity: 0.5 } as any);
      
      expect(component.selectedOpacity()).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle missing filter name gracefully', async () => {
      component.selectedFilter.set(null);
      await component.onApplyFilter();
      expect(photonFiltersSpy.applyFilter).not.toHaveBeenCalled();
    });

    it('should handle filter application error', async () => {
      spyOn(window, 'alert');
      spyOn(console, 'error');
      
      component.selectedFilter.set('grayscale');
      documentStoreSpy.getSelectedObjectId.and.returnValue('img1');
      documentStoreSpy.getObject.and.returnValue({ type: 'image', assetId: 'asset1' } as any);
      assetStoreSpy.get.and.returnValue(Promise.reject(new Error('Asset not found')));
      
      await component.onApplyFilter();
      
      expect(window.alert).toHaveBeenCalledWith('Failed to apply filter');
      expect(component.isApplyingFilter()).toBe(false);
    });

    it('should handle empty emoji selection', () => {
      const event = { emoji: null };
      component.onEmojiSelect(event);
      expect(fabricCanvasSpy.addEmoji).not.toHaveBeenCalled();
    });
  });
});
