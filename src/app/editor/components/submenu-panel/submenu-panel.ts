import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { FabricCanvasService } from '../../services/fabric-canvas.service';
import { DocumentStoreService } from '../../services/document-store.service';
import { PhotonFiltersService } from '../../services/photon-filters.service';
import { PhotonService } from '../../../core/services/photon.service';
import { FilterService, FilterDefinition } from '../../../core/services/filter.service';
import { TuningService } from '../../../core/services/tuning.service';
import { HistoryService } from '../../services/history.service';
import { AssetStoreService } from '../../services/asset-store.service';
import { UpdateImageAssetCommand } from '../../core/commands/object.commands';
import { ImageObject, TextObject } from '../../core/models/document.model';

/**
 * SubmenuPanel - Tool-specific controls panel
 */
@Component({
  selector: 'app-submenu-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerComponent],
  templateUrl: './submenu-panel.html',
  styleUrl: './submenu-panel.scss',
})
export class SubmenuPanel {
  @Input() activeTool: string = 'select';
  
  // Expose Object for template
  Object = Object;

  // Brush settings for draw tool
  brushColor = signal('#000000');
  brushWidth = signal(2);
  brushType = signal<'pencil' | 'circle' | 'spray' | 'pattern'>('pencil');
  brushShadowEnabled = signal(false);
  brushShadowBlur = signal(5);
  brushShadowColor = signal('rgba(0,0,0,0.3)');

  // Tuning settings
  brightness = signal(5); // 0-10, 5 is neutral
  contrast = signal(5);
  saturation = signal(5);
  hueRotation = signal(5);

  // Crop settings
  cropAspectRatio = signal('free');
  isCropping = signal(false);
  cropWidth = signal<number | null>(null);
  cropHeight = signal<number | null>(null);

  // Text settings (for adding new text)
  textInput = signal('Enter text...');
  textFontSize = signal(40);
  textColor = signal('#000000');
  textFontFamily = signal('Arial');

  // Shape settings
  selectedShape = signal<'circle' | 'rect' | 'triangle'>('circle');
  shapeFillColor = signal('#3b82f6');
  shapeStrokeColor = signal('#1e40af');

  // Icon settings
  iconSize = signal(64);
  showEmojiPicker = signal(false);

  // Corner settings
  cornerRadius = signal(0);

  // Watermark settings
  watermarkPosition: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'center';
  watermarkOpacity: number = 30;

  // Filter settings
  selectedFilter = signal<string | null>(null);
  isApplyingFilter = signal(false);
  availableFilters: Array<{ name: string; displayName: string }> = [];

  // Computed properties
  selectedObject = computed(() => {
    const id = this.documentStore.selectedObjectId();
    return id ? this.documentStore.getObject(id) : null;
  });

  isImageSelected = computed(() => this.selectedObject()?.type === 'image');
  isTextSelected = computed(() => this.selectedObject()?.type === 'text');

  selectedOpacity = computed(() => {
    const obj = this.selectedObject();
    return obj ? Math.round((obj.opacity || 1) * 100) : 100;
  });

  selectedBlendMode = computed(() => {
    const obj = this.selectedObject();
    if (obj?.type === 'image') {
      return (obj as ImageObject).globalCompositeOperation || 'source-over';
    }
    return 'source-over';
  });

  textProperties = computed(() => {
    const obj = this.selectedObject();
    if (obj?.type === 'text') {
      return obj as TextObject;
    }
    return {
      fontFamily: 'Arial',
      fontSize: 32,
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: false,
      fill: '#000000',
      textAlign: 'left',
    } as Partial<TextObject>;
  });

  currentImageDimensions = computed(() => {
    const obj = this.selectedObject();
    if (obj?.type === 'image') {
      const imageObj = obj as ImageObject;
      // Return the intrinsic (original) image dimensions from the document model
      return {
        width: imageObj.width,
        height: imageObj.height
      };
    }
    return { width: 0, height: 0 };
  });

  constructor(
    private fabricCanvas: FabricCanvasService,
    public documentStore: DocumentStoreService,
    private photonFilters: PhotonFiltersService,
    private photonService: PhotonService,
    public filterService: FilterService,
    private history: HistoryService,
    private assetStore: AssetStoreService
  ) {
    this.availableFilters = this.photonFilters.getAvailableFilters();
  }

  // Expose filter previews and filter list
  get filterPreviews() {
    return this.filterService.getPreviews();
  }

  get filterList() {
    return this.filterService.filterList;
  }

  get isLoadingPreviews() {
    return this.filterService.isLoadingPreviews();
  }

  hasNoPreviews(): boolean {
    const previews = this.filterPreviews();
    return Object.keys(previews).length === 0;
  }

  // Draw tool methods
  onBrushColor(color: string): void {
    this.brushColor.set(color);
    this.updateBrush();
  }

  onBrushWidth(width: number): void {
    this.brushWidth.set(width);
    this.updateBrush();
  }

  onBrushType(type: 'pencil' | 'circle' | 'spray' | 'pattern'): void {
    this.brushType.set(type);
    this.updateBrush();
  }

  onBrushShadowEnabled(enabled: boolean): void {
    this.brushShadowEnabled.set(enabled);
    this.updateBrush();
  }

  onBrushShadowBlur(blur: number): void {
    this.brushShadowBlur.set(blur);
    this.updateBrush();
  }

  private updateBrush(): void {
    this.fabricCanvas.setBrush({
      color: this.brushColor(),
      width: this.brushWidth(),
      type: this.brushType(),
      shadow: this.brushShadowEnabled() ? {
        blur: this.brushShadowBlur(),
        offsetX: 0,
        offsetY: 0,
        color: this.brushShadowColor()
      } : undefined
    });
  }

  // Transform tool methods
  async onFlipX(): Promise<void> {
    await this.fabricCanvas.flipX();
  }

  async onFlipY(): Promise<void> {
    await this.fabricCanvas.flipY();
  }

  async onRotate(): Promise<void> {
    await this.fabricCanvas.rotateSelected(90);
  }

  async onOpacityChange(opacity: number): Promise<void> {
    await this.fabricCanvas.setOpacity(opacity / 100);
  }

  async onBlendMode(mode: string): Promise<void> {
    await this.fabricCanvas.setBlendMode(mode);
  }

  // Arrange/Layers tool methods
  async onBringForward(): Promise<void> {
    await this.fabricCanvas.bringForward();
  }

  async onSendBackward(): Promise<void> {
    await this.fabricCanvas.sendBackward();
  }

  onAlign(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    this.fabricCanvas.alignObjects(alignment);
  }

  onGroup(): void {
    this.fabricCanvas.groupObjects();
  }

  onUngroup(): void {
    this.fabricCanvas.ungroupObjects();
  }

  canGroup(): boolean {
    const canvas = this.fabricCanvas.getCanvas();
    const activeObj = canvas?.getActiveObject();
    return activeObj?.type === 'activeSelection';
  }

  canUngroup(): boolean {
    const canvas = this.fabricCanvas.getCanvas();
    const activeObj = canvas?.getActiveObject();
    return activeObj?.type === 'group';
  }

  // Text tool methods (when text is selected or text tool is active)
  async onAddText(): Promise<void> {
    const text = this.textInput();
    if (!text || text.trim() === '') {
      alert('Please enter some text');
      return;
    }
    
    await this.fabricCanvas.addText(text, {
      fontSize: this.textFontSize(),
      fill: this.textColor(),
      fontFamily: this.textFontFamily()
    });
    
    // Reset to default after adding
    this.textInput.set('Enter text...');
  }

  onTextInputChange(value: string): void {
    this.textInput.set(value);
  }

  onTextFontSizeChange(value: number): void {
    this.textFontSize.set(value);
  }

  onTextColorChange(value: string): void {
    this.textColor.set(value);
  }

  onTextFontFamilyChange(value: string): void {
    this.textFontFamily.set(value);
  }

  async onTextProperty(property: string, value: any): Promise<void> {
    const props: any = {};
    props[property] = value;
    await this.fabricCanvas.updateTextProperties(props);
  }

  async onToggleTextProperty(property: string, activeValue: any, inactiveValue: any): Promise<void> {
    const currentValue = (this.textProperties() as any)[property];
    const newValue = currentValue === activeValue ? inactiveValue : activeValue;
    const props: any = {};
    props[property] = newValue;
    await this.fabricCanvas.updateTextProperties(props);
  }

  // Watermark tool methods
  async onAddTextWatermark(): Promise<void> {
    const text = prompt('Enter watermark text:', 'WATERMARK');
    if (!text) return;
    await this.fabricCanvas.addWatermark(
      'text', 
      text, 
      this.watermarkPosition, 
      this.watermarkOpacity / 100
    );
  }

  async onAddImageWatermark(): Promise<void> {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Convert File to Blob
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      
      // Add watermark
      await this.fabricCanvas.addWatermark(
        'image', 
        blob, 
        this.watermarkPosition, 
        this.watermarkOpacity / 100
      );
    };

    // Trigger file picker
    input.click();
  }

  // Filter tool methods
  onSelectFilter(filterName: string): void {
    this.selectedFilter.set(filterName);
  }

  async onApplyFilter(): Promise<void> {
    const filterName = this.selectedFilter();
    if (!filterName) return;

    const selectedId = this.documentStore.getSelectedObjectId();
    if (!selectedId) {
      alert('Please select an image first');
      return;
    }

    const obj = this.documentStore.getObject(selectedId);
    if (!obj || obj.type !== 'image') {
      alert('Please select an image object');
      return;
    }

    this.isApplyingFilter.set(true);

    try {
      const imageObj = obj as ImageObject;
      const blob = await this.assetStore.get(imageObj.assetId);
      const filteredBlob = await this.photonFilters.applyFilter(blob, filterName);
      const { assetId: newAssetId } = await this.assetStore.put(filteredBlob);
      
      await this.history.run(
        new UpdateImageAssetCommand(selectedId, imageObj.assetId, newAssetId)
      );

      this.selectedFilter.set(null);
    } catch (error) {
      console.error('Failed to apply filter:', error);
      alert('Failed to apply filter');
    } finally {
      this.isApplyingFilter.set(false);
    }
  }

  /**
   * Apply filter from preview grid (uses FilterService)
   */
  async onApplyFilterFromPreview(filter: FilterDefinition): Promise<void> {
    // If clicking same filter, do nothing
    if (filter.id === this.filterService.getActiveFilterId()()) {
      return;
    }

    const selectedId = this.documentStore.getSelectedObjectId();
    if (!selectedId) {
      alert('Please select an image first');
      return;
    }

    const obj = this.documentStore.getObject(selectedId);
    if (!obj || obj.type !== 'image') {
      alert('Please select an image object');
      return;
    }

    this.isApplyingFilter.set(true);

    try {
      const imageObj = obj as ImageObject;
      
      // Always use original asset if available, otherwise current asset
      const sourceAssetId = imageObj.originalAssetId || imageObj.assetId;
      const blob = await this.assetStore.get(sourceAssetId);
      
      // Apply filter using the appropriate service
      let filteredBlob: Blob;
      if (filter.method === 'none') {
        // Just use original
        filteredBlob = blob;
      } else {
        // Convert blob to ImageData
        const imageData = await this.blobToImageData(blob);
        
        // Apply filter using PhotonService
        await this.photonService.initialize();
        
        // Use the public filter method which handles all filter types
        const filteredImageData = await this.photonService.filter(imageData, filter.method);
        
        // Convert back to blob
        filteredBlob = await this.imageDataToBlob(filteredImageData);
      }
      
      const { assetId: newAssetId } = await this.assetStore.put(filteredBlob);
      
      await this.history.run(
        new UpdateImageAssetCommand(selectedId, imageObj.assetId, newAssetId)
      );

      // Update active filter
      this.filterService.setActiveFilterId(filter.id);
      
      // Wait for next tick to ensure renderer has updated, then re-select
      setTimeout(() => {
        this.fabricCanvas.selectObjectById(selectedId);
      }, 0);
    } catch (error) {
      console.error('Failed to apply filter:', error);
      alert('Failed to apply filter');
    } finally {
      this.isApplyingFilter.set(false);
    }
  }

  /**
   * Convert Blob to ImageData
   */
  private async blobToImageData(blob: Blob): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Convert ImageData to Blob
   */
  private async imageDataToBlob(imageData: ImageData): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  }

  // Tuning tool methods - Using Fabric.js native filters for real-time adjustment
  onBrightness(value: number): void {
    this.brightness.set(value);
    
    // Convert 0-10 scale to -1 to 1 (where 5 = 0 neutral)
    const brightnessValue = (value - 5) / 5;
    
    this.fabricCanvas.applyBrightnessFilter(brightnessValue);
  }

  async onContrast(value: number): Promise<void> {
    this.contrast.set(value);
    
    // Convert 0-10 scale to -1 to 1 (where 5 = 0 neutral)
    const contrastValue = (value - 5) / 5;
    
    this.fabricCanvas.applyContrastFilter(contrastValue);
  }

  async onSaturation(value: number): Promise<void> {
    this.saturation.set(value);
    
    // Convert 0-10 scale to -1 to 1 (where 5 = 0 neutral)
    const saturationValue = (value - 5) / 5;
    
    this.fabricCanvas.applySaturationFilter(saturationValue);
  }

  async onHueRotation(value: number): Promise<void> {
    this.hueRotation.set(value);
    
    // Convert 0-10 scale to -1 to 1 (where 5 = 0 neutral)
    const hueRotationValue = (value - 5) / 5;
    
    this.fabricCanvas.applyHueRotationFilter(hueRotationValue);
  }

  async onResetTuning(): Promise<void> {
    this.brightness.set(5);
    this.contrast.set(5);
    this.saturation.set(5);
    this.hueRotation.set(5);
    
    // Reset all filters to neutral
    this.fabricCanvas.resetAllFilters();
  }

  // Crop tool methods
  onCropWidth(width: number): void {
    this.cropWidth.set(width);
  }

  onCropHeight(height: number): void {
    this.cropHeight.set(height);
  }

  async onApplyCrop(): Promise<void> {
    const width = this.cropWidth();
    const height = this.cropHeight();
    
    if (!width || !height || width <= 0 || height <= 0) {
      console.warn('Invalid crop dimensions');
      return;
    }

    await this.fabricCanvas.resizeImage(width, height);
  }

  onCancelCrop(): void {
    this.cropWidth.set(null);
    this.cropHeight.set(null);
  }

  onResetCropDimensions(): void {
    const dims = this.currentImageDimensions();
    this.cropWidth.set(dims.width);
    this.cropHeight.set(dims.height);
  }

  // Shape tool methods
  onSelectShape(shape: 'circle' | 'rect' | 'triangle'): void {
    this.selectedShape.set(shape);
  }

  onShapeFillColor(color: string): void {
    this.shapeFillColor.set(color);
  }

  onShapeStrokeColor(color: string): void {
    this.shapeStrokeColor.set(color);
  }

  async onAddShape(): Promise<void> {
    await this.fabricCanvas.addShape(this.selectedShape(), {
      fill: this.shapeFillColor(),
      stroke: this.shapeStrokeColor(),
      strokeWidth: 2
    });
  }

  // Icon tool methods
  onIconSize(size: number): void {
    this.iconSize.set(size);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
  }

  onEmojiSelect(event: any): void {
    if (event.emoji && event.emoji.native) {
      this.fabricCanvas.addEmoji(event.emoji.native, {
        size: this.iconSize()
      });
      this.showEmojiPicker.set(false);
    }
  }

  // Corner tool methods
  async onCornerRadiusChange(radius: number): Promise<void> {
    this.cornerRadius.set(radius);
    
    // Apply in real-time for immediate visual feedback
    if (this.isImageSelected()) {
      await this.fabricCanvas.applyRoundedCorners(radius);
    }
  }

  async onResetCornerRadius(): Promise<void> {
    this.cornerRadius.set(0);
    await this.fabricCanvas.applyRoundedCorners(0);
  }

  // Shape mask methods
  async onApplyShapeMask(shapeType: 'circle' | 'square' | 'triangle' | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'heart' | 'diamond'): Promise<void> {
    if (!this.isImageSelected()) {
      alert('Please select an image first');
      return;
    }
    await this.fabricCanvas.applyShapeMask(shapeType);
  }

  async onRemoveMask(): Promise<void> {
    if (!this.isImageSelected()) {
      alert('Please select an image first');
      return;
    }
    await this.fabricCanvas.removeClipPath();
  }

  // Debug method for image loading errors
  logImageError(filterId: string, url: string): void {
    console.error(`[SubmenuPanel] Failed to load image for filter: ${filterId}`);
    console.error(`[SubmenuPanel] URL: ${url?.substring(0, 100)}...`);
  }
}
