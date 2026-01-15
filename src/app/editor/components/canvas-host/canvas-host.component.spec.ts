import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { CanvasHostComponent } from './canvas-host.component';
import { FabricCanvasService } from '../../services/fabric-canvas.service';
import { DocumentStoreService } from '../../services/document-store.service';
import * as fabric from 'fabric';

describe('CanvasHostComponent', () => {
  let component: CanvasHostComponent;
  let fixture: ComponentFixture<CanvasHostComponent>;
  let fabricCanvasSpy: jasmine.SpyObj<FabricCanvasService>;
  let documentStoreSpy: jasmine.SpyObj<DocumentStoreService>;
  let mockCanvas: jasmine.SpyObj<fabric.Canvas>;

  beforeEach(async () => {
    mockCanvas = jasmine.createSpyObj('Canvas', [
      'setDimensions',
      'requestRenderAll',
      'dispose',
    ]);

    const fabricCanvasSpyObj = jasmine.createSpyObj('FabricCanvasService', [
      'init',
      'getCanvas',
      'dispose',
    ]);

    const documentStoreSpyObj = jasmine.createSpyObj('DocumentStoreService', [
      'setDimensions',
    ]);

    // Set up getCanvas to return mock canvas
    fabricCanvasSpyObj.getCanvas.and.returnValue(mockCanvas);
    fabricCanvasSpyObj.init.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [CanvasHostComponent],
      providers: [
        { provide: FabricCanvasService, useValue: fabricCanvasSpyObj },
        { provide: DocumentStoreService, useValue: documentStoreSpyObj },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasHostComponent);
    component = fixture.componentInstance;
    fabricCanvasSpy = TestBed.inject(FabricCanvasService) as jasmine.SpyObj<FabricCanvasService>;
    documentStoreSpy = TestBed.inject(DocumentStoreService) as jasmine.SpyObj<DocumentStoreService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize without errors', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });
  });

  describe('ngAfterViewInit', () => {
    beforeEach(() => {
      // Create mock canvas element
      const mockCanvasElement = document.createElement('canvas');
      component.canvasRef = {
        nativeElement: mockCanvasElement,
      } as ElementRef<HTMLCanvasElement>;

      // Create mock container with dimensions
      const mockContainer = document.createElement('div');
      mockContainer.className = 'canvas-container';
      Object.defineProperty(mockContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 800,
          height: 600,
          top: 0,
          left: 0,
          right: 800,
          bottom: 600,
        }),
      });

      // Mock elementRef to return container
      spyOn(component['elementRef'].nativeElement, 'querySelector').and.returnValue(mockContainer);
    });

    it('should initialize canvas with container dimensions', fakeAsync(async () => {
      await component.ngAfterViewInit();
      tick();

      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(800, 600);
      expect(fabricCanvasSpy.init).toHaveBeenCalledWith(
        component.canvasRef.nativeElement,
        800,
        600
      );
    }));

    it('should handle missing canvas ref gracefully', fakeAsync(async () => {
      component.canvasRef = undefined as any;

      await component.ngAfterViewInit();
      tick();

      expect(fabricCanvasSpy.init).not.toHaveBeenCalled();
    }));

    it('should handle missing native element gracefully', fakeAsync(async () => {
      component.canvasRef = {
        nativeElement: null as any,
      } as ElementRef<HTMLCanvasElement>;

      await component.ngAfterViewInit();
      tick();

      expect(fabricCanvasSpy.init).not.toHaveBeenCalled();
    }));

    it('should handle missing container gracefully', fakeAsync(async () => {
      const mockCanvasElement = document.createElement('canvas');
      component.canvasRef = {
        nativeElement: mockCanvasElement,
      } as ElementRef<HTMLCanvasElement>;

      // Return null for container query
      component['elementRef'].nativeElement.querySelector = jasmine
        .createSpy('querySelector')
        .and.returnValue(null);

      await component.ngAfterViewInit();
      tick();

      expect(fabricCanvasSpy.init).not.toHaveBeenCalled();
    }));

    it('should handle initialization errors', fakeAsync(async () => {
      fabricCanvasSpy.init.and.returnValue(
        Promise.reject(new Error('Canvas init failed'))
      );

      spyOn(console, 'error');

      await component.ngAfterViewInit();
      tick();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize canvas:',
        jasmine.any(Error)
      );
    }));

    it('should wait for DOM to be ready before initialization', fakeAsync(async () => {
      const initPromise = component.ngAfterViewInit();
      
      // Should not call init immediately
      expect(fabricCanvasSpy.init).not.toHaveBeenCalled();

      // Wait for the setTimeout(0)
      tick(0);

      await initPromise;

      // Now init should have been called
      expect(fabricCanvasSpy.init).toHaveBeenCalled();
    }));

    it('should round container dimensions to integers', fakeAsync(async () => {
      // Create container with fractional dimensions
      const mockContainer = document.createElement('div');
      mockContainer.className = 'canvas-container';
      Object.defineProperty(mockContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 800.7,
          height: 600.3,
          top: 0,
          left: 0,
          right: 800.7,
          bottom: 600.3,
        }),
      });

      component['elementRef'].nativeElement.querySelector = jasmine
        .createSpy('querySelector')
        .and.returnValue(mockContainer);

      await component.ngAfterViewInit();
      tick();

      // Should floor dimensions
      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(800, 600);
      expect(fabricCanvasSpy.init).toHaveBeenCalledWith(
        component.canvasRef.nativeElement,
        800,
        600
      );
    }));
  });

  describe('onWindowResize', () => {
    beforeEach(() => {
      // Setup canvas and container
      const mockCanvasElement = document.createElement('canvas');
      component.canvasRef = {
        nativeElement: mockCanvasElement,
      } as ElementRef<HTMLCanvasElement>;

      const mockContainer = document.createElement('div');
      mockContainer.className = 'canvas-container';
      Object.defineProperty(mockContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 1024,
          height: 768,
          top: 0,
          left: 0,
          right: 1024,
          bottom: 768,
        }),
      });

      spyOn(component['elementRef'].nativeElement, 'querySelector').and.returnValue(mockContainer);
    });

    it('should debounce resize events', fakeAsync(() => {
      component.onWindowResize();
      component.onWindowResize();
      component.onWindowResize();

      // Should not call setDimensions immediately
      expect(documentStoreSpy.setDimensions).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      tick(250);

      // Should only call once after debounce
      expect(documentStoreSpy.setDimensions).toHaveBeenCalledTimes(1);
    }));

    it('should update document dimensions on resize', fakeAsync(() => {
      component.onWindowResize();
      tick(250);

      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(1024, 768);
    }));

    it('should resize fabric canvas on window resize', fakeAsync(() => {
      component.onWindowResize();
      tick(250);

      expect(mockCanvas.setDimensions).toHaveBeenCalledWith({
        width: 1024,
        height: 768,
      });
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    }));

    it('should clear previous timeout on subsequent resize', fakeAsync(() => {
      spyOn(window, 'clearTimeout');

      component.onWindowResize();
      const firstTimeout = component['resizeTimeout'];

      component.onWindowResize();

      expect(window.clearTimeout).toHaveBeenCalledWith(firstTimeout);
      
      tick(250);
    }));

    it('should handle missing container during resize', fakeAsync(() => {
      component['elementRef'].nativeElement.querySelector = jasmine
        .createSpy('querySelector')
        .and.returnValue(null);

      component.onWindowResize();
      tick(250);

      expect(documentStoreSpy.setDimensions).not.toHaveBeenCalled();
      expect(mockCanvas.setDimensions).not.toHaveBeenCalled();
    }));

    it('should handle missing canvasRef during resize', fakeAsync(() => {
      component.canvasRef = undefined as any;

      component.onWindowResize();
      tick(250);

      expect(documentStoreSpy.setDimensions).not.toHaveBeenCalled();
      expect(mockCanvas.setDimensions).not.toHaveBeenCalled();
    }));

    it('should handle null canvas from FabricCanvasService', fakeAsync(() => {
      fabricCanvasSpy.getCanvas.and.returnValue(null);

      component.onWindowResize();
      tick(250);

      // Should update document dimensions but not canvas
      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(1024, 768);
      expect(mockCanvas.setDimensions).not.toHaveBeenCalled();
    }));

    it('should round resized dimensions to integers', fakeAsync(() => {
      const mockContainer = document.createElement('div');
      mockContainer.className = 'canvas-container';
      Object.defineProperty(mockContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 1024.9,
          height: 768.2,
          top: 0,
          left: 0,
          right: 1024.9,
          bottom: 768.2,
        }),
      });

      component['elementRef'].nativeElement.querySelector = jasmine
        .createSpy('querySelector')
        .and.returnValue(mockContainer);

      component.onWindowResize();
      tick(250);

      // Should floor dimensions
      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(1024, 768);
      expect(mockCanvas.setDimensions).toHaveBeenCalledWith({
        width: 1024,
        height: 768,
      });
    }));

    it('should handle multiple rapid resizes correctly', fakeAsync(() => {
      component.onWindowResize();
      tick(100);
      component.onWindowResize();
      tick(100);
      component.onWindowResize();
      tick(250);

      // Should only process once after final debounce
      expect(documentStoreSpy.setDimensions).toHaveBeenCalledTimes(1);
      expect(mockCanvas.setDimensions).toHaveBeenCalledTimes(1);
    }));
  });

  describe('ngOnDestroy', () => {
    it('should clear resize timeout', () => {
      spyOn(window, 'clearTimeout');
      component['resizeTimeout'] = 123;

      component.ngOnDestroy();

      expect(window.clearTimeout).toHaveBeenCalledWith(123);
    });

    it('should dispose fabric canvas', () => {
      component.ngOnDestroy();

      expect(fabricCanvasSpy.dispose).toHaveBeenCalled();
    });

    it('should handle missing resize timeout gracefully', () => {
      component['resizeTimeout'] = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
      expect(fabricCanvasSpy.dispose).toHaveBeenCalled();
    });

    it('should cleanup in correct order', () => {
      const callOrder: string[] = [];

      spyOn(window, 'clearTimeout').and.callFake(() => {
        callOrder.push('clearTimeout');
      });

      fabricCanvasSpy.dispose.and.callFake(() => {
        callOrder.push('dispose');
      });

      component['resizeTimeout'] = 123;
      component.ngOnDestroy();

      expect(callOrder).toEqual(['clearTimeout', 'dispose']);
    });
  });

  describe('HostListener integration', () => {
    it('should respond to window resize events', fakeAsync(() => {
      // Setup mock environment
      const mockCanvasElement = document.createElement('canvas');
      component.canvasRef = {
        nativeElement: mockCanvasElement,
      } as ElementRef<HTMLCanvasElement>;

      const mockContainer = document.createElement('div');
      mockContainer.className = 'canvas-container';
      Object.defineProperty(mockContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 1920,
          height: 1080,
          top: 0,
          left: 0,
          right: 1920,
          bottom: 1080,
        }),
      });

      spyOn(component['elementRef'].nativeElement, 'querySelector').and.returnValue(mockContainer);

      // Simulate window resize
      window.dispatchEvent(new Event('resize'));
      tick(250);

      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(1920, 1080);
    }));
  });

  describe('edge cases', () => {
    it('should handle zero container dimensions', fakeAsync(async () => {
      const mockCanvasElement = document.createElement('canvas');
      component.canvasRef = {
        nativeElement: mockCanvasElement,
      } as ElementRef<HTMLCanvasElement>;

      const mockContainer = document.createElement('div');
      mockContainer.className = 'canvas-container';
      Object.defineProperty(mockContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 0,
          height: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }),
      });

      spyOn(component['elementRef'].nativeElement, 'querySelector').and.returnValue(mockContainer);

      await component.ngAfterViewInit();
      tick();

      // Should still try to initialize with zero dimensions
      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(0, 0);
      expect(fabricCanvasSpy.init).toHaveBeenCalledWith(
        mockCanvasElement,
        0,
        0
      );
    }));

    it('should handle very large container dimensions', fakeAsync(async () => {
      const mockCanvasElement = document.createElement('canvas');
      component.canvasRef = {
        nativeElement: mockCanvasElement,
      } as ElementRef<HTMLCanvasElement>;

      const mockContainer = document.createElement('div');
      mockContainer.className = 'canvas-container';
      Object.defineProperty(mockContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 10000,
          height: 8000,
          top: 0,
          left: 0,
          right: 10000,
          bottom: 8000,
        }),
      });

      spyOn(component['elementRef'].nativeElement, 'querySelector').and.returnValue(mockContainer);

      await component.ngAfterViewInit();
      tick();

      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(10000, 8000);
    }));

    it('should handle negative dimensions gracefully', fakeAsync(async () => {
      const mockCanvasElement = document.createElement('canvas');
      component.canvasRef = {
        nativeElement: mockCanvasElement,
      } as ElementRef<HTMLCanvasElement>;

      const mockContainer = document.createElement('div');
      mockContainer.className = 'canvas-container';
      Object.defineProperty(mockContainer, 'getBoundingClientRect', {
        value: () => ({
          width: -100,
          height: -100,
          top: 0,
          left: 0,
          right: -100,
          bottom: -100,
        }),
      });

      spyOn(component['elementRef'].nativeElement, 'querySelector').and.returnValue(mockContainer);

      await component.ngAfterViewInit();
      tick();

      // Math.floor of negative should still work
      expect(documentStoreSpy.setDimensions).toHaveBeenCalledWith(-100, -100);
    }));
  });
});
