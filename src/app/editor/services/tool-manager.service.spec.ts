import { TestBed } from '@angular/core/testing';
import { ToolManagerService } from './tool-manager.service';
import { DrawingService } from './drawing.service';
import { TextService } from './text.service';
import * as fabric from 'fabric';

describe('ToolManagerService', () => {
  let service: ToolManagerService;
  let mockDrawingService: jasmine.SpyObj<DrawingService>;
  let mockTextService: jasmine.SpyObj<TextService>;
  let mockCanvas: jasmine.SpyObj<fabric.Canvas>;

  beforeEach(() => {
    mockDrawingService = jasmine.createSpyObj('DrawingService', [
      'enableDrawingMode',
      'disableDrawingMode',
      'setBrush',
      'getBrushType',
    ]);

    mockTextService = jasmine.createSpyObj('TextService', ['enableTextMode']);

    mockCanvas = jasmine.createSpyObj('Canvas', [], {
      isDrawingMode: false,
      selection: true,
      defaultCursor: 'default',
    });

    TestBed.configureTestingModule({
      providers: [
        ToolManagerService,
        { provide: DrawingService, useValue: mockDrawingService },
        { provide: TextService, useValue: mockTextService },
      ],
    });

    service = TestBed.inject(ToolManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentTool', () => {
    it('should return current tool signal', () => {
      const currentTool = service.getCurrentTool();
      expect(currentTool()).toBe('select');
    });
  });

  describe('getCurrentToolValue', () => {
    it('should return current tool value', () => {
      expect(service.getCurrentToolValue()).toBe('select');
    });
  });

  describe('setTool', () => {
    it('should set tool to select', () => {
      service.setTool(mockCanvas, 'select');

      expect(service.getCurrentToolValue()).toBe('select');
      expect(mockDrawingService.disableDrawingMode).toHaveBeenCalledWith(mockCanvas);
      expect(mockCanvas.isDrawingMode).toBe(false);
      expect(mockCanvas.selection).toBe(true);
      expect(mockCanvas.defaultCursor).toBe('default');
    });

    it('should set tool to draw', () => {
      service.setTool(mockCanvas, 'draw');

      expect(service.getCurrentToolValue()).toBe('draw');
      expect(mockDrawingService.enableDrawingMode).toHaveBeenCalledWith(mockCanvas);
      expect(mockCanvas.selection).toBe(false);
    });

    it('should set tool to text', () => {
      service.setTool(mockCanvas, 'text');

      expect(service.getCurrentToolValue()).toBe('text');
      expect(mockTextService.enableTextMode).toHaveBeenCalledWith(mockCanvas);
      expect(mockCanvas.isDrawingMode).toBe(false);
      expect(mockCanvas.selection).toBe(false);
      expect(mockCanvas.defaultCursor).toBe('text');
    });

    it('should set tool to shape', () => {
      service.setTool(mockCanvas, 'shape');

      expect(service.getCurrentToolValue()).toBe('shape');
      expect(mockDrawingService.disableDrawingMode).toHaveBeenCalledWith(mockCanvas);
      expect(mockCanvas.isDrawingMode).toBe(false);
      expect(mockCanvas.selection).toBe(false);
      expect(mockCanvas.defaultCursor).toBe('crosshair');
    });

    it('should handle all tool types', () => {
      const tools: Array<'select' | 'draw' | 'text' | 'tuning' | 'crop' | 'shape' | 'icon' | 'filters' | 'corner' | 'watermark'> = [
        'select', 'draw', 'text', 'tuning', 'crop', 'shape', 'icon', 'filters', 'corner', 'watermark'
      ];

      tools.forEach(tool => {
        service.setTool(mockCanvas, tool);
        expect(service.getCurrentToolValue()).toBe(tool);
      });
    });

    it('should handle null canvas', () => {
      expect(() => {
        service.setTool(null, 'select');
      }).not.toThrow();

      expect(service.getCurrentToolValue()).toBe('select');
    });
  });

  describe('setBrush', () => {
    it('should set brush color', () => {
      service.setBrush(mockCanvas, { color: '#ff0000' });

      expect(mockDrawingService.setBrush).toHaveBeenCalledWith(mockCanvas, { color: '#ff0000' });
    });

    it('should set brush width', () => {
      service.setBrush(mockCanvas, { width: 10 });

      expect(mockDrawingService.setBrush).toHaveBeenCalledWith(mockCanvas, { width: 10 });
    });

    it('should set brush type', () => {
      service.setBrush(mockCanvas, { type: 'circle' });

      expect(mockDrawingService.setBrush).toHaveBeenCalledWith(mockCanvas, { type: 'circle' });
    });

    it('should set brush shadow', () => {
      const shadow = { blur: 5, offsetX: 2, offsetY: 2, color: '#000000' };
      service.setBrush(mockCanvas, { shadow });

      expect(mockDrawingService.setBrush).toHaveBeenCalledWith(mockCanvas, { shadow });
    });

    it('should set multiple brush properties', () => {
      const options = { color: '#00ff00', width: 5, type: 'spray' as const };
      service.setBrush(mockCanvas, options);

      expect(mockDrawingService.setBrush).toHaveBeenCalledWith(mockCanvas, options);
    });

    it('should handle null canvas', () => {
      expect(() => {
        service.setBrush(null, { color: '#ff0000' });
      }).not.toThrow();

      expect(mockDrawingService.setBrush).not.toHaveBeenCalled();
    });
  });

  describe('getBrushType', () => {
    it('should return brush type from drawing service', () => {
      mockDrawingService.getBrushType.and.returnValue('pencil');

      const brushType = service.getBrushType(mockCanvas);

      expect(brushType).toBe('pencil');
      expect(mockDrawingService.getBrushType).toHaveBeenCalledWith(mockCanvas);
    });

    it('should return pencil for null canvas', () => {
      const brushType = service.getBrushType(null);

      expect(brushType).toBe('pencil');
      expect(mockDrawingService.getBrushType).not.toHaveBeenCalled();
    });
  });
});
