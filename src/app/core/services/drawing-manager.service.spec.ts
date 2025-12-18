import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingManagerService } from './drawing-manager.service';

describe('DrawingManagerService', () => {
  let service: DrawingManagerService;

  beforeEach(() => {
    service = new DrawingManagerService();
  });

  describe('Icon Management', () => {
    it('should add an icon', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      
      expect(icon).toBeDefined();
      expect(icon.emoji).toBe('😀');
      expect(icon.x).toBe(100);
      expect(icon.y).toBe(200);
      expect(icon.size).toBe(64);
      expect(icon.id).toContain('icon-');
    });

    it('should get all icons', () => {
      service.addIcon('😀', 100, 200, 64);
      service.addIcon('🎉', 150, 250, 48);
      
      const icons = service.getIcons();
      expect(icons.length).toBe(2);
    });

    it('should select an icon', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      service.selectIcon(icon.id);
      
      expect(service.getSelectedIconId()).toBe(icon.id);
      expect(service.getSelectedIcon()).toEqual(icon);
    });

    it('should deselect other objects when selecting icon', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      const text = service.addText('Hello', 100, 200, 32, '#000', 'normal');
      
      service.selectText(text.id);
      service.selectIcon(icon.id);
      
      expect(service.getSelectedTextId()).toBeNull();
    });

    it('should update icon size', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      service.updateIconSize(icon.id, 128);
      
      const updated = service.getSelectedIcon();
      expect(updated).toBeNull(); // Not selected yet
      
      service.selectIcon(icon.id);
      const selected = service.getSelectedIcon();
      expect(selected!.size).toBe(128);
    });

    it('should delete an icon', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      const deleted = service.deleteIcon(icon.id);
      
      expect(deleted).toBe(true);
      expect(service.getIcons().length).toBe(0);
    });

    it('should clear selected icon on delete', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      service.selectIcon(icon.id);
      service.deleteIcon(icon.id);
      
      expect(service.getSelectedIconId()).toBeNull();
    });

    it('should clear all icons', () => {
      service.addIcon('😀', 100, 200, 64);
      service.addIcon('🎉', 150, 250, 48);
      
      service.clearIcons();
      
      expect(service.getIcons().length).toBe(0);
    });
  });

  describe('Text Management', () => {
    it('should add text', () => {
      const text = service.addText('Hello World', 100, 200, 32, '#FF0000', 'bold');
      
      expect(text).toBeDefined();
      expect(text.text).toBe('Hello World');
      expect(text.x).toBe(100);
      expect(text.y).toBe(200);
      expect(text.size).toBe(32);
      expect(text.color).toBe('#FF0000');
      expect(text.fontStyle).toBe('bold');
      expect(text.id).toContain('text-');
    });

    it('should get all texts', () => {
      service.addText('Hello', 100, 200, 32, '#000', 'normal');
      service.addText('World', 150, 250, 24, '#FFF', 'italic');
      
      const texts = service.getTexts();
      expect(texts.length).toBe(2);
    });

    it('should select text', () => {
      const text = service.addText('Hello', 100, 200, 32, '#000', 'normal');
      service.selectText(text.id);
      
      expect(service.getSelectedTextId()).toBe(text.id);
      expect(service.getSelectedText()).toEqual(text);
    });

    it('should update text properties', () => {
      const text = service.addText('Hello', 100, 200, 32, '#000', 'normal');
      
      service.updateTextSize(text.id, 48);
      service.updateTextColor(text.id, '#FF0000');
      service.updateTextStyle(text.id, 'bold');
      
      service.selectText(text.id);
      const updated = service.getSelectedText();
      
      expect(updated!.size).toBe(48);
      expect(updated!.color).toBe('#FF0000');
      expect(updated!.fontStyle).toBe('bold');
    });

    it('should delete text', () => {
      const text = service.addText('Hello', 100, 200, 32, '#000', 'normal');
      const deleted = service.deleteText(text.id);
      
      expect(deleted).toBe(true);
      expect(service.getTexts().length).toBe(0);
    });

    it('should clear all texts', () => {
      service.addText('Hello', 100, 200, 32, '#000', 'normal');
      service.addText('World', 150, 250, 24, '#FFF', 'italic');
      
      service.clearTexts();
      
      expect(service.getTexts().length).toBe(0);
    });
  });

  describe('Watermark Management', () => {
    let mockImage: HTMLImageElement;

    beforeEach(() => {
      mockImage = new Image();
      mockImage.width = 200;
      mockImage.height = 100;
    });

    it('should add watermark', () => {
      const watermark = service.addWatermark(mockImage, 100, 200, 150, 75, 0.5);
      
      expect(watermark).toBeDefined();
      expect(watermark.image).toBe(mockImage);
      expect(watermark.x).toBe(100);
      expect(watermark.y).toBe(200);
      expect(watermark.width).toBe(150);
      expect(watermark.height).toBe(75);
      expect(watermark.opacity).toBe(0.5);
      expect(watermark.id).toContain('watermark-');
    });

    it('should get all watermarks', () => {
      service.addWatermark(mockImage, 100, 200, 150, 75, 0.5);
      service.addWatermark(mockImage, 200, 300, 100, 50, 0.8);
      
      const watermarks = service.getWatermarks();
      expect(watermarks.length).toBe(2);
    });

    it('should select watermark', () => {
      const watermark = service.addWatermark(mockImage, 100, 200, 150, 75, 0.5);
      service.selectWatermark(watermark.id);
      
      expect(service.getSelectedWatermarkId()).toBe(watermark.id);
      expect(service.getSelectedWatermark()).toEqual(watermark);
    });

    it('should update watermark properties', () => {
      const watermark = service.addWatermark(mockImage, 100, 200, 150, 75, 0.5);
      
      service.updateWatermarkSize(watermark.id, 200, 100);
      service.updateWatermarkOpacity(watermark.id, 0.8);
      
      service.selectWatermark(watermark.id);
      const updated = service.getSelectedWatermark();
      
      expect(updated!.width).toBe(200);
      expect(updated!.height).toBe(100);
      expect(updated!.opacity).toBe(0.8);
    });

    it('should delete watermark', () => {
      const watermark = service.addWatermark(mockImage, 100, 200, 150, 75, 0.5);
      const deleted = service.deleteWatermark(watermark.id);
      
      expect(deleted).toBe(true);
      expect(service.getWatermarks().length).toBe(0);
    });

    it('should clear all watermarks', () => {
      service.addWatermark(mockImage, 100, 200, 150, 75, 0.5);
      service.addWatermark(mockImage, 200, 300, 100, 50, 0.8);
      
      service.clearWatermarks();
      
      expect(service.getWatermarks().length).toBe(0);
    });
  });

  describe('Dragging State Management', () => {
    it('should start dragging an icon', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      service.startDragging(icon.id, 'icon');
      
      const icons = service.getIcons();
      expect(icons[0].isDragging).toBe(true);
    });

    it('should stop dragging icons', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      service.startDragging(icon.id, 'icon');
      service.stopDragging('icon');
      
      const icons = service.getIcons();
      expect(icons[0].isDragging).toBe(false);
    });

    it('should stop dragging all objects when type not specified', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      const text = service.addText('Hello', 100, 200, 32, '#000', 'normal');
      
      service.startDragging(icon.id, 'icon');
      service.startDragging(text.id, 'text');
      
      service.stopDragging();
      
      const icons = service.getIcons();
      const texts = service.getTexts();
      
      expect(icons[0].isDragging).toBe(false);
      expect(texts[0].isDragging).toBe(false);
    });

    it('should update object position', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      service.updatePosition(icon.id, 'icon', 150, 250);
      
      const icons = service.getIcons();
      expect(icons[0].x).toBe(150);
      expect(icons[0].y).toBe(250);
    });
  });

  describe('Utility Methods', () => {
    it('should clear all objects', () => {
      service.addIcon('😀', 100, 200, 64);
      service.addText('Hello', 100, 200, 32, '#000', 'normal');
      service.addWatermark(new Image(), 100, 200, 150, 75, 0.5);
      
      service.clearAll();
      
      expect(service.getIcons().length).toBe(0);
      expect(service.getTexts().length).toBe(0);
      expect(service.getWatermarks().length).toBe(0);
    });

    it('should detect if has objects', () => {
      expect(service.hasObjects()).toBe(false);
      
      service.addIcon('😀', 100, 200, 64);
      expect(service.hasObjects()).toBe(true);
      
      service.clearAll();
      service.addText('Hello', 100, 200, 32, '#000', 'normal');
      expect(service.hasObjects()).toBe(true);
    });

    it('should delete selected object', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      service.selectIcon(icon.id);
      
      const deleted = service.deleteSelected();
      
      expect(deleted).toBe(true);
      expect(service.getIcons().length).toBe(0);
    });

    it('should return false when deleting with no selection', () => {
      service.addIcon('😀', 100, 200, 64);
      
      const deleted = service.deleteSelected();
      
      expect(deleted).toBe(false);
      expect(service.getIcons().length).toBe(1);
    });

    it('should clear selection', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      const text = service.addText('Hello', 100, 200, 32, '#000', 'normal');
      
      service.selectIcon(icon.id);
      service.clearSelection();
      
      expect(service.getSelectedIconId()).toBeNull();
      expect(service.getSelectedTextId()).toBeNull();
      expect(service.getSelectedWatermarkId()).toBeNull();
    });
  });

  describe('Selection Management', () => {
    it('should maintain only one selection type at a time', () => {
      const icon = service.addIcon('😀', 100, 200, 64);
      const text = service.addText('Hello', 100, 200, 32, '#000', 'normal');
      const watermark = service.addWatermark(new Image(), 100, 200, 150, 75, 0.5);
      
      // Select icon
      service.selectIcon(icon.id);
      expect(service.getSelectedIconId()).toBe(icon.id);
      expect(service.getSelectedTextId()).toBeNull();
      expect(service.getSelectedWatermarkId()).toBeNull();
      
      // Select text
      service.selectText(text.id);
      expect(service.getSelectedIconId()).toBeNull();
      expect(service.getSelectedTextId()).toBe(text.id);
      expect(service.getSelectedWatermarkId()).toBeNull();
      
      // Select watermark
      service.selectWatermark(watermark.id);
      expect(service.getSelectedIconId()).toBeNull();
      expect(service.getSelectedTextId()).toBeNull();
      expect(service.getSelectedWatermarkId()).toBe(watermark.id);
    });
  });
});
