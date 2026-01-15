import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolbarComponent } from './toolbar.component';
import { FabricCanvasService } from '../../services/fabric-canvas.service';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;
  let fabricCanvasSpy: jasmine.SpyObj<FabricCanvasService>;

  beforeEach(async () => {
    const fabricCanvasSpyObj = jasmine.createSpyObj('FabricCanvasService', [
      'setTool',
      'rotateSelected',
      'flipY',
    ]);

    await TestBed.configureTestingModule({
      imports: [ToolbarComponent],
      providers: [
        { provide: FabricCanvasService, useValue: fabricCanvasSpyObj },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    fabricCanvasSpy = TestBed.inject(FabricCanvasService) as jasmine.SpyObj<FabricCanvasService>;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with select tool as default', () => {
      expect(component.currentTool()).toBe('select');
    });

    it('should have importImage event emitter', () => {
      expect(component.importImage).toBeDefined();
      expect(component.importImage.observers.length).toBe(0);
    });

    it('should have toolChange event emitter', () => {
      expect(component.toolChange).toBeDefined();
      expect(component.toolChange.observers.length).toBe(0);
    });
  });

  describe('onSelectTool', () => {
    it('should set current tool to select', () => {
      component.currentTool.set('draw');
      component.onSelectTool();
      expect(component.currentTool()).toBe('select');
    });

    it('should call fabricCanvas.setTool with select', () => {
      component.onSelectTool();
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('select');
    });

    it('should emit toolChange event with select', (done) => {
      component.toolChange.subscribe((tool) => {
        expect(tool).toBe('select');
        done();
      });
      component.onSelectTool();
    });
  });

  describe('onDrawTool', () => {
    it('should set current tool to draw', () => {
      component.onDrawTool();
      expect(component.currentTool()).toBe('draw');
    });

    it('should call fabricCanvas.setTool with draw', () => {
      component.onDrawTool();
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('draw');
    });

    it('should emit toolChange event with draw', (done) => {
      component.toolChange.subscribe((tool) => {
        expect(tool).toBe('draw');
        done();
      });
      component.onDrawTool();
    });
  });

  describe('onTextTool', () => {
    it('should set current tool to text', () => {
      component.onTextTool();
      expect(component.currentTool()).toBe('text');
    });

    it('should call fabricCanvas.setTool with text', () => {
      component.onTextTool();
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('text');
    });

    it('should emit toolChange event with text', (done) => {
      component.toolChange.subscribe((tool) => {
        expect(tool).toBe('text');
        done();
      });
      component.onTextTool();
    });
  });

  describe('onSetTool', () => {
    it('should set current tool to provided value', () => {
      component.onSetTool('shape');
      expect(component.currentTool()).toBe('shape');
    });

    it('should call fabricCanvas.setTool with provided tool', () => {
      component.onSetTool('crop');
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('crop');
    });

    it('should emit toolChange event with provided tool', (done) => {
      component.toolChange.subscribe((tool) => {
        expect(tool).toBe('filter');
        done();
      });
      component.onSetTool('filter');
    });

    it('should handle custom tool names', () => {
      const customTool = 'watermark';
      component.onSetTool(customTool);
      
      expect(component.currentTool()).toBe(customTool);
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith(customTool);
    });

    it('should update tool multiple times correctly', () => {
      component.onSetTool('shape');
      expect(component.currentTool()).toBe('shape');
      
      component.onSetTool('crop');
      expect(component.currentTool()).toBe('crop');
      
      component.onSetTool('select');
      expect(component.currentTool()).toBe('select');
    });
  });

  describe('onImportImage', () => {
    it('should emit importImage event', (done) => {
      component.importImage.subscribe(() => {
        done();
      });
      component.onImportImage();
    });

    it('should not call fabricCanvas methods', () => {
      component.onImportImage();
      expect(fabricCanvasSpy.setTool).not.toHaveBeenCalled();
      expect(fabricCanvasSpy.rotateSelected).not.toHaveBeenCalled();
      expect(fabricCanvasSpy.flipY).not.toHaveBeenCalled();
    });

    it('should emit event multiple times when called multiple times', () => {
      let emitCount = 0;
      component.importImage.subscribe(() => {
        emitCount++;
      });
      
      component.onImportImage();
      component.onImportImage();
      component.onImportImage();
      
      expect(emitCount).toBe(3);
    });
  });

  describe('onRotate', () => {
    it('should call fabricCanvas.rotateSelected with 90 degrees', async () => {
      fabricCanvasSpy.rotateSelected.and.returnValue(Promise.resolve());
      
      await component.onRotate();
      
      expect(fabricCanvasSpy.rotateSelected).toHaveBeenCalledWith(90);
    });

    it('should handle rotation promise', async () => {
      fabricCanvasSpy.rotateSelected.and.returnValue(Promise.resolve());
      
      const result = component.onRotate();
      expect(result).toBeInstanceOf(Promise);
      
      await result;
      expect(fabricCanvasSpy.rotateSelected).toHaveBeenCalled();
    });

    it('should handle rotation errors', async () => {
      const error = new Error('Rotation failed');
      fabricCanvasSpy.rotateSelected.and.returnValue(Promise.reject(error));
      
      await expectAsync(component.onRotate()).toBeRejectedWith(error);
    });

    it('should not change current tool', async () => {
      fabricCanvasSpy.rotateSelected.and.returnValue(Promise.resolve());
      const initialTool = component.currentTool();
      
      await component.onRotate();
      
      expect(component.currentTool()).toBe(initialTool);
    });
  });

  describe('onFlip', () => {
    it('should call fabricCanvas.flipY', async () => {
      fabricCanvasSpy.flipY.and.returnValue(Promise.resolve());
      
      await component.onFlip();
      
      expect(fabricCanvasSpy.flipY).toHaveBeenCalled();
    });

    it('should handle flip promise', async () => {
      fabricCanvasSpy.flipY.and.returnValue(Promise.resolve());
      
      const result = component.onFlip();
      expect(result).toBeInstanceOf(Promise);
      
      await result;
      expect(fabricCanvasSpy.flipY).toHaveBeenCalled();
    });

    it('should handle flip errors', async () => {
      const error = new Error('Flip failed');
      fabricCanvasSpy.flipY.and.returnValue(Promise.reject(error));
      
      await expectAsync(component.onFlip()).toBeRejectedWith(error);
    });

    it('should not change current tool', async () => {
      fabricCanvasSpy.flipY.and.returnValue(Promise.resolve());
      const initialTool = component.currentTool();
      
      await component.onFlip();
      
      expect(component.currentTool()).toBe(initialTool);
    });
  });

  describe('tool switching', () => {
    it('should switch between tools correctly', () => {
      component.onSelectTool();
      expect(component.currentTool()).toBe('select');
      
      component.onDrawTool();
      expect(component.currentTool()).toBe('draw');
      
      component.onTextTool();
      expect(component.currentTool()).toBe('text');
      
      component.onSetTool('shape');
      expect(component.currentTool()).toBe('shape');
    });

    it('should emit toolChange for each tool switch', () => {
      const emissions: string[] = [];
      component.toolChange.subscribe((tool) => {
        emissions.push(tool);
      });
      
      component.onSelectTool();
      component.onDrawTool();
      component.onTextTool();
      component.onSetTool('crop');
      
      expect(emissions).toEqual(['select', 'draw', 'text', 'crop']);
    });

    it('should call fabricCanvas.setTool for each tool switch', () => {
      component.onSelectTool();
      component.onDrawTool();
      component.onTextTool();
      
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledTimes(3);
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('select');
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('draw');
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('text');
    });
  });

  describe('edge cases', () => {
    it('should handle setting same tool multiple times', () => {
      component.onSelectTool();
      component.onSelectTool();
      component.onSelectTool();
      
      expect(component.currentTool()).toBe('select');
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledTimes(3);
    });

    it('should handle empty string as tool name', () => {
      component.onSetTool('');
      expect(component.currentTool()).toBe('');
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('');
    });

    it('should handle undefined toolChange subscribers', () => {
      // No subscribers attached
      expect(() => component.onSelectTool()).not.toThrow();
      expect(() => component.onDrawTool()).not.toThrow();
      expect(() => component.onTextTool()).not.toThrow();
    });

    it('should handle undefined importImage subscribers', () => {
      // No subscribers attached
      expect(() => component.onImportImage()).not.toThrow();
    });

    it('should handle rapid tool switching', () => {
      const tools = ['select', 'draw', 'text', 'shape', 'crop', 'filter'];
      
      tools.forEach(tool => component.onSetTool(tool));
      
      expect(component.currentTool()).toBe('filter'); // Last tool set
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledTimes(tools.length);
    });

    it('should handle concurrent async operations', async () => {
      fabricCanvasSpy.rotateSelected.and.returnValue(Promise.resolve());
      fabricCanvasSpy.flipY.and.returnValue(Promise.resolve());
      
      const rotatePromise = component.onRotate();
      const flipPromise = component.onFlip();
      
      await Promise.all([rotatePromise, flipPromise]);
      
      expect(fabricCanvasSpy.rotateSelected).toHaveBeenCalled();
      expect(fabricCanvasSpy.flipY).toHaveBeenCalled();
    });

    it('should maintain state after async operation failure', async () => {
      fabricCanvasSpy.rotateSelected.and.returnValue(Promise.reject(new Error('Failed')));
      component.currentTool.set('draw');
      
      try {
        await component.onRotate();
      } catch (e) {
        // Expected error
      }
      
      expect(component.currentTool()).toBe('draw'); // State unchanged
    });
  });

  describe('integration scenarios', () => {
    it('should handle full user workflow', () => {
      const toolChanges: string[] = [];
      component.toolChange.subscribe((tool) => toolChanges.push(tool));
      
      // User selects select tool
      component.onSelectTool();
      
      // User switches to draw tool
      component.onDrawTool();
      
      // User wants to import image
      let importTriggered = false;
      component.importImage.subscribe(() => importTriggered = true);
      component.onImportImage();
      
      // User switches to text tool
      component.onTextTool();
      
      expect(toolChanges).toEqual(['select', 'draw', 'text']);
      expect(importTriggered).toBe(true);
      expect(component.currentTool()).toBe('text');
    });

    it('should handle tool change with subsequent operations', async () => {
      fabricCanvasSpy.rotateSelected.and.returnValue(Promise.resolve());
      
      component.onSelectTool();
      await component.onRotate();
      
      expect(component.currentTool()).toBe('select');
      expect(fabricCanvasSpy.setTool).toHaveBeenCalledWith('select');
      expect(fabricCanvasSpy.rotateSelected).toHaveBeenCalledWith(90);
    });

    it('should emit events in correct order', () => {
      const events: string[] = [];
      
      component.toolChange.subscribe((tool) => {
        events.push(`toolChange:${tool}`);
      });
      
      component.importImage.subscribe(() => {
        events.push('importImage');
      });
      
      component.onSelectTool();
      component.onImportImage();
      component.onDrawTool();
      
      expect(events).toEqual([
        'toolChange:select',
        'importImage',
        'toolChange:draw'
      ]);
    });
  });
});
