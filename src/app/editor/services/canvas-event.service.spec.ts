import { TestBed } from '@angular/core/testing';
import { CanvasEventService } from './canvas-event.service';
import { DocumentStoreService } from './document-store.service';
import { HistoryService } from './history.service';
import { TextService } from './text.service';
import { ObjectTransformService } from './object-transform.service';
import { FabricRenderer } from '../core/renderer/fabric-renderer';
import * as fabric from 'fabric';
import { EditorObjectFactory, TextObject } from '../core/models/document.model';

describe('CanvasEventService', () => {
  let service: CanvasEventService;
  let mockDocumentStore: jasmine.SpyObj<DocumentStoreService>;
  let mockHistory: jasmine.SpyObj<HistoryService>;
  let mockTextService: jasmine.SpyObj<TextService>;
  let mockObjectTransformService: jasmine.SpyObj<ObjectTransformService>;
  let mockCanvas: jasmine.SpyObj<fabric.Canvas>;
  let mockRenderer: jasmine.SpyObj<FabricRenderer>;

  beforeEach(() => {
    // Create spies
    mockDocumentStore = jasmine.createSpyObj('DocumentStoreService', [
      'selectObject',
      'getObject',
    ]);

    mockHistory = jasmine.createSpyObj('HistoryService', ['run']);

    mockTextService = jasmine.createSpyObj('TextService', [
      'updateSelectedTextProperties',
    ]);

    mockObjectTransformService = jasmine.createSpyObj('ObjectTransformService', [
      'captureTransformSnapshot',
      'handleObjectModified',
    ]);

    mockCanvas = jasmine.createSpyObj('Canvas', [
      'on',
      'off',
      'remove',
      'requestRenderAll',
    ]);

    mockRenderer = jasmine.createSpyObj('FabricRenderer', [
      'getFabricObjectId',
      'addObject',
    ]);

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        CanvasEventService,
        { provide: DocumentStoreService, useValue: mockDocumentStore },
        { provide: HistoryService, useValue: mockHistory },
        { provide: TextService, useValue: mockTextService },
        { provide: ObjectTransformService, useValue: mockObjectTransformService },
      ],
    });

    service = TestBed.inject(CanvasEventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setupEventHandlers', () => {
    it('should setup all event handlers', () => {
      const currentTool = () => 'select';
      const onTextClick = jasmine.createSpy('onTextClick');

      service.setupEventHandlers(mockCanvas, mockRenderer, currentTool, onTextClick);

      // Verify event handlers were registered
      expect(mockCanvas.on).toHaveBeenCalledWith('mouse:down', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('selection:created', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('selection:updated', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('selection:cleared', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('text:changed', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('path:created', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('object:rotating', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('object:scaling', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('object:moving', jasmine.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith('object:modified', jasmine.any(Function));
    });

    it('should handle mouse:down event for text tool', async () => {
      const currentTool = () => 'text';
      const onTextClick = jasmine.createSpy('onTextClick').and.returnValue(Promise.resolve());
      
      service.setupEventHandlers(mockCanvas, mockRenderer, currentTool, onTextClick);

      // Get the mouse:down handler
      const mouseDownCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'mouse:down'
      );
      const mouseDownHandler = mouseDownCall?.args[1];

      // Simulate mouse down event
      await mouseDownHandler({ pointer: { x: 100, y: 200 } });

      expect(onTextClick).toHaveBeenCalledWith(100, 200);
    });

    it('should not handle mouse:down event for non-text tool', async () => {
      const currentTool = () => 'select';
      const onTextClick = jasmine.createSpy('onTextClick');
      
      service.setupEventHandlers(mockCanvas, mockRenderer, currentTool, onTextClick);

      // Get the mouse:down handler
      const mouseDownCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'mouse:down'
      );
      const mouseDownHandler = mouseDownCall?.args[1];

      // Simulate mouse down event
      await mouseDownHandler({ pointer: { x: 100, y: 200 } });

      expect(onTextClick).not.toHaveBeenCalled();
    });
  });

  describe('selection events', () => {
    beforeEach(() => {
      const currentTool = () => 'select';
      const onTextClick = () => Promise.resolve();
      service.setupEventHandlers(mockCanvas, mockRenderer, currentTool, onTextClick);
    });

    it('should handle selection:created event', () => {
      const mockObject = { type: 'rect' };
      mockRenderer.getFabricObjectId.and.returnValue('obj-123');

      // Get the selection:created handler
      const selectionCreatedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'selection:created'
      );
      const handler = selectionCreatedCall?.args[1];

      handler({ selected: [mockObject] });

      expect(mockRenderer.getFabricObjectId).toHaveBeenCalledWith(mockObject);
      expect(mockDocumentStore.selectObject).toHaveBeenCalledWith('obj-123');
    });

    it('should handle selection:updated event', () => {
      const mockObject = { type: 'rect' };
      mockRenderer.getFabricObjectId.and.returnValue('obj-456');

      // Get the selection:updated handler
      const selectionUpdatedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'selection:updated'
      );
      const handler = selectionUpdatedCall?.args[1];

      handler({ selected: [mockObject] });

      expect(mockRenderer.getFabricObjectId).toHaveBeenCalledWith(mockObject);
      expect(mockDocumentStore.selectObject).toHaveBeenCalledWith('obj-456');
    });

    it('should handle selection:cleared event', () => {
      // Get the selection:cleared handler
      const selectionClearedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'selection:cleared'
      );
      const handler = selectionClearedCall?.args[1];

      handler({});

      expect(mockDocumentStore.selectObject).toHaveBeenCalledWith(null);
    });

    it('should handle selection with no objectId', () => {
      const mockObject = { type: 'rect' };
      mockRenderer.getFabricObjectId.and.returnValue(null);

      // Get the selection:created handler
      const selectionCreatedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'selection:created'
      );
      const handler = selectionCreatedCall?.args[1];

      handler({ selected: [mockObject] });

      expect(mockRenderer.getFabricObjectId).toHaveBeenCalledWith(mockObject);
      expect(mockDocumentStore.selectObject).not.toHaveBeenCalled();
    });
  });

  describe('text events', () => {
    beforeEach(() => {
      const currentTool = () => 'select';
      const onTextClick = () => Promise.resolve();
      service.setupEventHandlers(mockCanvas, mockRenderer, currentTool, onTextClick);
    });

    it('should handle text:changed event', async () => {
      const textObj: TextObject = {
        id: 'text-123',
        type: 'text',
        text: 'Hello',
        x: 100,
        y: 100,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#000000',
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 0,
      };

      const mockFabricText = {
        type: 'i-text',
        text: 'Hello World',
      };

      mockRenderer.getFabricObjectId.and.returnValue('text-123');
      mockDocumentStore.getObject.and.returnValue(textObj);
      mockTextService.updateSelectedTextProperties.and.returnValue(Promise.resolve());

      // Get the text:changed handler
      const textChangedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'text:changed'
      );
      const handler = textChangedCall?.args[1];

      await handler({ target: mockFabricText });

      expect(mockRenderer.getFabricObjectId).toHaveBeenCalledWith(mockFabricText);
      expect(mockDocumentStore.getObject).toHaveBeenCalledWith('text-123');
      expect(mockTextService.updateSelectedTextProperties).toHaveBeenCalledWith({
        ...textObj,
        text: 'Hello World',
      });
    });

    it('should ignore text:changed for non-text objects', async () => {
      const mockObject = { type: 'rect' };

      // Get the text:changed handler
      const textChangedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'text:changed'
      );
      const handler = textChangedCall?.args[1];

      await handler({ target: mockObject });

      expect(mockTextService.updateSelectedTextProperties).not.toHaveBeenCalled();
    });
  });

  describe('drawing events', () => {
    beforeEach(() => {
      const currentTool = () => 'draw';
      const onTextClick = () => Promise.resolve();
      service.setupEventHandlers(mockCanvas, mockRenderer, currentTool, onTextClick);
    });

    it('should handle path:created event for PencilBrush (path)', async () => {
      const mockPath = {
        type: 'path',
        path: [['M', 0, 0], ['L', 100, 100]],
        stroke: '#000000',
        strokeWidth: 2,
        left: 50,
        top: 50,
      };

      mockHistory.run.and.returnValue(Promise.resolve());
      mockRenderer.addObject.and.returnValue(Promise.resolve());

      // Get the path:created handler
      const pathCreatedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'path:created'
      );
      const handler = pathCreatedCall?.args[1];

      await handler({ path: mockPath });

      expect(mockCanvas.remove).toHaveBeenCalledWith(mockPath);
      expect(mockHistory.run).toHaveBeenCalled();
      expect(mockRenderer.addObject).toHaveBeenCalled();
    });

    it('should handle path:created event for CircleBrush/SprayBrush (group)', async () => {
      const mockGroup = {
        type: 'group',
        set: jasmine.createSpy('set'),
      };

      // Mock renderer's objectMap
      (mockRenderer as any).objectMap = new Map();

      // Get the path:created handler
      const pathCreatedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'path:created'
      );
      const handler = pathCreatedCall?.args[1];

      await handler({ path: mockGroup });

      expect(mockGroup.set).toHaveBeenCalledWith({
        data: { id: jasmine.any(String), type: 'group' },
      });
      expect(mockCanvas.remove).not.toHaveBeenCalled();
    });

    it('should handle path:created with no path', async () => {
      // Get the path:created handler
      const pathCreatedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'path:created'
      );
      const handler = pathCreatedCall?.args[1];

      await handler({ path: null });

      expect(mockCanvas.remove).not.toHaveBeenCalled();
      expect(mockHistory.run).not.toHaveBeenCalled();
    });
  });

  describe('transform events', () => {
    beforeEach(() => {
      const currentTool = () => 'select';
      const onTextClick = () => Promise.resolve();
      service.setupEventHandlers(mockCanvas, mockRenderer, currentTool, onTextClick);
    });

    it('should handle object:rotating event', () => {
      const mockObject = { type: 'rect' };

      // Get the object:rotating handler
      const rotatingCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'object:rotating'
      );
      const handler = rotatingCall?.args[1];

      handler({ target: mockObject });

      expect(mockObjectTransformService.captureTransformSnapshot).toHaveBeenCalledWith(
        mockRenderer,
        mockObject
      );
    });

    it('should handle object:scaling event', () => {
      const mockObject = { type: 'rect' };

      // Get the object:scaling handler
      const scalingCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'object:scaling'
      );
      const handler = scalingCall?.args[1];

      handler({ target: mockObject });

      expect(mockObjectTransformService.captureTransformSnapshot).toHaveBeenCalledWith(
        mockRenderer,
        mockObject
      );
    });

    it('should handle object:moving event', () => {
      const mockObject = { type: 'rect' };

      // Get the object:moving handler
      const movingCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'object:moving'
      );
      const handler = movingCall?.args[1];

      handler({ target: mockObject });

      expect(mockObjectTransformService.captureTransformSnapshot).toHaveBeenCalledWith(
        mockRenderer,
        mockObject
      );
    });

    it('should handle object:modified event', async () => {
      const mockObject = { type: 'rect' };
      mockObjectTransformService.handleObjectModified.and.returnValue(Promise.resolve());

      // Get the object:modified handler
      const modifiedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'object:modified'
      );
      const handler = modifiedCall?.args[1];

      await handler({ target: mockObject });

      expect(mockObjectTransformService.handleObjectModified).toHaveBeenCalledWith(
        mockRenderer,
        mockObject
      );
    });

    it('should not handle object:modified with no target', async () => {
      // Get the object:modified handler
      const modifiedCall = (mockCanvas.on as jasmine.Spy).calls.all().find(
        call => call.args[0] === 'object:modified'
      );
      const handler = modifiedCall?.args[1];

      await handler({ target: null });

      expect(mockObjectTransformService.handleObjectModified).not.toHaveBeenCalled();
    });
  });

  describe('removeEventHandlers', () => {
    it('should remove all event handlers', () => {
      service.removeEventHandlers(mockCanvas);

      expect(mockCanvas.off).toHaveBeenCalledWith('mouse:down');
      expect(mockCanvas.off).toHaveBeenCalledWith('selection:created');
      expect(mockCanvas.off).toHaveBeenCalledWith('selection:updated');
      expect(mockCanvas.off).toHaveBeenCalledWith('selection:cleared');
      expect(mockCanvas.off).toHaveBeenCalledWith('text:changed');
      expect(mockCanvas.off).toHaveBeenCalledWith('path:created');
      expect(mockCanvas.off).toHaveBeenCalledWith('object:rotating');
      expect(mockCanvas.off).toHaveBeenCalledWith('object:scaling');
      expect(mockCanvas.off).toHaveBeenCalledWith('object:moving');
      expect(mockCanvas.off).toHaveBeenCalledWith('object:modified');
    });
  });
});
