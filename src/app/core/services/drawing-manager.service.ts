import { Injectable } from '@angular/core';

/**
 * Types for drawing objects
 */
export interface DraggableIcon {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  isDragging?: boolean;
}

export interface DraggableText {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  fontStyle: string;
  isDragging?: boolean;
}

export interface DraggableWatermark {
  id: string;
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  isDragging?: boolean;
}

/**
 * DrawingManagerService manages draggable objects (icons, text, watermarks).
 * Follows Single Responsibility Principle - ONLY handles draggable object management.
 */
@Injectable({
  providedIn: 'root'
})
export class DrawingManagerService {
  private icons: DraggableIcon[] = [];
  private texts: DraggableText[] = [];
  private watermarks: DraggableWatermark[] = [];
  
  private selectedIconId: string | null = null;
  private selectedTextId: string | null = null;
  private selectedWatermarkId: string | null = null;

  // --- Icon Management ---
  
  addIcon(emoji: string, x: number, y: number, size: number): DraggableIcon {
    const newIcon: DraggableIcon = {
      id: `icon-${Date.now()}-${Math.random()}`,
      emoji,
      x,
      y,
      size
    };
    this.icons.push(newIcon);
    return newIcon;
  }

  getIcons(): DraggableIcon[] {
    return [...this.icons];
  }

  selectIcon(id: string): void {
    this.selectedIconId = id;
    this.selectedTextId = null;
    this.selectedWatermarkId = null;
  }

  getSelectedIcon(): DraggableIcon | null {
    return this.icons.find(i => i.id === this.selectedIconId) || null;
  }

  getSelectedIconId(): string | null {
    return this.selectedIconId;
  }

  updateIconSize(id: string, size: number): void {
    const icon = this.icons.find(i => i.id === id);
    if (icon) {
      icon.size = size;
    }
  }

  deleteIcon(id: string): boolean {
    const index = this.icons.findIndex(i => i.id === id);
    if (index !== -1) {
      this.icons.splice(index, 1);
      if (this.selectedIconId === id) {
        this.selectedIconId = null;
      }
      return true;
    }
    return false;
  }

  clearIcons(): void {
    this.icons = [];
    this.selectedIconId = null;
  }

  // --- Text Management ---

  addText(text: string, x: number, y: number, size: number, color: string, fontStyle: string): DraggableText {
    const newText: DraggableText = {
      id: `text-${Date.now()}-${Math.random()}`,
      text,
      x,
      y,
      size,
      color,
      fontStyle
    };
    this.texts.push(newText);
    return newText;
  }

  getTexts(): DraggableText[] {
    return [...this.texts];
  }

  selectText(id: string): void {
    this.selectedTextId = id;
    this.selectedIconId = null;
    this.selectedWatermarkId = null;
  }

  getSelectedText(): DraggableText | null {
    return this.texts.find(t => t.id === this.selectedTextId) || null;
  }

  getSelectedTextId(): string | null {
    return this.selectedTextId;
  }

  updateTextSize(id: string, size: number): void {
    const text = this.texts.find(t => t.id === id);
    if (text) {
      text.size = size;
    }
  }

  updateTextColor(id: string, color: string): void {
    const text = this.texts.find(t => t.id === id);
    if (text) {
      text.color = color;
    }
  }

  updateTextStyle(id: string, fontStyle: string): void {
    const text = this.texts.find(t => t.id === id);
    if (text) {
      text.fontStyle = fontStyle;
    }
  }

  deleteText(id: string): boolean {
    const index = this.texts.findIndex(t => t.id === id);
    if (index !== -1) {
      this.texts.splice(index, 1);
      if (this.selectedTextId === id) {
        this.selectedTextId = null;
      }
      return true;
    }
    return false;
  }

  clearTexts(): void {
    this.texts = [];
    this.selectedTextId = null;
  }

  // --- Watermark Management ---

  addWatermark(image: HTMLImageElement, x: number, y: number, width: number, height: number, opacity: number): DraggableWatermark {
    const newWatermark: DraggableWatermark = {
      id: `watermark-${Date.now()}-${Math.random()}`,
      image,
      x,
      y,
      width,
      height,
      opacity
    };
    this.watermarks.push(newWatermark);
    return newWatermark;
  }

  getWatermarks(): DraggableWatermark[] {
    return [...this.watermarks];
  }

  selectWatermark(id: string): void {
    this.selectedWatermarkId = id;
    this.selectedIconId = null;
    this.selectedTextId = null;
  }

  getSelectedWatermark(): DraggableWatermark | null {
    return this.watermarks.find(w => w.id === this.selectedWatermarkId) || null;
  }

  getSelectedWatermarkId(): string | null {
    return this.selectedWatermarkId;
  }

  updateWatermarkSize(id: string, width: number, height: number): void {
    const watermark = this.watermarks.find(w => w.id === id);
    if (watermark) {
      watermark.width = width;
      watermark.height = height;
    }
  }

  updateWatermarkOpacity(id: string, opacity: number): void {
    const watermark = this.watermarks.find(w => w.id === id);
    if (watermark) {
      watermark.opacity = opacity;
    }
  }

  deleteWatermark(id: string): boolean {
    const index = this.watermarks.findIndex(w => w.id === id);
    if (index !== -1) {
      this.watermarks.splice(index, 1);
      if (this.selectedWatermarkId === id) {
        this.selectedWatermarkId = null;
      }
      return true;
    }
    return false;
  }

  clearWatermarks(): void {
    this.watermarks = [];
    this.selectedWatermarkId = null;
  }

  // --- Dragging State Management ---

  startDragging(objectId: string, type: 'icon' | 'text' | 'watermark'): void {
    if (type === 'icon') {
      const icon = this.icons.find(i => i.id === objectId);
      if (icon) icon.isDragging = true;
    } else if (type === 'text') {
      const text = this.texts.find(t => t.id === objectId);
      if (text) text.isDragging = true;
    } else if (type === 'watermark') {
      const watermark = this.watermarks.find(w => w.id === objectId);
      if (watermark) watermark.isDragging = true;
    }
  }

  stopDragging(type?: 'icon' | 'text' | 'watermark'): void {
    if (!type || type === 'icon') {
      this.icons.forEach(icon => icon.isDragging = false);
    }
    if (!type || type === 'text') {
      this.texts.forEach(text => text.isDragging = false);
    }
    if (!type || type === 'watermark') {
      this.watermarks.forEach(wm => wm.isDragging = false);
    }
  }

  updatePosition(objectId: string, type: 'icon' | 'text' | 'watermark', x: number, y: number): void {
    if (type === 'icon') {
      const icon = this.icons.find(i => i.id === objectId);
      if (icon) {
        icon.x = x;
        icon.y = y;
      }
    } else if (type === 'text') {
      const text = this.texts.find(t => t.id === objectId);
      if (text) {
        text.x = x;
        text.y = y;
      }
    } else if (type === 'watermark') {
      const watermark = this.watermarks.find(w => w.id === objectId);
      if (watermark) {
        watermark.x = x;
        watermark.y = y;
      }
    }
  }

  // --- Rendering ---

  renderToCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw all watermarks first (so they appear behind other objects)
    this.watermarks.forEach(watermark => {
      ctx.save();
      ctx.globalAlpha = watermark.opacity;
      
      ctx.drawImage(
        watermark.image,
        watermark.x - watermark.width / 2,
        watermark.y - watermark.height / 2,
        watermark.width,
        watermark.height
      );
      
      ctx.restore();
      
      // Draw selection indicator if selected
      if (watermark.id === this.selectedWatermarkId) {
        ctx.save();
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const padding = 10;
        ctx.strokeRect(
          watermark.x - watermark.width / 2 - padding,
          watermark.y - watermark.height / 2 - padding,
          watermark.width + padding * 2,
          watermark.height + padding * 2
        );
        ctx.restore();
      }
    });
    
    // Draw all texts
    this.texts.forEach(text => {
      ctx.font = `${text.fontStyle} ${text.size}px Arial`;
      ctx.fillStyle = text.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add selection indicator if selected
      if (text.id === this.selectedTextId) {
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        const metrics = ctx.measureText(text.text);
        const width = metrics.width;
        const padding = 10;
        ctx.strokeRect(
          text.x - width / 2 - padding,
          text.y - text.size / 2 - padding,
          width + padding * 2,
          text.size + padding * 2
        );
      }
      
      ctx.fillText(text.text, text.x, text.y);
    });
    
    // Draw all icons
    this.icons.forEach(icon => {
      ctx.font = `${icon.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add selection indicator if selected
      if (icon.id === this.selectedIconId) {
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        const padding = 10;
        ctx.strokeRect(
          icon.x - icon.size / 2 - padding,
          icon.y - icon.size / 2 - padding,
          icon.size + padding * 2,
          icon.size + padding * 2
        );
      }
      
      ctx.fillText(icon.emoji, icon.x, icon.y);
    });
  }

  // --- Utility ---

  clearAll(): void {
    this.clearIcons();
    this.clearTexts();
    this.clearWatermarks();
  }

  hasObjects(): boolean {
    return this.icons.length > 0 || this.texts.length > 0 || this.watermarks.length > 0;
  }

  deleteSelected(): boolean {
    if (this.selectedIconId) {
      return this.deleteIcon(this.selectedIconId);
    }
    if (this.selectedTextId) {
      return this.deleteText(this.selectedTextId);
    }
    if (this.selectedWatermarkId) {
      return this.deleteWatermark(this.selectedWatermarkId);
    }
    return false;
  }

  clearSelection(): void {
    this.selectedIconId = null;
    this.selectedTextId = null;
    this.selectedWatermarkId = null;
  }

  // --- Click Detection ---

  findClickedWatermark(x: number, y: number): DraggableWatermark | null {
    return this.watermarks.find(watermark => {
      const halfWidth = watermark.width / 2;
      const halfHeight = watermark.height / 2;
      return x >= watermark.x - halfWidth && x <= watermark.x + halfWidth &&
             y >= watermark.y - halfHeight && y <= watermark.y + halfHeight;
    }) || null;
  }

  findClickedText(x: number, y: number, canvas: HTMLCanvasElement): DraggableText | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    return this.texts.find(text => {
      ctx.font = `${text.fontStyle} ${text.size}px Arial`;
      const metrics = ctx.measureText(text.text);
      const halfWidth = metrics.width / 2;
      const halfHeight = text.size / 2;
      return x >= text.x - halfWidth && x <= text.x + halfWidth &&
             y >= text.y - halfHeight && y <= text.y + halfHeight;
    }) || null;
  }

  findClickedIcon(x: number, y: number): DraggableIcon | null {
    return this.icons.find(icon => {
      const halfSize = icon.size / 2;
      return x >= icon.x - halfSize && x <= icon.x + halfSize &&
             y >= icon.y - halfSize && y <= icon.y + halfSize;
    }) || null;
  }
}
