import { Component, signal, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { PhotonService } from '../../core/services/photon.service';
import { MagickService } from '../../core/services/magick.service';
import { CanvasService } from '../../core/services/canvas.service';
import { ImageTransformationService } from '../../core/services/image-transformation.service';
import { HistoryService } from '../../core/services/history.service';
import { DrawingManagerService } from '../../core/services/drawing-manager.service';
import { FilterService } from '../../core/services/filter.service';
import { DownloadService } from '../../core/services/download.service';
import { TuningService } from '../../core/services/tuning.service';
import { THUMBNAIL_PREVIEW } from '../../core/constants/image-editor.constants';

// Types for drawing objects
interface DrawingObject {
  type: 'shape' | 'text' | 'draw' | 'line';
  x: number;
  y: number;
  data: any;
}

interface DraggableIcon {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  isDragging?: boolean;
}

interface DraggableText {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  fontStyle: string;
  isDragging?: boolean;
}

type ShapeClipType = 'circle' | 'rounded-square' | 'heart' | 'star' | 'hexagon' | 'diamond';

interface DraggableWatermark {
  id: string;
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  isDragging?: boolean;
}

type Tool = 'select' | 'crop' | 'flip' | 'rotate' | 'draw' | 'shape' | 'icon' | 'text' | 'watermark' | 'filters' | 'corner' | 'tuning';

interface FilterDefinition {
  id: string;
  name: string;
  method: string; // Method name to call
  args?: any[]; // Optional arguments
}

@Component({
  selector: 'app-image-editor',
  standalone: true,
  imports: [FormsModule, PickerComponent],
  templateUrl: './image-editor.component.html',
  styleUrls: ['./image-editor.component.scss']
})
export class ImageEditorComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  // Reference to filter container for resetting scroll position
  @ViewChild('filterContainer') filterContainerRef?: ElementRef<HTMLDivElement>;
  // Reference to file input for programmatic triggering
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // Image state
  currentImage = signal<ImageData | null>(null);
  originalImage: ImageData | null = null;
  processing = signal<boolean>(false);
  error = signal<string | null>(null);
  loading = signal<boolean>(false);
  converting = signal<boolean>(false);
  
  // File metadata
  uploadedFileName = signal<string>('');
  uploadedFileFormat = signal<string>('');
  originalFileFormat: string = ''; // Original format for download conversion
  
  // Download dialog state
  showDownloadDialog = signal<boolean>(false);
  selectedDownloadFormat = signal<string>('png');
  
  // All available formats (full list)
  private allFormats = [
    { value: 'png', label: 'PNG', mimeType: 'image/png' },
    { value: 'jpg', label: 'JPEG', mimeType: 'image/jpeg' },
    { value: 'bmp', label: 'BMP', mimeType: 'image/bmp' },
    { value: 'webp', label: 'WebP', mimeType: 'image/webp' },
    { value: 'tiff', label: 'TIFF', mimeType: 'image/tiff' },
  ];
  
  // Available formats (dynamically filtered based on input format)
  availableFormats = [...this.allFormats];

  // Tool state
  activeTool = signal<Tool>('select');
  selectedObject = signal<DrawingObject | null>(null);

  // Filter preview state - managed by FilterService
  filterPreviewsGenerated = false; // Track if previews have been generated for current image
  
  // Access filter data from FilterService
  get filterPreviews() { return this.filterService.getPreviews(); }
  get loadingFilterPreviews() { return this.filterService.isLoadingPreviews(); }
  get activeFilterId() { return this.filterService.getActiveFilterId(); }
  get filterList() { return this.filterService.filterList; }

  // History for undo/redo - managed by HistoryService

  // Crop settings
  cropAspectRatio: string = 'free';
  isCropping: boolean = false;
  cropStartX: number = 0;
  cropStartY: number = 0;
  cropEndX: number = 0;
  cropEndY: number = 0;

  // Rotation settings
  rotationAngle: number = 0;
  currentRotation: number = 0;

  // Draw settings
  brushWidth: number = 5;
  drawColor: string = '#000000';
  isDrawing: boolean = false;
  drawStartX: number = 0;
  drawStartY: number = 0;
  lastDrawX: number = 0;
  lastDrawY: number = 0;

  // Shape clip settings
  selectedShape: ShapeClipType = 'circle';
  shapeBorderWidth: number = 0;
  shapeBorderColor: string = '#000000';
  shapeBackgroundColor: string = '#ffffff';

  // Text settings
  textInput: string = '';
  textFontSize: number = 32;
  textColor: string = '#000000';
  textFontStyle: string = 'normal';

  // Icon settings
  iconSize: number = 64;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;
  showEmojiPicker: boolean = false;

  // Drawing objects managed by DrawingManagerService
  get draggableIcons() { return this.drawingManagerService.getIcons(); }
  get draggableTexts() { return this.drawingManagerService.getTexts(); }
  get draggableWatermarks() { return this.drawingManagerService.getWatermarks(); }
  get selectedIconId() { return this.drawingManagerService.getSelectedIconId(); }
  get selectedTextId() { return this.drawingManagerService.getSelectedTextId(); }
  get selectedWatermarkId() { return this.drawingManagerService.getSelectedWatermarkId(); }

  // Filter settings
  /**
   * Brightness adjustment: 0 to 10 (5 is neutral/middle)
   * Range: -50 to +50 (10 units per step)
   * 0: -50 (darker), 5: 0 (neutral), 10: +50 (brighter)
   * Industry standard range prevents extreme over/under exposure
   */
  brightness: number = 5;
  
  /**
   * Contrast adjustment: 0 to 10 (5 is neutral/middle)
   * Range: -50 to +50 (10 units per step)
   * 0: -50 (lower), 5: 0 (neutral), 10: +50 (higher)
   * Industry standard range prevents extreme posterization
   */
  contrast: number = 5;
  
  /**
   * Saturation adjustment: 0 to 10 (5 is neutral/middle)
   * Range: -1.0 to +1.0 (0.2 per step)
   * 0: Full desaturation, 5: No change, 10: Full saturation
   */
  saturation: number = 5;
  
  /**
   * Hue rotation: 0 to 10 (5 is neutral/middle)
   * Range: -180° to +180° (36 degrees per step)
   * 0: -180°, 5: 0° (neutral), 10: +180°
   * Industry standard range for color adjustments
   */
  hueRotation: number = 5;
  
  /**
   * Corner radius as percentage: 0 to 100
   * Applied as percentage of smaller image dimension
   */
  cornerRadius: number = 0;
  
  /**
   * Opacity: 0 to 10
   * 0 = fully transparent, 10 = fully opaque
   * Each step = 10% opacity
   */
  opacity: number = 10;
  
  /**
   * Sharpen intensity: 0 to 10
   * Maximum 3 iterations (at positions 0, 4, 7, 10)
   * Prevents over-sharpening artifacts
   */
  sharpenIntensity: number = 0;
  
  /**
   * Noise reduction intensity: 0 to 10
   * Maximum 3 iterations (at positions 0, 4, 7, 10)
   * Prevents excessive blur
   */
  noiseIntensity: number = 0;

  // Watermark settings
  watermarkOpacity: number = 50;
  watermarkSize: number = 200;

  // Zoom settings
  zoomLevel = signal<number>(1);

  // Math is available globally in Angular templates, no need to expose

  constructor(
    private photonService: PhotonService,
    public magickService: MagickService,
    private canvasService: CanvasService,
    private imageTransformationService: ImageTransformationService,
    private historyService: HistoryService,
    private drawingManagerService: DrawingManagerService,
    public filterService: FilterService,
    private downloadService: DownloadService,
    private tuningService: TuningService
  ) {
    effect(() => {
      const imgData = this.currentImage();
      if (imgData) {
        setTimeout(() => {
          if (this.canvasRef?.nativeElement) {
            this.renderImageToCanvas(imgData);
            // Re-render all objects if any exist
            if (this.drawingManagerService.hasObjects()) {
              this.renderAllObjectsToCanvas();
            }
          }
        }, 0);
      }
    });
    
    effect(() => {
      const zoom = this.zoomLevel();
      if (this.canvasRef?.nativeElement && this.currentImage()) {
        this.applyZoom();
      }
    });
    
    // No effect needed - previews will be generated explicitly on image load
    
    // Note: photon-wasm and magick-wasm are initialized at app startup via APP_INITIALIZER
    // See app.config.ts for initialization setup
  }

  ngAfterViewInit() {
    // Canvas is now available, render current image if it exists
    const imgData = this.currentImage();
    if (imgData) {
      this.renderImageToCanvas(imgData);
    }
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }
  
  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Delete key - delete selected object
      if (event.key === 'Delete' || event.key === 'Backspace') {
        this.deleteSelectedObject();
        event.preventDefault();
      }
      
      // Ctrl+Z - Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        this.undo();
        event.preventDefault();
      }
      
      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        this.redo();
        event.preventDefault();
      }
      
      // Escape - Cancel current operation
      if (event.key === 'Escape') {
        if (this.isCropping) {
          this.cancelCrop();
          event.preventDefault();
        }
      }
    });
  }
  
  deleteSelectedObject() {
    const deleted = this.drawingManagerService.deleteSelected();
    if (deleted) {
      this.renderAllObjectsToCanvas();
    }
  }

  private renderImageToCanvas(imgData: ImageData) {
    if (!this.canvasRef?.nativeElement) {
      return;
    }
    
    this.canvasService.renderImageToCanvas(this.canvasRef.nativeElement, imgData);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    // Start loading spinner IMMEDIATELY (synchronously)
    this.error.set(null);
    this.loading.set(true);
    this.converting.set(false);
    
    // Defer the actual file processing to allow UI to update
    setTimeout(() => this.processFile(file), 0);
  }

  private async processFile(file: File) {
    
    // Reset filter preview state for new image
    this.filterPreviewsGenerated = false;
    this.filterService.clearPreviews();
    
    try {
      // Extract file metadata
      const fileName = file.name;
      const fileFormat = this.magickService.getFileExtension(fileName);
      
      // Store original file info
      this.uploadedFileName.set(fileName);
      this.uploadedFileFormat.set(fileFormat.toUpperCase());
      this.originalFileFormat = fileFormat;
      
      // Update available download formats based on input format compatibility
      const compatibleFormats = this.magickService.getCompatibleOutputFormats(fileFormat);
      this.availableFormats = this.allFormats.filter(fmt => 
        compatibleFormats.includes(fmt.value)
      );
      
      // Check if format is compatible with Photon
      let imageFile = file;
      if (!this.magickService.isPhotonCompatible(fileFormat)) {
        // Convert to PNG for editing (keep loading spinner showing)
        this.converting.set(true); // Flag that we're converting
        try {
          const fileData = await this.magickService.fileToUint8Array(file);
          const convertedData = await this.magickService.convertFormat(fileData, fileFormat, 'png');
          const convertedBlob = this.magickService.uint8ArrayToBlob(convertedData, 'image/png');
          imageFile = new File([convertedBlob], `${this.magickService.getFileNameWithoutExtension(fileName)}.png`, { type: 'image/png' });
        } catch (conversionError) {
          this.error.set(`Failed to convert ${fileFormat.toUpperCase()} to PNG for editing`);
          this.converting.set(false);
          this.loading.set(false);
          return;
        }
        // Keep both loading and converting true during image load
      }
      
      // Load the image (this waits for img.onload)
      const img = await this.loadImage(imageFile);
      
      // Save original for reset (optimized memory copy)
      this.originalImage = this.canvasService.copyImageData(img);
      
      // Set current and initialize history
      this.currentImage.set(img);
      this.historyService.initialize(img);
      
      // Reset active filter when new image is loaded
      this.filterService.setActiveFilterId('original');
    } catch (e) {
      this.error.set('Failed to load image');
    } finally {
      // Stop both spinners
      this.loading.set(false);
      this.converting.set(false);
      
      // Generate filter previews in background AFTER spinner is hidden
      // Use setTimeout to ensure UI has updated
      setTimeout(() => {
        this.generateFilterPreviews();
      }, 0);
    }
  }

  async loadImage(file: File): Promise<ImageData> {
    return this.canvasService.loadImageFromFile(file);
  }

  async loadOverlayImage(file: File): Promise<HTMLImageElement> {
    return this.canvasService.loadOverlayImage(file);
  }

  /**
   * Triggers the file input programmatically
   * Called by the empty state component's action button
   */
  triggerFileInput(): void {
    this.fileInputRef?.nativeElement.click();
  }

  async applyPhotonEffect(effectName: string, ...args: any[]) {
    if (!this.currentImage()) return;
    this.error.set(null);
    try {
      const service = this.photonService as any;
      const effectMethod = service[effectName];
      
      if (!effectMethod) {
        throw new Error(`Effect '${effectName}' not found`);
      }
      
      const processed = await effectMethod.call(service, this.currentImage()!, ...args);
      this.currentImage.set(processed);
      this.saveToHistory();
    } catch (e) {
      this.error.set(`Failed to apply effect: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  async applyEffect(effect: 'grayscale' | 'sepia' | 'blur') {
    return this.applyPhotonEffect(effect);
  }



  async downloadImage() {
    if (!this.currentImage()) return;
    
    // Apply any pending draggable objects before downloading
    if (this.drawingManagerService.getIcons().length > 0) {
      this.applyIcons();
    }
    if (this.drawingManagerService.getTexts().length > 0) {
      this.applyTexts();
    }
    if (this.drawingManagerService.getWatermarks().length > 0) {
      this.applyWatermarks();
    }
    
    // Set default format to original format if available, otherwise PNG
    if (this.originalFileFormat) {
      this.selectedDownloadFormat.set(this.originalFileFormat);
    } else {
      this.selectedDownloadFormat.set('png');
    }
    
    // Show the download dialog
    this.showDownloadDialog.set(true);
  }
  
  closeDownloadDialog() {
    this.showDownloadDialog.set(false);
  }
  
  async confirmDownload() {
    if (!this.currentImage()) return;
    
    const canvas = this.canvasRef.nativeElement;
    const selectedFormat = this.selectedDownloadFormat();
    
    // Close dialog
    this.showDownloadDialog.set(false);
    this.processing.set(true);
    
    // Set converting flag for non-Photon formats
    const isPhotonCompatible = this.magickService.isPhotonCompatible(selectedFormat);
    if (!isPhotonCompatible && selectedFormat !== 'png') {
      this.converting.set(true);
    }
    
    try {
      await this.downloadService.downloadCanvas(
        canvas,
        this.uploadedFileName() || 'edited-image',
        selectedFormat
      );
    } catch (e) {
      this.error.set(`Failed to download image: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      this.processing.set(false);
      this.converting.set(false);
    }
  }

  // Tool management
  setActiveTool(tool: Tool) {
    this.activeTool.set(tool);
    
    // Handle tool-specific initialization
    if (tool === 'crop') {
      this.startCrop();
    } else if (tool === 'filters') {
      // Reset filter scroll position to start when switching to filters
      setTimeout(() => {
        if (this.filterContainerRef?.nativeElement) {
          this.filterContainerRef.nativeElement.scrollLeft = 0;
        }
      }, 0);
    }
  }

  async resetCurrentAdjustment() {
    const tool = this.activeTool();
    if (tool === 'tuning') {
      // Reset all tuning values to defaults
      this.brightness = 5;
      this.contrast = 5;
      this.saturation = 5;
      this.hueRotation = 5;
      this.sharpenIntensity = 0;
      this.noiseIntensity = 0;
      await this.applyAllTuningAdjustments();
    }
  }

  async incrementSlider() {
    // No longer used with unified tuning panel
    // All sliders are now adjusted directly in the UI
  }

  async decrementSlider() {
    // No longer used with unified tuning panel
    // All sliders are now adjusted directly in the UI
  }

  // History management (optimized for memory efficiency)
  saveToHistory() {
    const current = this.currentImage();
    if (!current) return;
    this.historyService.save(current);
  }

  canUndo(): boolean {
    return this.historyService.canUndo();
  }

  canRedo(): boolean {
    return this.historyService.canRedo();
  }

  undo() {
    const state = this.historyService.undo();
    if (state) {
      this.currentImage.set(state);
    }
  }

  redo() {
    const state = this.historyService.redo();
    if (state) {
      this.currentImage.set(state);
    }
  }

  resetImage() {
    if (!this.originalImage) return;
    const copy = this.canvasService.copyImageData(this.originalImage);
    this.currentImage.set(copy);
    this.saveToHistory();
  }

  generateImage() {
    this.loading.set(true);
    this.error.set(null);
    
    // Reset filter preview state for new image
    this.filterPreviewsGenerated = false;
    this.filterService.clearPreviews();
    
    // Set generated image metadata
    this.uploadedFileName.set('generated-image.png');
    this.uploadedFileFormat.set('PNG');
    this.originalFileFormat = 'png';
    
    // PNG supports all formats
    this.availableFormats = [...this.allFormats];
    
    try {
      // Generate a simple gradient image using canvas
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        this.error.set('Failed to create canvas');
        this.loading.set(false);
        return;
      }
      
      // Create a random gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const hue1 = Math.floor(Math.random() * 360);
      const hue2 = (hue1 + 120) % 360;
      gradient.addColorStop(0, `hsl(${hue1}, 70%, 60%)`);
      gradient.addColorStop(1, `hsl(${hue2}, 70%, 60%)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some decorative elements
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 100 + 50;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Get the generated image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Save original for reset (optimized memory copy)
      this.originalImage = this.canvasService.copyImageData(imageData);
      
      // Set current and initialize history
      this.currentImage.set(imageData);
      this.historyService.initialize(imageData);
      
      // Generate filter previews in background
      this.generateFilterPreviews();
    } catch (error) {
      this.error.set('Failed to generate image');
    } finally {
      this.loading.set(false);
    }
  }



  // Crop functionality
  startCrop() {
    this.isCropping = true;
    // Set initial crop area to full image
    const canvas = this.canvasRef.nativeElement;
    this.cropStartX = 0;
    this.cropStartY = 0;
    this.cropEndX = canvas.width;
    this.cropEndY = canvas.height;
  }

  applyCrop() {
    if (!this.currentImage()) return;
    
    try {
      const imgData = this.currentImage()!;
      
      // Calculate the actual crop coordinates
      const x = Math.min(this.cropStartX, this.cropEndX);
      const y = Math.min(this.cropStartY, this.cropEndY);
      const width = Math.abs(this.cropEndX - this.cropStartX);
      const height = Math.abs(this.cropEndY - this.cropStartY);
      
      // Validate crop dimensions
      if (width <= 0 || height <= 0) {
        this.error.set('Invalid crop area. Please select a valid region.');
        return;
      }
      
      // Clamp values to image bounds
      const clampedX = Math.max(0, Math.min(x, imgData.width - 1));
      const clampedY = Math.max(0, Math.min(y, imgData.height - 1));
      const clampedWidth = Math.min(width, imgData.width - clampedX);
      const clampedHeight = Math.min(height, imgData.height - clampedY);
      
      if (clampedWidth <= 0 || clampedHeight <= 0) {
        this.error.set('Crop area is outside image bounds');
        return;
      }
      
      // Create temporary canvas with current image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgData.width;
      tempCanvas.height = imgData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imgData, 0, 0);
      
      // Create new canvas for cropped image
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = clampedWidth;
      cropCanvas.height = clampedHeight;
      const cropCtx = cropCanvas.getContext('2d')!;
      
      // Draw the cropped portion
      cropCtx.drawImage(tempCanvas, clampedX, clampedY, clampedWidth, clampedHeight, 0, 0, clampedWidth, clampedHeight);
      
      const croppedImage = cropCtx.getImageData(0, 0, clampedWidth, clampedHeight);
      this.currentImage.set(croppedImage);
      this.saveToHistory();
      
      // Reset crop state
      this.isCropping = false;
      this.cropStartX = 0;
      this.cropStartY = 0;
      this.cropEndX = 0;
      this.cropEndY = 0;
      this.activeTool.set('select');
      
      // Clear any draggable objects since they won't align anymore
      this.drawingManagerService.clearAll();
    } catch (e) {
      this.error.set('Failed to apply crop');
    }
  }

  cancelCrop() {
    this.isCropping = false;
    this.cropStartX = 0;
    this.cropStartY = 0;
    this.cropEndX = 0;
    this.cropEndY = 0;
    this.activeTool.set('select');
    
    // Redraw canvas without crop overlay
    if (this.currentImage()) {
      const imgData = this.currentImage()!;
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imgData, 0, 0);
      
      // Re-render objects if any
      if (this.drawingManagerService.hasObjects()) {
        this.renderAllObjectsToCanvas();
      }
    }
  }

  onAspectRatioChange() {
    // Adjust crop area based on aspect ratio
    // The crop preview will update visually but not apply until user clicks aspect ratio again or performs another action
    this.applyCrop();
  }

  // Flip functionality
  flipX() {
    if (!this.currentImage()) return;
    try {
      const transformed = this.imageTransformationService.flipHorizontal(this.currentImage()!);
      this.currentImage.set(transformed);
      this.saveToHistory();
    } catch (e) {
      this.error.set('Failed to flip image horizontally');
    }
  }

  flipY() {
    if (!this.currentImage()) return;
    try {
      const transformed = this.imageTransformationService.flipVertical(this.currentImage()!);
      this.currentImage.set(transformed);
      this.saveToHistory();
    } catch (e) {
      this.error.set('Failed to flip image vertically');
    }
  }

  // Rotate functionality
  rotateLeft() {
    this.rotationAngle = (this.rotationAngle - 90) % 360;
    this.applyRotation(this.rotationAngle);
  }

  rotateRight() {
    this.rotationAngle = (this.rotationAngle + 90) % 360;
    this.applyRotation(this.rotationAngle);
  }

  onRotationChange() {
    this.applyRotation(this.rotationAngle);
  }

  applyRotation(angle: number) {
    if (!this.currentImage()) return;
    try {
      const transformed = this.imageTransformationService.rotate(this.currentImage()!, angle);
      this.currentImage.set(transformed);
      this.saveToHistory();
    } catch (e) {
      this.error.set('Failed to rotate image');
    }
  }

  // Shape clip functionality
  async applyShapeClip() {
    if (!this.currentImage()) return;
    
    try {
      const imgData = this.currentImage()!;
      const clipped = this.imageTransformationService.applyShapeClip(
        imgData,
        this.selectedShape,
        this.shapeBorderWidth,
        this.shapeBorderColor,
        this.shapeBackgroundColor
      );
      this.currentImage.set(clipped);
      this.saveToHistory();
    } catch (e) {
      this.error.set('Failed to apply shape clip');
    }
  }

  // Text functionality
  addText() {
    if (!this.currentImage() || !this.textInput) return;
    const canvas = this.canvasRef.nativeElement;
    
    this.drawingManagerService.addText(
      this.textInput,
      canvas.width / 2,
      canvas.height / 2,
      this.textFontSize,
      this.textColor,
      this.textFontStyle
    );
    this.renderAllObjectsToCanvas();
  }
  
  onTextMouseDown(event: MouseEvent, textId: string) {
    event.stopPropagation();
    const text = this.drawingManagerService.getTexts().find(t => t.id === textId);
    if (!text) return;
    
    this.drawingManagerService.selectText(textId);
    text.isDragging = true;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    
    this.dragOffsetX = mouseX - text.x;
    this.dragOffsetY = mouseY - text.y;
    
    // Update the text controls to match selected text
    this.textFontSize = text.size;
    this.textColor = text.color;
    this.textFontStyle = text.fontStyle;
    
    this.renderAllObjectsToCanvas();
  }
  
  onTextMouseMove(event: MouseEvent) {
    const draggingText = this.drawingManagerService.getTexts().find(t => t.isDragging);
    if (!draggingText) return;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    
    draggingText.x = mouseX - this.dragOffsetX;
    draggingText.y = mouseY - this.dragOffsetY;
    
    this.renderAllObjectsToCanvas();
  }
  
  onTextMouseUp(event: MouseEvent) {
    this.drawingManagerService.getTexts().forEach(text => text.isDragging = false);
  }
  
  deleteSelectedText() {
    const textId = this.drawingManagerService.getSelectedTextId();
    if (!textId) return;
    this.drawingManagerService.deleteText(textId);
    this.renderAllObjectsToCanvas();
  }
  
  updateSelectedTextSize() {
    const textId = this.drawingManagerService.getSelectedTextId();
    if (!textId) return;
    this.drawingManagerService.updateTextSize(textId, this.textFontSize);
    this.renderAllObjectsToCanvas();
  }
  
  updateSelectedTextColor() {
    const textId = this.drawingManagerService.getSelectedTextId();
    if (!textId) return;
    this.drawingManagerService.updateTextColor(textId, this.textColor);
    this.renderAllObjectsToCanvas();
  }
  
  updateSelectedTextStyle() {
    const textId = this.drawingManagerService.getSelectedTextId();
    if (!textId) return;
    this.drawingManagerService.updateTextStyle(textId, this.textFontStyle);
    this.renderAllObjectsToCanvas();
  }
  
  applyTexts() {
    if (!this.currentImage()) return;
    
    // Render all texts to the actual image data permanently
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
    
    // Clear texts after burning them into the image
    this.drawingManagerService.clearTexts();
  }

  // Icon/Emoji functionality
  addEmoji(emoji: string) {
    if (!this.currentImage()) return;
    const canvas = this.canvasRef.nativeElement;
    
    this.drawingManagerService.addIcon(
      emoji,
      canvas.width / 2,
      canvas.height / 2,
      this.iconSize
    );
    this.renderAllObjectsToCanvas();
  }
  
  onEmojiSelect(event: any) {
    if (!this.currentImage()) return;
    
    // Get the native emoji from the event
    const emoji = event.emoji.native;
    this.addEmoji(emoji);
    
    // Optionally close the picker after selection
    // this.showEmojiPicker = false;
  }
  
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }
  
  // Removed duplicate method - renderTextAndIconsToCanvas is an alias for renderAllObjectsToCanvas
  
  renderAllObjectsToCanvas() {
    if (!this.currentImage()) return;
    
    // Start with the current image (without any overlay objects)
    const imgData = this.currentImage()!;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    // Clear and redraw base image
    ctx.putImageData(imgData, 0, 0);
    
    // Draw all drawing objects using DrawingManagerService
    this.drawingManagerService.renderToCanvas(canvas);
  }
  
  // Removed duplicate method - use renderAllObjectsToCanvas() directly
  
  onIconMouseDown(event: MouseEvent, iconId: string) {
    event.stopPropagation();
    const icon = this.drawingManagerService.getIcons().find(i => i.id === iconId);
    if (!icon) return;
    
    this.drawingManagerService.selectIcon(iconId);
    icon.isDragging = true;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    
    this.dragOffsetX = mouseX - icon.x;
    this.dragOffsetY = mouseY - icon.y;
    
    // Update the icon size control to match selected icon
    this.iconSize = icon.size;
    
    this.renderAllObjectsToCanvas();
  }
  
  onIconMouseMove(event: MouseEvent) {
    const draggingIcon = this.drawingManagerService.getIcons().find(i => i.isDragging);
    if (!draggingIcon) return;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    
    draggingIcon.x = mouseX - this.dragOffsetX;
    draggingIcon.y = mouseY - this.dragOffsetY;
    
    this.renderAllObjectsToCanvas();
  }
  
  onIconMouseUp(event: MouseEvent) {
    this.drawingManagerService.getIcons().forEach(icon => icon.isDragging = false);
  }
  
  deleteSelectedIcon() {
    const iconId = this.drawingManagerService.getSelectedIconId();
    if (!iconId) return;
    this.drawingManagerService.deleteIcon(iconId);
    this.renderAllObjectsToCanvas();
  }
  
  updateSelectedIconSize() {
    const iconId = this.drawingManagerService.getSelectedIconId();
    if (!iconId) return;
    this.drawingManagerService.updateIconSize(iconId, this.iconSize);
    this.renderAllObjectsToCanvas();
  }
  
  applyIcons() {
    if (!this.currentImage()) return;
    
    // Render all icons to the actual image data permanently
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
    
    // Clear icons after burning them into the image
    this.drawingManagerService.clearIcons();
  }
  
  applyAllTextAndIcons() {
    if (!this.currentImage()) return;
    
    // Render all icons and text to the actual image data
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
    
    // Clear all draggable objects after applying
    this.drawingManagerService.clearIcons();
    this.drawingManagerService.clearTexts();
  }

  // Filter functionality
  async applyInvert() {
    if (!this.currentImage()) return;
    try {
      const inverted = this.imageTransformationService.invert(this.currentImage()!);
      this.currentImage.set(inverted);
      this.saveToHistory();
    } catch (e) {
      this.error.set('Failed to apply invert filter');
    }
  }

  // Filter preview generation (progressive loading)
  async generateFilterPreviews() {
    // Don't regenerate if already generated or currently generating
    if (!this.currentImage() || this.loadingFilterPreviews() || this.filterPreviewsGenerated) return;
    
    this.filterPreviewsGenerated = false;
    
    try {
      const imgData = this.currentImage()!;
      await this.filterService.generatePreviews(imgData);
      this.filterPreviewsGenerated = true;
    } catch (e) {
      this.error.set('Failed to generate filter previews');
      this.filterPreviewsGenerated = false;
    }
  }

  async applyFilterFromPreview(filter: FilterDefinition) {
    if (!this.currentImage()) return;
    
    // If clicking the same filter that's already active, do nothing
    if (filter.id === this.filterService.getActiveFilterId()()) {
      return;
    }
    
    // Always reset to original image first (enforces one filter at a time)
    if (this.originalImage) {
      this.currentImage.set(this.canvasService.copyImageData(this.originalImage));
    }
    
    if (filter.method === 'none') {
      // Just reset to original (already done above)
      this.filterService.setActiveFilterId('original');
      this.saveToHistory();
      return;
    }
    
    // Apply filter using FilterService
    this.error.set(null);
    try {
      const processed = await this.filterService.applyFilter(this.currentImage()!, filter);
      this.currentImage.set(processed);
      this.saveToHistory();
      
      // Set this filter as active after successful application
      this.filterService.setActiveFilterId(filter.id);
    } catch (e) {
      this.error.set(`Failed to apply filter: ${e instanceof Error ? e.message : 'Unknown error'}`);
      // Reset to original on error
      this.filterService.setActiveFilterId('original');
    }
  }

  /**
   * Apply all tuning adjustments cumulatively using TuningService.
   * This ensures that when you switch between adjustments (brightness, saturation, etc.),
   * all previous adjustments are preserved. The adjustments are applied in a specific order
   * to the original image to avoid cumulative degradation.
   * 
   * Order: Opacity → Brightness → Contrast → Saturation → Hue → Sharpen → Denoise
   */
  async applyAllTuningAdjustments() {
    if (!this.originalImage) return;
    
    try {
      const adjustedImage = await this.tuningService.applyAllAdjustments(
        this.originalImage,
        {
          opacity: this.opacity,
          brightness: this.brightness,
          contrast: this.contrast,
          saturation: this.saturation,
          hueRotation: this.hueRotation,
          sharpenIntensity: this.sharpenIntensity,
          noiseIntensity: this.noiseIntensity
        }
      );
      this.currentImage.set(adjustedImage);
    } catch (error) {
      this.error.set('Failed to apply adjustments');
    }
  }

  async applyBrightness() {
    await this.applyAllTuningAdjustments();
  }

  async applyContrast() {
    await this.applyAllTuningAdjustments();
  }

  async applySaturation() {
    await this.applyAllTuningAdjustments();
  }

  async applyHueRotation() {
    await this.applyAllTuningAdjustments();
  }

  async applyOpacity() {
    await this.applyAllTuningAdjustments();
  }

  /**
   * Wrapper method for tuning sliders in subsection panel
   */
  async applyTuning() {
    await this.applyAllTuningAdjustments();
  }

  /**
   * Apply filter by ID from subsection panel
   */
  async applyFilterById(filterId: string) {
    const filter = this.filterService.filterList.find(f => f.id === filterId);
    if (filter) {
      await this.applyFilterFromPreview(filter);
    }
  }

  async applyCornerRadius() {
    if (!this.currentImage() || this.cornerRadius === 0) return;
    try {
      const imgData = this.currentImage()!;
      const rounded = await this.tuningService.applyCornerRadius(imgData, {
        radiusPercentage: this.cornerRadius
      });
      this.currentImage.set(rounded);
      this.saveToHistory();
    } catch (e) {
      this.error.set('Failed to apply corner radius');
    }
  }

  // Watermark functionality
  async onWatermarkSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    try {
      const img = await this.loadOverlayImage(file);
      this.addWatermark(img);
    } catch (e) {
      this.error.set('Failed to load watermark image');
    }
  }
  
  async onWatermarkFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    try {
      const file = input.files[0];
      const image = await this.loadOverlayImage(file);
      this.addWatermark(image);
    } catch (e) {
      this.error.set('Failed to load watermark image');
    }
  }
  
  addWatermark(image: HTMLImageElement) {
    if (!this.currentImage()) return;
    const canvas = this.canvasRef.nativeElement;
    
    // Calculate watermark dimensions maintaining aspect ratio
    const aspectRatio = image.width / image.height;
    const width = this.watermarkSize;
    const height = width / aspectRatio;
    
    this.drawingManagerService.addWatermark(
      image,
      canvas.width / 2,
      canvas.height / 2,
      width,
      height,
      this.watermarkOpacity / 100
    );
    this.renderAllObjectsToCanvas();
  }
  
  onWatermarkMouseDown(event: MouseEvent, watermarkId: string) {
    event.stopPropagation();
    const watermark = this.drawingManagerService.getWatermarks().find(wm => wm.id === watermarkId);
    if (!watermark) return;
    
    this.drawingManagerService.selectWatermark(watermarkId);
    watermark.isDragging = true;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    
    this.dragOffsetX = mouseX - watermark.x;
    this.dragOffsetY = mouseY - watermark.y;
    
    // Update the watermark controls to match selected watermark
    this.watermarkSize = watermark.width;
    this.watermarkOpacity = watermark.opacity * 100;
    
    this.renderAllObjectsToCanvas();
  }
  
  onWatermarkMouseMove(event: MouseEvent) {
    const draggingWatermark = this.drawingManagerService.getWatermarks().find(wm => wm.isDragging);
    if (!draggingWatermark) return;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    
    draggingWatermark.x = mouseX - this.dragOffsetX;
    draggingWatermark.y = mouseY - this.dragOffsetY;
    
    this.renderAllObjectsToCanvas();
  }
  
  onWatermarkMouseUp(event: MouseEvent) {
    this.drawingManagerService.getWatermarks().forEach(wm => wm.isDragging = false);
  }
  
  deleteSelectedWatermark() {
    const watermarkId = this.drawingManagerService.getSelectedWatermarkId();
    if (!watermarkId) return;
    this.drawingManagerService.deleteWatermark(watermarkId);
    this.renderAllObjectsToCanvas();
  }
  
  updateSelectedWatermarkSize() {
    const watermarkId = this.drawingManagerService.getSelectedWatermarkId();
    if (!watermarkId) return;
    const selectedWatermark = this.drawingManagerService.getWatermarks().find(wm => wm.id === watermarkId);
    if (selectedWatermark) {
      const aspectRatio = selectedWatermark.image.width / selectedWatermark.image.height;
      const newWidth = this.watermarkSize;
      const newHeight = newWidth / aspectRatio;
      this.drawingManagerService.updateWatermarkSize(watermarkId, newWidth, newHeight);
      this.renderAllObjectsToCanvas();
    }
  }
  
  updateSelectedWatermarkOpacity() {
    const watermarkId = this.drawingManagerService.getSelectedWatermarkId();
    if (!watermarkId) return;
    this.drawingManagerService.updateWatermarkOpacity(watermarkId, this.watermarkOpacity / 100);
    this.renderAllObjectsToCanvas();
  }
  
  applyWatermarks() {
    if (!this.currentImage()) return;
    
    // Render all watermarks to the actual image data permanently
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
    
    // Clear watermarks after burning them into the image
    this.drawingManagerService.clearWatermarks();
  }

  // Zoom functionality
  onCanvasWheel(event: WheelEvent) {
    event.preventDefault(); // Prevent page scroll
    
    const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1; // Scroll down = zoom out, scroll up = zoom in
    const newZoom = Math.max(0.1, Math.min(3, this.zoomLevel() + zoomDelta));
    
    this.zoomLevel.set(newZoom);
    this.applyZoom();
  }

  private applyZoom() {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const zoom = this.zoomLevel();
    canvas.style.transform = `scale(${zoom})`;
  }

  // Filter preview horizontal scroll with mouse wheel
  onFilterScrollWheel(event: WheelEvent) {
    event.preventDefault(); // Prevent default vertical scroll
    const container = event.currentTarget as HTMLElement;
    
    // Convert vertical scroll (deltaY) to horizontal scroll
    // Use deltaX if user is scrolling horizontally with trackpad
    const scrollAmount = event.deltaY !== 0 ? event.deltaY : event.deltaX;
    container.scrollLeft += scrollAmount;
  }

  // Canvas event handlers
  onCanvasMouseDown(event: MouseEvent) {
    if (!this.currentImage()) return;
    
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    // Check if clicking on a watermark
    if (this.activeTool() === 'watermark') {
      const clickedWatermark = this.drawingManagerService.findClickedWatermark(x, y);
      if (clickedWatermark) {
        this.onWatermarkMouseDown(event, clickedWatermark.id);
        return;
      }
    }
    
    // Check if clicking on a text
    if (this.activeTool() === 'text') {
      const clickedText = this.drawingManagerService.findClickedText(x, y, this.canvasRef.nativeElement);
      if (clickedText) {
        this.onTextMouseDown(event, clickedText.id);
        return;
      }
    }
    
    // Check if clicking on an icon
    if (this.activeTool() === 'icon') {
      const clickedIcon = this.drawingManagerService.findClickedIcon(x, y);
      if (clickedIcon) {
        this.onIconMouseDown(event, clickedIcon.id);
        return;
      }
    }
    
    if (this.activeTool() === 'draw') {
      this.startDrawing(x, y);
    } else if (this.activeTool() === 'crop') {
      this.startCropSelection(x, y);
    }
  }
  
  onCanvasMouseMove(event: MouseEvent) {
    if (!this.currentImage()) return;
    
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    // Handle watermark dragging
    if (this.activeTool() === 'watermark') {
      this.onWatermarkMouseMove(event);
    }
    
    // Handle text dragging
    if (this.activeTool() === 'text') {
      this.onTextMouseMove(event);
    }
    
    // Handle icon dragging
    if (this.activeTool() === 'icon') {
      this.onIconMouseMove(event);
    }
    
    if (this.isDrawing && this.activeTool() === 'draw') {
      this.continueDrawing(x, y);
    } else if (this.isCropping && this.activeTool() === 'crop') {
      this.updateCropSelection(x, y);
    }
  }
  
  onCanvasMouseUp(event: MouseEvent) {
    // Handle watermark dragging end
    if (this.activeTool() === 'watermark') {
      this.onWatermarkMouseUp(event);
    }
    
    // Handle text dragging end
    if (this.activeTool() === 'text') {
      this.onTextMouseUp(event);
    }
    
    // Handle icon dragging end
    if (this.activeTool() === 'icon') {
      this.onIconMouseUp(event);
    }
    
    if (this.isDrawing && this.activeTool() === 'draw') {
      this.finishDrawing();
    } else if (this.isCropping && this.activeTool() === 'crop') {
      this.finishCropSelection();
    }
  }
  
  onCanvasMouseLeave(event: MouseEvent) {
    if (this.isDrawing) {
      this.finishDrawing();
    }
  }
  
  // Drawing functions
  private startDrawing(x: number, y: number) {
    this.isDrawing = true;
    this.drawStartX = x;
    this.drawStartY = y;
    this.lastDrawX = x;
    this.lastDrawY = y;
  }
  
  private continueDrawing(x: number, y: number) {
    if (!this.isDrawing) return;
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = this.drawColor;
    ctx.lineWidth = this.brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(this.lastDrawX, this.lastDrawY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    this.lastDrawX = x;
    this.lastDrawY = y;
  }
  
  private finishDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    // Save the drawn content to image data
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImageData);
    this.saveToHistory();
  }
  
  // Crop selection functions
  private startCropSelection(x: number, y: number) {
    this.isCropping = true;
    this.cropStartX = x;
    this.cropStartY = y;
    this.cropEndX = x;
    this.cropEndY = y;
  }
  
  private updateCropSelection(x: number, y: number) {
    if (!this.isCropping) return;
    
    this.cropEndX = x;
    this.cropEndY = y;
    
    // Apply aspect ratio constraint if needed
    if (this.cropAspectRatio !== 'free') {
      const width = Math.abs(this.cropEndX - this.cropStartX);
      const height = Math.abs(this.cropEndY - this.cropStartY);
      
      let targetRatio = 1;
      switch (this.cropAspectRatio) {
        case '16:9':
          targetRatio = 16 / 9;
          break;
        case '4:3':
          targetRatio = 4 / 3;
          break;
        case '1:1':
          targetRatio = 1;
          break;
        case '3:2':
          targetRatio = 3 / 2;
          break;
      }
      
      // Adjust height to match aspect ratio
      const newHeight = width / targetRatio;
      const direction = this.cropEndY >= this.cropStartY ? 1 : -1;
      this.cropEndY = this.cropStartY + (newHeight * direction);
    }
    
    // Draw real-time crop preview
    this.drawCropPreview();
  }
  
  private finishCropSelection() {
    this.isCropping = false;
    // Keep the selection visible until user applies or cancels
    this.drawCropPreview();
  }
  
  private drawCropPreview() {
    if (!this.currentImage()) return;
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    // Redraw the base image first
    const imgData = this.currentImage()!;
    ctx.putImageData(imgData, 0, 0);
    
    // Render any existing objects
    if (this.drawingManagerService.hasObjects()) {
      this.renderAllObjectsToCanvas();
    }
    
    // Calculate crop rectangle
    const x = Math.min(this.cropStartX, this.cropEndX);
    const y = Math.min(this.cropStartY, this.cropEndY);
    const width = Math.abs(this.cropEndX - this.cropStartX);
    const height = Math.abs(this.cropEndY - this.cropStartY);
    
    if (width > 0 && height > 0) {
      // Draw semi-transparent overlay outside crop area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      
      // Top
      ctx.fillRect(0, 0, canvas.width, y);
      // Bottom
      ctx.fillRect(0, y + height, canvas.width, canvas.height - (y + height));
      // Left
      ctx.fillRect(0, y, x, height);
      // Right
      ctx.fillRect(x + width, y, canvas.width - (x + width), height);
      
      // Draw crop rectangle border
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
      
      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = '#00ff00';
      // Top-left
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      // Top-right
      ctx.fillRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      // Bottom-left
      ctx.fillRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
      // Bottom-right
      ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
      
      // Draw dimension text
      ctx.fillStyle = '#00ff00';
      ctx.font = '14px Arial';
      const dimensionText = `${Math.round(width)} × ${Math.round(height)}`;
      const textMetrics = ctx.measureText(dimensionText);
      const textX = x + width / 2 - textMetrics.width / 2;
      const textY = y - 10;
      
      // Draw text background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(textX - 5, textY - 16, textMetrics.width + 10, 20);
      
      // Draw text
      ctx.fillStyle = '#00ff00';
      ctx.fillText(dimensionText, textX, textY);
    }
  }



  // Demo methods
  resetEditor() {
    this.resetImage();
  }

  addSampleText() {
    if (!this.currentImage()) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ff0000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sample Text', canvas.width / 2, canvas.height / 2);
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
  }

  addSampleShape() {
    if (!this.currentImage()) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'transparent';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 50;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
  }

  startDrawMode() {
    // Set drawing properties for free drawing
    this.brushWidth = 10;
    this.drawColor = 'rgba(255, 0, 0, 0.5)';
  }

  startCropMode() {
    this.isCropping = true;
    const canvas = this.canvasRef.nativeElement;
    this.cropStartX = 0;
    this.cropStartY = 0;
    this.cropEndX = canvas.width;
    this.cropEndY = canvas.height;
  }

  rotateImage(angle: number) {
    this.rotationAngle = (this.rotationAngle + angle) % 360;
    this.applyRotation(this.rotationAngle);
  }

  flipImage(type: 'flipX' | 'flipY') {
    if (type === 'flipX') {
      this.flipX();
    } else {
      this.flipY();
    }
  }

  applyBlurFilter() {
    this.applyEffect('blur');
  }

  applyGrayscaleFilter() {
    this.applyEffect('grayscale');
  }

  applySepiaFilter() {
    this.applyEffect('sepia');
  }
}
