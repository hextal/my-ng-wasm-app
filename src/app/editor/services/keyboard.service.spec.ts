import { TestBed } from '@angular/core/testing';
import { KeyboardService } from './keyboard.service';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import * as fabric from 'fabric';

describe('KeyboardService', () => {
  let service: KeyboardService;
  let mockCanvas: jasmine.SpyObj<fabric.Canvas>;
  let mockRenderer: jasmine.SpyObj<FabricRenderer>;

  beforeEach(() => {
    mockCanvas = jasmine.createSpyObj('Canvas', ['getActiveObject', 'requestRenderAll']);
    mockRenderer = jasmine.createSpyObj('FabricRenderer', ['getFabricObjectId']);

    TestBed.configureTestingModule({
      providers: [KeyboardService],
    });

    service = TestBed.inject(KeyboardService);
  });

  afterEach(() => {
    service.removeKeyboardHandlers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setupKeyboardHandlers', () => {
    it('should setup keyboard event listener', () => {
      spyOn(document, 'addEventListener');
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      expect(document.addEventListener).toHaveBeenCalledWith('keydown', jasmine.any(Function));
    });

    it('should remove existing listener before adding new one', () => {
      spyOn(document, 'addEventListener');
      spyOn(document, 'removeEventListener');
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);
      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      expect(document.removeEventListener).toHaveBeenCalled();
      expect(document.addEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('keyboard shortcuts', () => {
    it('should handle Delete key', () => {
      const mockObject = new fabric.Rect();
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      const event = new KeyboardEvent('keydown', { key: 'Delete' });
      spyOn(event, 'preventDefault');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onDelete).toHaveBeenCalled();
    });

    it('should handle Backspace key', () => {
      const mockObject = new fabric.Rect();
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      const event = new KeyboardEvent('keydown', { key: 'Backspace' });
      spyOn(event, 'preventDefault');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onDelete).toHaveBeenCalled();
    });

    it('should nudge object up with ArrowUp', () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ top: 100 });
      mockObject.setCoords = jasmine.createSpy('setCoords');
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      document.dispatchEvent(event);

      expect(mockObject.top).toBe(99);
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    });

    it('should nudge object down with ArrowDown', () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ top: 100 });
      mockObject.setCoords = jasmine.createSpy('setCoords');
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(event);

      expect(mockObject.top).toBe(101);
    });

    it('should nudge object left with ArrowLeft', () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ left: 100 });
      mockObject.setCoords = jasmine.createSpy('setCoords');
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      document.dispatchEvent(event);

      expect(mockObject.left).toBe(99);
    });

    it('should nudge object right with ArrowRight', () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ left: 100 });
      mockObject.setCoords = jasmine.createSpy('setCoords');
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      document.dispatchEvent(event);

      expect(mockObject.left).toBe(101);
    });

    it('should nudge by 10 pixels with Shift modifier', () => {
      const mockObject = new fabric.Rect();
      mockObject.set({ top: 100 });
      mockObject.setCoords = jasmine.createSpy('setCoords');
      mockCanvas.getActiveObject.and.returnValue(mockObject);
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true });
      document.dispatchEvent(event);

      expect(mockObject.top).toBe(90);
    });

    it('should not handle events when no active object', () => {
      mockCanvas.getActiveObject.and.returnValue(null);
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);

      const event = new KeyboardEvent('keydown', { key: 'Delete' });
      document.dispatchEvent(event);

      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('removeKeyboardHandlers', () => {
    it('should remove keyboard event listener', () => {
      spyOn(document, 'removeEventListener');
      const onDelete = jasmine.createSpy('onDelete');

      service.setupKeyboardHandlers(mockCanvas, mockRenderer, onDelete);
      service.removeKeyboardHandlers();

      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', jasmine.any(Function));
    });

    it('should not throw when called without setup', () => {
      expect(() => {
        service.removeKeyboardHandlers();
      }).not.toThrow();
    });
  });
});
