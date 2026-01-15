import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextService } from './text.service';
import { HistoryService } from './history.service';
import { DocumentStoreService } from './document-store.service';
import { AddObjectCommand, UpdateTextCommand } from '../core/commands/object.commands';
import { EditorObjectFactory, TextObject } from '../core/models/document.model';

// Mock the command imports
vi.mock('../core/commands/object.commands', () => ({
  AddObjectCommand: vi.fn().mockImplementation((obj) => ({ obj })),
  UpdateTextCommand: vi.fn().mockImplementation((id, obj) => ({ id, obj })),
}));

// Mock the factory
vi.mock('../core/models/document.model', () => ({
  EditorObjectFactory: {
    createTextObject: vi.fn().mockImplementation((text, x, y, fontSize, fontFamily, fill) => ({
      id: 'text-' + Math.random(),
      type: 'text',
      text,
      x,
      y,
      fontSize,
      fontFamily,
      fill,
    })),
  },
}));

describe('TextService', () => {
  let service: TextService;
  let mockDocumentStore: any;
  let mockHistory: any;

  beforeEach(() => {
    // Mock DocumentStoreService
    mockDocumentStore = {
      getDimensions: vi.fn().mockReturnValue({ width: 800, height: 600 }),
      getSelectedObjectId: vi.fn().mockReturnValue('text-1'),
      getObject: vi.fn(),
    };

    // Mock HistoryService
    mockHistory = {
      run: vi.fn().mockResolvedValue(undefined),
    };

    service = new TextService(mockDocumentStore, mockHistory);
  });

  describe('addText', () => {
    it('should add text at canvas center with default options', async () => {
      await service.addText();

      expect(EditorObjectFactory.createTextObject).toHaveBeenCalledWith(
        'Double-click to edit',
        400, // center x
        300, // center y
        32,
        'Arial',
        '#000000'
      );

      expect(mockHistory.run).toHaveBeenCalled();
    });

    it('should add custom text with provided options', async () => {
      await service.addText('Hello World', {
        x: 100,
        y: 200,
        fontSize: 48,
        fontFamily: 'Helvetica',
        fill: '#ff0000',
      });

      expect(EditorObjectFactory.createTextObject).toHaveBeenCalledWith(
        'Hello World',
        100,
        200,
        48,
        'Helvetica',
        '#ff0000'
      );

      expect(mockHistory.run).toHaveBeenCalled();
    });

    it('should use canvas center for missing position options', async () => {
      await service.addText('Test', { fontSize: 64 });

      expect(EditorObjectFactory.createTextObject).toHaveBeenCalledWith(
        'Test',
        400, // center x (default)
        300, // center y (default)
        64,
        'Arial',
        '#000000'
      );
    });

    it('should apply additional options to text object', async () => {
      const createTextSpy = vi.spyOn(EditorObjectFactory, 'createTextObject');
      
      await service.addText('Test', {
        fontWeight: 'bold' as any,
        fontStyle: 'italic' as any,
      });

      expect(createTextSpy).toHaveBeenCalled();
      expect(mockHistory.run).toHaveBeenCalled();
    });
  });

  describe('updateTextProperties', () => {
    it('should update text properties for a specific object', async () => {
      const mockTextObject: TextObject = {
        id: 'text-1',
        type: 'text',
        text: 'Original',
        x: 100,
        y: 100,
        fontSize: 32,
        fontFamily: 'Arial',
        fill: '#000000',
      };

      mockDocumentStore.getObject.mockReturnValue(mockTextObject);

      await service.updateTextProperties('text-1', { text: 'Updated' });

      expect(mockDocumentStore.getObject).toHaveBeenCalledWith('text-1');
      expect(mockHistory.run).toHaveBeenCalled();
    });

    it('should not update if object is not found', async () => {
      mockDocumentStore.getObject.mockReturnValue(null);

      await service.updateTextProperties('nonexistent', { text: 'Updated' });

      expect(mockHistory.run).not.toHaveBeenCalled();
    });

    it('should not update if object is not a text object', async () => {
      mockDocumentStore.getObject.mockReturnValue({
        id: 'image-1',
        type: 'image',
      });

      await service.updateTextProperties('image-1', { text: 'Updated' });

      expect(mockHistory.run).not.toHaveBeenCalled();
    });

    it('should merge properties correctly', async () => {
      const mockTextObject: TextObject = {
        id: 'text-1',
        type: 'text',
        text: 'Original',
        x: 100,
        y: 100,
        fontSize: 32,
        fontFamily: 'Arial',
        fill: '#000000',
      };

      mockDocumentStore.getObject.mockReturnValue(mockTextObject);

      await service.updateTextProperties('text-1', {
        fontSize: 48,
        fill: '#ff0000',
      });

      expect(mockHistory.run).toHaveBeenCalled();
      // The command should receive the merged object
      const commandArg = mockHistory.run.mock.calls[0][0];
      expect(commandArg.obj.fontSize).toBe(48);
      expect(commandArg.obj.fill).toBe('#ff0000');
      expect(commandArg.obj.text).toBe('Original'); // Original property preserved
    });
  });

  describe('updateSelectedTextProperties', () => {
    it('should update properties of the selected text object', async () => {
      const mockTextObject: TextObject = {
        id: 'text-1',
        type: 'text',
        text: 'Selected',
        x: 100,
        y: 100,
        fontSize: 32,
        fontFamily: 'Arial',
        fill: '#000000',
      };

      mockDocumentStore.getSelectedObjectId.mockReturnValue('text-1');
      mockDocumentStore.getObject.mockReturnValue(mockTextObject);

      await service.updateSelectedTextProperties({ fontSize: 64 });

      expect(mockDocumentStore.getSelectedObjectId).toHaveBeenCalled();
      expect(mockDocumentStore.getObject).toHaveBeenCalledWith('text-1');
      expect(mockHistory.run).toHaveBeenCalled();
    });

    it('should not update if no object is selected', async () => {
      mockDocumentStore.getSelectedObjectId.mockReturnValue(null);

      await service.updateSelectedTextProperties({ fontSize: 64 });

      expect(mockHistory.run).not.toHaveBeenCalled();
    });
  });

  describe('addEmoji', () => {
    it('should add emoji at canvas center with default size', async () => {
      await service.addEmoji('😀');

      expect(EditorObjectFactory.createTextObject).toHaveBeenCalledWith(
        '😀',
        400, // center x
        300, // center y
        64,  // default emoji size
        'Arial',
        '#000000'
      );

      expect(mockHistory.run).toHaveBeenCalled();
    });

    it('should add emoji at specified position with custom size', async () => {
      await service.addEmoji('🎉', { x: 150, y: 250, size: 80 });

      expect(EditorObjectFactory.createTextObject).toHaveBeenCalledWith(
        '🎉',
        150,
        250,
        80,
        'Arial',
        '#000000'
      );

      expect(mockHistory.run).toHaveBeenCalled();
    });

    it('should handle unicode emojis correctly', async () => {
      const emoji = '👨‍👩‍👧‍👦'; // Family emoji with ZWJ

      await service.addEmoji(emoji);

      expect(EditorObjectFactory.createTextObject).toHaveBeenCalledWith(
        emoji,
        400,
        300,
        64,
        'Arial',
        '#000000'
      );
    });
  });

  describe('enableTextMode', () => {
    it('should enable text mode on canvas', () => {
      const mockCanvas = {
        isDrawingMode: true,
        selection: true,
        defaultCursor: 'default',
      };

      service.enableTextMode(mockCanvas);

      expect(mockCanvas.isDrawingMode).toBe(false);
      expect(mockCanvas.selection).toBe(false);
      expect(mockCanvas.defaultCursor).toBe('text');
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.enableTextMode(null)).not.toThrow();
    });
  });

  describe('disableTextMode', () => {
    it('should disable text mode and restore selection mode', () => {
      const mockCanvas = {
        isDrawingMode: false,
        selection: false,
        defaultCursor: 'text',
      };

      service.disableTextMode(mockCanvas);

      expect(mockCanvas.isDrawingMode).toBe(false);
      expect(mockCanvas.selection).toBe(true);
      expect(mockCanvas.defaultCursor).toBe('default');
    });

    it('should handle null canvas gracefully', () => {
      expect(() => service.disableTextMode(null)).not.toThrow();
    });
  });

  describe('canvas center calculation', () => {
    it('should correctly calculate center for different canvas sizes', async () => {
      mockDocumentStore.getDimensions.mockReturnValue({ width: 1024, height: 768 });

      await service.addText();

      expect(EditorObjectFactory.createTextObject).toHaveBeenCalledWith(
        'Double-click to edit',
        512, // 1024 / 2
        384, // 768 / 2
        32,
        'Arial',
        '#000000'
      );
    });

    it('should handle small canvas dimensions', async () => {
      mockDocumentStore.getDimensions.mockReturnValue({ width: 200, height: 100 });

      await service.addText();

      expect(EditorObjectFactory.createTextObject).toHaveBeenCalledWith(
        'Double-click to edit',
        100, // 200 / 2
        50,  // 100 / 2
        32,
        'Arial',
        '#000000'
      );
    });
  });
});
