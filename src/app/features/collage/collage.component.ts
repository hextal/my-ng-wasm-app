import { Component, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CollageService, LayoutTemplate } from '../../core/services/collage.service';
import { LayoutTemplateService } from '../../core/services/layout-template.service';

@Component({
  selector: 'app-collage',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './collage.component.html',
  styleUrls: ['./collage.component.scss']
})
export class CollageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('collageContainer') collageContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // State signals
  templates = signal<LayoutTemplate[]>([]);
  selectedTemplate = signal<LayoutTemplate | null>(null);
  collageInitialized = signal<boolean>(false);
  processing = signal<boolean>(false);
  error = signal<string | null>(null);
  imageCount = signal<number>(0);

  // Current slot for image upload (for template-based layouts)
  currentSlotIndex: number = 0;

  constructor(
    private collageService: CollageService,
    private layoutTemplateService: LayoutTemplateService
  ) {
    // Load templates
    this.templates.set(this.layoutTemplateService.getTemplates());
    // Set default template
    this.selectedTemplate.set(this.layoutTemplateService.getDefaultTemplate());
  }

  ngAfterViewInit(): void {
    // Initialize with default template after view is ready
    if (this.selectedTemplate() && this.collageContainerRef) {
      this.initializeCollage();
    }
  }

  ngOnDestroy(): void {
    // Clean up Konva stage
    this.collageService.destroy();
  }

  /**
   * Initialize the collage with the selected template
   */
  initializeCollage(): void {
    const template = this.selectedTemplate();
    if (!template || !this.collageContainerRef) return;

    try {
      this.error.set(null);
      this.collageService.initializeCollage(
        this.collageContainerRef.nativeElement,
        template
      );
      this.collageInitialized.set(true);
      this.currentSlotIndex = 0;
      this.imageCount.set(0);
    } catch (e) {
      this.error.set('Failed to initialize collage');
      console.error(e);
    }
  }

  /**
   * Change template
   */
  selectTemplate(templateId: string): void {
    const template = this.templates().find(t => t.id === templateId);
    if (!template) return;

    this.selectedTemplate.set(template);
    this.initializeCollage();
  }

  /**
   * Trigger file input
   */
  triggerFileInput(slotIndex?: number): void {
    if (slotIndex !== undefined) {
      this.currentSlotIndex = slotIndex;
    }
    this.fileInputRef?.nativeElement.click();
  }

  /**
   * Handle file selection
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const template = this.selectedTemplate();
    if (!template) return;

    this.error.set(null);
    this.processing.set(true);

    try {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        
        // Check if template has slots
        if (template.slots.length > 0) {
          // Template-based: add to specific slot
          if (this.currentSlotIndex < template.slots.length) {
            await this.collageService.addImage(file, this.currentSlotIndex);
            this.currentSlotIndex++;
          } else {
            this.error.set('All slots are filled');
            break;
          }
        } else {
          // Freeform: add at center
          const centerX = template.width / 2 - 150;
          const centerY = template.height / 2 - 150;
          await this.collageService.addImageAtPosition(file, centerX, centerY, 300, 300);
        }
        
        this.imageCount.set(this.collageService.getImageCount());
      }
    } catch (e) {
      this.error.set('Failed to add image to collage');
      console.error(e);
    } finally {
      this.processing.set(false);
      // Reset file input
      input.value = '';
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  /**
   * Handle drop event
   */
  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) return;

    const template = this.selectedTemplate();
    if (!template) return;

    this.error.set(null);
    this.processing.set(true);

    try {
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const file = event.dataTransfer.files[i];
        
        // Only process image files
        if (!file.type.startsWith('image/')) continue;

        // Check if template has slots
        if (template.slots.length > 0) {
          // Template-based: add to next available slot
          if (this.currentSlotIndex < template.slots.length) {
            await this.collageService.addImage(file, this.currentSlotIndex);
            this.currentSlotIndex++;
          } else {
            this.error.set('All slots are filled');
            break;
          }
        } else {
          // Freeform: add at drop position
          const rect = this.collageContainerRef.nativeElement.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          await this.collageService.addImageAtPosition(file, x - 150, y - 150, 300, 300);
        }
        
        this.imageCount.set(this.collageService.getImageCount());
      }
    } catch (e) {
      this.error.set('Failed to add image to collage');
      console.error(e);
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Clear all images
   */
  clearImages(): void {
    this.collageService.clearImages();
    this.imageCount.set(0);
    this.currentSlotIndex = 0;
  }

  /**
   * Deselect all images
   */
  deselectAll(): void {
    this.collageService.deselectAll();
  }

  /**
   * Export collage
   */
  async exportCollage(): Promise<void> {
    if (!this.collageInitialized()) return;

    this.processing.set(true);
    this.error.set(null);

    try {
      const blob = await this.collageService.exportCollage('png');
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `collage-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      this.error.set('Failed to export collage');
      console.error(e);
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Get slots for current template (for UI)
   */
  getSlots() {
    return this.selectedTemplate()?.slots || [];
  }

  /**
   * Check if template has slots
   */
  hasSlots(): boolean {
    return (this.selectedTemplate()?.slots.length || 0) > 0;
  }
}
