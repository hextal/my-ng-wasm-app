import { Injectable } from '@angular/core';
import { LayoutTemplate } from './collage.service';

/**
 * LayoutTemplateService provides predefined layout templates for collages.
 * Follows Single Responsibility Principle - ONLY manages layout templates.
 * Follows Open/Closed Principle - Easy to extend with new templates.
 */
@Injectable({
  providedIn: 'root'
})
export class LayoutTemplateService {
  private templates: LayoutTemplate[] = [
    {
      id: 'single',
      name: 'Single Photo',
      description: 'One large photo',
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff',
      slots: [
        { x: 50, y: 50, width: 1100, height: 700, borderWidth: 2, borderColor: '#d1d5db' }
      ]
    },
    {
      id: 'grid-2x2',
      name: '2×2 Grid',
      description: 'Four equal photos in a grid',
      width: 1200,
      height: 1200,
      backgroundColor: '#f9fafb',
      slots: [
        { x: 20, y: 20, width: 580, height: 580, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 620, y: 20, width: 580, height: 580, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 20, y: 620, width: 580, height: 580, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 620, y: 620, width: 580, height: 580, borderWidth: 2, borderColor: '#d1d5db' }
      ]
    },
    {
      id: 'grid-3x3',
      name: '3×3 Grid',
      description: 'Nine equal photos in a grid',
      width: 1200,
      height: 1200,
      backgroundColor: '#f9fafb',
      slots: [
        { x: 20, y: 20, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 420, y: 20, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 820, y: 20, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 20, y: 420, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 420, y: 420, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 820, y: 420, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 20, y: 820, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 420, y: 820, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 820, y: 820, width: 380, height: 380, borderWidth: 2, borderColor: '#d1d5db' }
      ]
    },
    {
      id: 'horizontal-2',
      name: 'Horizontal Split',
      description: 'Two photos side by side',
      width: 1200,
      height: 600,
      backgroundColor: '#ffffff',
      slots: [
        { x: 20, y: 20, width: 580, height: 560, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 620, y: 20, width: 580, height: 560, borderWidth: 2, borderColor: '#d1d5db' }
      ]
    },
    {
      id: 'vertical-2',
      name: 'Vertical Split',
      description: 'Two photos stacked vertically',
      width: 600,
      height: 1200,
      backgroundColor: '#ffffff',
      slots: [
        { x: 20, y: 20, width: 560, height: 580, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 20, y: 620, width: 560, height: 580, borderWidth: 2, borderColor: '#d1d5db' }
      ]
    },
    {
      id: 'hero-left',
      name: 'Hero Left',
      description: 'Large photo on left, two smaller on right',
      width: 1200,
      height: 800,
      backgroundColor: '#f9fafb',
      slots: [
        { x: 20, y: 20, width: 760, height: 760, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 800, y: 20, width: 380, height: 370, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 800, y: 410, width: 380, height: 370, borderWidth: 2, borderColor: '#d1d5db' }
      ]
    },
    {
      id: 'hero-top',
      name: 'Hero Top',
      description: 'Large photo on top, three smaller below',
      width: 1200,
      height: 900,
      backgroundColor: '#f9fafb',
      slots: [
        { x: 20, y: 20, width: 1160, height: 500, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 20, y: 540, width: 380, height: 340, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 420, y: 540, width: 380, height: 340, borderWidth: 2, borderColor: '#d1d5db' },
        { x: 820, y: 540, width: 360, height: 340, borderWidth: 2, borderColor: '#d1d5db' }
      ]
    },
    {
      id: 'polaroid-3',
      name: 'Polaroid Style',
      description: 'Three polaroid-style photos',
      width: 1200,
      height: 800,
      backgroundColor: '#e5e7eb',
      slots: [
        { x: 80, y: 120, width: 300, height: 360, borderWidth: 2, borderColor: '#ffffff' },
        { x: 450, y: 80, width: 300, height: 360, borderWidth: 2, borderColor: '#ffffff' },
        { x: 820, y: 140, width: 300, height: 360, borderWidth: 2, borderColor: '#ffffff' }
      ]
    },
    {
      id: 'freeform',
      name: 'Freeform',
      description: 'No predefined slots - add images anywhere',
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff',
      slots: [] // Empty - user adds images freely
    }
  ];

  /**
   * Get all available templates
   */
  getTemplates(): LayoutTemplate[] {
    return [...this.templates];
  }

  /**
   * Get a template by ID
   */
  getTemplateById(id: string): LayoutTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  /**
   * Get templates by category/filter
   */
  getTemplatesBySlotCount(slotCount: number): LayoutTemplate[] {
    return this.templates.filter(t => t.slots.length === slotCount);
  }

  /**
   * Get default template
   */
  getDefaultTemplate(): LayoutTemplate {
    return this.templates[0]; // Single photo
  }
}
