import { Component, signal, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { PhotonService } from '../../core/services/photon.service';
import { MagickService } from '../../core/services/magick.service';
import { CollageComponent } from '../collage/collage.component';

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

type Tool = 'select' | 'crop' | 'flip' | 'rotate' | 'draw' | 'shape' | 'icon' | 'text' | 'watermark' | 'filter' | 'corner' | 'tuning' | 'opacity' | 'brightness' | 'contrast' | 'saturation' | 'hue' | 'sharpen' | 'noise' | 'collage';
type Category = 'crop' | 'draw' | 'tuning' | 'filters' | 'collage';

interface FilterDefinition {
  id: string;
  name: string;
  method: string; // Method name to call
  args?: any[]; // Optional arguments
}

@Component({
  selector: 'app-image-editor',
  standalone: true,
  imports: [FormsModule, PickerComponent, CollageComponent],
  templateUrl: './image-editor.component.html',
  styleUrls: ['./image-editor.component.scss']
})
export class ImageEditorComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

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
  activeCategory: Category = 'crop';
  selectedObject = signal<DrawingObject | null>(null);
  
  // Collage mode state
  collageMode = signal<boolean>(false);

  // Filter preview state
  filterPreviews = signal<Record<string, string>>({});
  loadingFilterPreviews = signal<boolean>(false);
  filterPreviewsGenerated = false; // Track if previews have been generated for current image
  activeFilterId = signal<string>('original'); // Track currently active filter (default: original/none)
  
  // Artistic filter list (for Filters category) - Sorted alphabetically
  filterList: FilterDefinition[] = [
    { id: 'original', name: 'Original', method: 'none' },
    { id: 'bluechrome', name: 'Bluechrome', method: 'bluechrome' },
    { id: 'cali', name: 'Cali', method: 'cali' },
    { id: 'diamante', name: 'Diamante', method: 'diamante' },
    { id: 'dramatic', name: 'Dramatic', method: 'dramatic' },
    { id: 'firenze', name: 'Firenze', method: 'firenze' },
    { id: 'flagblue', name: 'Flagblue', method: 'flagblue' },
    { id: 'golden', name: 'Golden', method: 'golden' },
    { id: 'islands', name: 'Islands', method: 'islands' },
    { id: 'liquid', name: 'Liquid', method: 'liquid' },
    { id: 'lix', name: 'Lix', method: 'lix' },
    { id: 'lofi', name: 'Lofi', method: 'lofi' },
    { id: 'marine', name: 'Marine', method: 'marine' },
    { id: 'mauve', name: 'Mauve', method: 'mauve' },
    { id: 'neue', name: 'Neue', method: 'neue' },
    { id: 'obsidian', name: 'Obsidian', method: 'obsidian' },
    { id: 'oceanic', name: 'Oceanic', method: 'oceanic' },
    { id: 'oil', name: 'Oil Painting', method: 'oil' },
    { id: 'pastel_pink', name: 'Pastel Pink', method: 'pastel_pink' },
    { id: 'perfume', name: 'Perfume', method: 'perfume' },
    { id: 'pixelize', name: 'Pixelize', method: 'pixelize' },
    { id: 'radio', name: 'Radio', method: 'radio' },
    { id: 'rosetint', name: 'Rosetint', method: 'rosetint' },
    { id: 'ryo', name: 'Ryo', method: 'ryo' },
    { id: 'seagreen', name: 'Seagreen', method: 'seagreen' },
    { id: 'sepia', name: 'Sepia', method: 'sepia' },
    { id: 'serenity', name: 'Serenity', method: 'serenity' },
    { id: 'solarize', name: 'Solarize', method: 'solarize' },
    { id: 'twenties', name: 'Twenties', method: 'twenties' },
    { id: 'vintage', name: 'Vintage', method: 'vintage' },
  ];

  // History for undo/redo
  history: ImageData[] = [];
  historyIndex: number = -1;

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
  draggableIcons: DraggableIcon[] = [];
  selectedIconId: string | null = null;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;
  showEmojiPicker: boolean = false;

  // Draggable text
  draggableTexts: DraggableText[] = [];
  selectedTextId: string | null = null;

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
  draggableWatermarks: DraggableWatermark[] = [];
  selectedWatermarkId: string | null = null;
  watermarkOpacity: number = 50;
  watermarkSize: number = 200;

  // Zoom settings
  zoomLevel = signal<number>(1);

  // Math is available globally in Angular templates, no need to expose

  constructor(
    private photonService: PhotonService,
    public magickService: MagickService
  ) {
    effect(() => {
      const imgData = this.currentImage();
      if (imgData) {
        setTimeout(() => {
          if (this.canvasRef?.nativeElement) {
            this.renderImageToCanvas(imgData);
            // Re-render all objects if any exist
            if (this.draggableIcons.length > 0 || this.draggableTexts.length > 0 || this.draggableWatermarks.length > 0) {
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
        } else if (this.collageMode()) {
          this.exitCollageMode();
          event.preventDefault();
        }
      }
      
      // C - Toggle collage mode
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && !event.shiftKey) {
        if (this.collageMode()) {
          this.exitCollageMode();
        } else {
          this.enterCollageMode();
        }
        event.preventDefault();
      }
    });
  }
  
  deleteSelectedObject() {
    let deleted = false;
    
    // Delete selected icon
    if (this.selectedIconId) {
      const index = this.draggableIcons.findIndex(icon => icon.id === this.selectedIconId);
      if (index !== -1) {
        this.draggableIcons.splice(index, 1);
        this.selectedIconId = null;
        deleted = true;
      }
    }
    
    // Delete selected text
    if (this.selectedTextId) {
      const index = this.draggableTexts.findIndex(text => text.id === this.selectedTextId);
      if (index !== -1) {
        this.draggableTexts.splice(index, 1);
        this.selectedTextId = null;
        deleted = true;
      }
    }
    
    // Delete selected watermark
    if (this.selectedWatermarkId) {
      const index = this.draggableWatermarks.findIndex(wm => wm.id === this.selectedWatermarkId);
      if (index !== -1) {
        this.draggableWatermarks.splice(index, 1);
        this.selectedWatermarkId = null;
        deleted = true;
      }
    }
    
    if (deleted) {
      this.renderAllObjectsToCanvas();
    }
  }

  private renderImageToCanvas(imgData: ImageData) {
    if (!this.canvasRef?.nativeElement) {
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Set canvas dimensions to match image
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    
    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image data
    ctx.putImageData(imgData, 0, 0);
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
    this.filterPreviews.set({});
    
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
      this.originalImage = new ImageData(
        img.data.slice(),
        img.width,
        img.height
      );
      
      // Set current and initialize history
      this.currentImage.set(img);
      this.history = [img];
      this.historyIndex = 0;
      
      // Reset active filter when new image is loaded
      this.activeFilterId.set('original');
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
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
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          resolve(imageData);
        };
        img.onerror = (err) => {
          reject(err);
        };
        img.src = reader.result as string;
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  }

  async loadOverlayImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
    
    try {
      // Get the PNG data from canvas
      const pngBlob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      if (!pngBlob) {
        this.error.set('Failed to generate image data');
        return;
      }
      
      let finalBlob: Blob;
      let finalExtension = selectedFormat;
      
      // Check if target format is Photon-compatible
      const isPhotonCompatible = this.magickService.isPhotonCompatible(selectedFormat);
      
      if (isPhotonCompatible && selectedFormat !== 'png') {
        // Use canvas toBlob directly for Photon-compatible formats (jpeg, jpg, bmp)
        const mimeType = this.magickService.getMimeType(selectedFormat);
        const compatibleBlob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(resolve, mimeType);
        });
        
        if (!compatibleBlob) {
          this.error.set(`Failed to generate ${selectedFormat.toUpperCase()} data`);
          this.processing.set(false);
          return;
        }
        finalBlob = compatibleBlob;
      } else if (!isPhotonCompatible && selectedFormat !== 'png') {
        // Use MagickService only for non-Photon formats (webp, gif, avif, tiff, heic)
        this.converting.set(true);
        try {
          const pngData = new Uint8Array(await pngBlob.arrayBuffer());
          const convertedData = await this.magickService.convertFormat(
            pngData,
            'png',
            selectedFormat
          );
          
          const mimeType = this.magickService.getMimeType(selectedFormat);
          finalBlob = this.magickService.uint8ArrayToBlob(convertedData, mimeType);
        } catch (conversionError) {
          this.error.set(`Failed to convert image to ${selectedFormat.toUpperCase()}`);
          this.converting.set(false);
          this.processing.set(false);
          return;
        } finally {
          this.converting.set(false);
        }
      } else {
        // PNG - use the original blob
        finalBlob = pngBlob;
      }
      
      // Generate filename
      const baseFileName = this.magickService.getFileNameWithoutExtension(
        this.uploadedFileName() || 'edited-image'
      );
      const fileName = `${baseFileName}.${finalExtension}`;
      
      // Download the file
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.error.set(`Failed to download image: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      this.processing.set(false);
    }
  }

  // Tool management
  setActiveTool(tool: Tool) {
    this.activeTool.set(tool);
    if (tool === 'crop') {
      this.startCrop();
    }
  }

  setActiveCategory(category: Category) {
    this.activeCategory = category;
    // Set default tool for each category
    if (category === 'crop') {
      this.setActiveTool('crop');
    } else if (category === 'draw') {
      this.setActiveTool('draw');
    } else if (category === 'tuning') {
      this.setActiveTool('opacity');
    } else if (category === 'filters') {
      this.setActiveTool('filter');
    } else if (category === 'collage') {
      this.setActiveTool('collage');
      this.enterCollageMode();
    }
  }
  
  /**
   * Enter collage mode - switches to collage interface
   */
  enterCollageMode() {
    this.collageMode.set(true);
  }
  
  /**
   * Exit collage mode - returns to image editor
   */
  exitCollageMode() {
    this.collageMode.set(false);
    this.activeTool.set('select');
    this.activeCategory = 'crop';
  }

  async resetCurrentAdjustment() {
    const tool = this.activeTool();
    if (tool === 'opacity') {
      this.opacity = 10;
    } else if (tool === 'brightness') {
      this.brightness = 5;
    } else if (tool === 'contrast') {
      this.contrast = 5;
    } else if (tool === 'saturation') {
      this.saturation = 5;
    } else if (tool === 'hue') {
      this.hueRotation = 5;
    } else if (tool === 'sharpen') {
      this.sharpenIntensity = 0;
    } else if (tool === 'noise') {
      this.noiseIntensity = 0;
    }
    // Re-apply all adjustments cumulatively
    await this.applyAllTuningAdjustments();
  }

  async incrementSlider() {
    const tool = this.activeTool();
    if (tool === 'opacity' && this.opacity < 10) {
      this.opacity++;
      await this.applyOpacity();
    } else if (tool === 'brightness' && this.brightness < 10) {
      this.brightness++;
      await this.applyBrightness();
    } else if (tool === 'contrast' && this.contrast < 10) {
      this.contrast++;
      await this.applyContrast();
    } else if (tool === 'saturation' && this.saturation < 10) {
      this.saturation++;
      await this.applySaturation();
    } else if (tool === 'hue' && this.hueRotation < 10) {
      this.hueRotation++;
      await this.applyHueRotation();
    } else if (tool === 'sharpen' && this.sharpenIntensity < 10) {
      this.sharpenIntensity++;
      await this.applyAllTuningAdjustments();
    } else if (tool === 'noise' && this.noiseIntensity < 10) {
      this.noiseIntensity++;
      await this.applyAllTuningAdjustments();
    }
  }

  async decrementSlider() {
    const tool = this.activeTool();
    if (tool === 'opacity' && this.opacity > 0) {
      this.opacity--;
      await this.applyOpacity();
    } else if (tool === 'brightness' && this.brightness > 0) {
      this.brightness--;
      await this.applyBrightness();
    } else if (tool === 'contrast' && this.contrast > 0) {
      this.contrast--;
      await this.applyContrast();
    } else if (tool === 'saturation' && this.saturation > 0) {
      this.saturation--;
      await this.applySaturation();
    } else if (tool === 'hue' && this.hueRotation > 0) {
      this.hueRotation--;
      await this.applyHueRotation();
    } else if (tool === 'sharpen' && this.sharpenIntensity > 0) {
      this.sharpenIntensity--;
      await this.applyAllTuningAdjustments();
    } else if (tool === 'noise' && this.noiseIntensity > 0) {
      this.noiseIntensity--;
      await this.applyAllTuningAdjustments();
    }
  }

  // History management (optimized for memory efficiency)
  saveToHistory() {
    const current = this.currentImage();
    if (!current) return;
    
    // Remove any history after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add current state - create a shallow reference, deep copy only data
    const copy = new ImageData(
      current.data.slice(), // slice() creates copy without extra allocation
      current.width,
      current.height
    );
    this.history.push(copy);
    this.historyIndex++;
    
    // Limit history to 20 states (reduced from 50 for better memory management)
    if (this.history.length > 20) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return;
    this.historyIndex--;
    const state = this.history[this.historyIndex];
    // Use slice() instead of Uint8ClampedArray constructor for better performance
    const copy = new ImageData(
      state.data.slice(),
      state.width,
      state.height
    );
    this.currentImage.set(copy);
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    // Use slice() instead of Uint8ClampedArray constructor for better performance
    const copy = new ImageData(
      state.data.slice(),
      state.width,
      state.height
    );
    this.currentImage.set(copy);
  }

  resetImage() {
    if (!this.originalImage) return;
    // Use slice() for better performance
    const copy = new ImageData(
      this.originalImage.data.slice(),
      this.originalImage.width,
      this.originalImage.height
    );
    this.currentImage.set(copy);
    this.saveToHistory();
  }

  generateImage() {
    this.loading.set(true);
    this.error.set(null);
    
    // Reset filter preview state for new image
    this.filterPreviewsGenerated = false;
    this.filterPreviews.set({});
    
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
      this.originalImage = new ImageData(
        imageData.data.slice(),
        imageData.width,
        imageData.height
      );
      
      // Set current and initialize history
      this.currentImage.set(imageData);
      this.history = [imageData];
      this.historyIndex = 0;
      
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
      this.draggableIcons = [];
      this.draggableTexts = [];
      this.draggableWatermarks = [];
      this.selectedIconId = null;
      this.selectedTextId = null;
      this.selectedWatermarkId = null;
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
      if (this.draggableIcons.length > 0 || this.draggableTexts.length > 0 || this.draggableWatermarks.length > 0) {
        this.renderAllObjectsToCanvas();
      }
    }
  }

  onAspectRatioChange() {
    // Adjust crop area based on aspect ratio
  }

  // Flip functionality
  flipX() {
    this.transformImage((ctx, canvas, imgData) => {
      ctx.scale(-1, 1);
      ctx.drawImage(canvas, -canvas.width, 0);
    });
  }

  flipY() {
    this.transformImage((ctx, canvas, imgData) => {
      ctx.scale(1, -1);
      ctx.drawImage(canvas, 0, -canvas.height);
    });
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
    this.transformImage((ctx, canvas, imgData) => {
      const radians = (angle * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      
      // Calculate new canvas size
      const newWidth = Math.abs(canvas.width * cos) + Math.abs(canvas.height * sin);
      const newHeight = Math.abs(canvas.width * sin) + Math.abs(canvas.height * cos);
      
      ctx.canvas.width = newWidth;
      ctx.canvas.height = newHeight;
      
      // Translate to center and rotate
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    });
  }

  // Shape clip functionality
  applyShapeClip() {
    if (!this.currentImage()) return;
    
    try {
      const imgData = this.currentImage()!;
      const canvas = document.createElement('canvas');
      canvas.width = imgData.width;
      canvas.height = imgData.height;
      const ctx = canvas.getContext('2d')!;
      
      // Draw original image to temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgData.width;
      tempCanvas.height = imgData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imgData, 0, 0);
      
      // Fill background color if specified
      if (this.shapeBackgroundColor && this.shapeBackgroundColor !== 'transparent') {
        ctx.fillStyle = this.shapeBackgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Create clipping path
      ctx.save();
      this.createShapePath(ctx, canvas.width, canvas.height, this.selectedShape);
      ctx.clip();
      
      // Draw image inside clip
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
      
      // Draw border if specified
      if (this.shapeBorderWidth > 0) {
        ctx.strokeStyle = this.shapeBorderColor;
        ctx.lineWidth = this.shapeBorderWidth;
        this.createShapePath(ctx, canvas.width, canvas.height, this.selectedShape);
        ctx.stroke();
      }
      
      const clipped = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.currentImage.set(clipped);
      this.saveToHistory();
      this.activeTool.set('select');
    } catch (e) {
      this.error.set('Failed to apply shape clip');
    }
  }
  
  private createShapePath(ctx: CanvasRenderingContext2D, width: number, height: number, shape: ShapeClipType) {
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height);
    const radius = size / 2;
    
    ctx.beginPath();
    
    switch (shape) {
      case 'circle':
        // Use the smaller dimension to ensure it fits
        const circleRadius = Math.min(width, height) / 2;
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
        break;
        
      case 'rounded-square':
        const squareSize = Math.min(width, height);
        const x = (width - squareSize) / 2;
        const y = (height - squareSize) / 2;
        const cornerRadius = squareSize * 0.1; // 10% corner radius
        this.roundRect(ctx, x, y, squareSize, squareSize, cornerRadius);
        break;
        
      case 'heart':
        this.drawHeart(ctx, centerX, centerY, size * 0.45);
        break;
        
      case 'star':
        this.drawStar(ctx, centerX, centerY, 5, radius * 0.9, radius * 0.4);
        break;
        
      case 'hexagon':
        this.drawPolygon(ctx, centerX, centerY, 6, radius * 0.9);
        break;
        
      case 'diamond':
        this.drawDiamond(ctx, centerX, centerY, size * 0.8);
        break;
    }
    
    ctx.closePath();
  }
  
  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    const topY = y - size * 0.3;
    ctx.moveTo(x, topY + size);
    ctx.bezierCurveTo(x, topY, x - size / 2, topY - size / 2, x - size, topY);
    ctx.bezierCurveTo(x - size * 1.3, topY, x - size * 1.3, topY + size / 3, x - size * 1.3, topY + size / 3);
    ctx.bezierCurveTo(x - size * 1.3, topY + size * 0.55, x - size * 0.9, topY + size * 0.77, x, topY + size * 1.3);
    ctx.bezierCurveTo(x + size * 0.9, topY + size * 0.77, x + size * 1.3, topY + size * 0.55, x + size * 1.3, topY + size / 3);
    ctx.bezierCurveTo(x + size * 1.3, topY + size / 3, x + size * 1.3, topY, x + size, topY);
    ctx.bezierCurveTo(x + size / 2, topY - size / 2, x, topY, x, topY + size);
  }
  
  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
  }
  
  private drawPolygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, sides: number, radius: number) {
    const angle = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2; // Start from top
    
    for (let i = 0; i <= sides; i++) {
      const x = cx + radius * Math.cos(startAngle + i * angle);
      const y = cy + radius * Math.sin(startAngle + i * angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  }
  
  private drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const halfSize = size / 2;
    ctx.moveTo(cx, cy - halfSize); // Top
    ctx.lineTo(cx + halfSize, cy); // Right
    ctx.lineTo(cx, cy + halfSize); // Bottom
    ctx.lineTo(cx - halfSize, cy); // Left
    ctx.lineTo(cx, cy - halfSize); // Back to top
  }

  // Text functionality
  addText() {
    if (!this.currentImage() || !this.textInput) return;
    const canvas = this.canvasRef.nativeElement;
    
    // Create a new draggable text at the center of the canvas
    const newText: DraggableText = {
      id: `text-${Date.now()}-${Math.random()}`,
      text: this.textInput,
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: this.textFontSize,
      color: this.textColor,
      fontStyle: this.textFontStyle
    };
    
    this.draggableTexts.push(newText);
    this.renderAllObjectsToCanvas();
  }
  
  onTextMouseDown(event: MouseEvent, textId: string) {
    event.stopPropagation();
    const text = this.draggableTexts.find(t => t.id === textId);
    if (!text) return;
    
    this.selectedTextId = textId;
    this.selectedIconId = null; // Deselect icons
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
    const draggingText = this.draggableTexts.find(t => t.isDragging);
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
    this.draggableTexts.forEach(text => text.isDragging = false);
  }
  
  deleteSelectedText() {
    if (!this.selectedTextId) return;
    this.draggableTexts = this.draggableTexts.filter(t => t.id !== this.selectedTextId);
    this.selectedTextId = null;
    this.renderAllObjectsToCanvas();
  }
  
  updateSelectedTextSize() {
    if (!this.selectedTextId) return;
    const selectedText = this.draggableTexts.find(t => t.id === this.selectedTextId);
    if (selectedText) {
      selectedText.size = this.textFontSize;
      this.renderAllObjectsToCanvas();
    }
  }
  
  updateSelectedTextColor() {
    if (!this.selectedTextId) return;
    const selectedText = this.draggableTexts.find(t => t.id === this.selectedTextId);
    if (selectedText) {
      selectedText.color = this.textColor;
      this.renderAllObjectsToCanvas();
    }
  }
  
  updateSelectedTextStyle() {
    if (!this.selectedTextId) return;
    const selectedText = this.draggableTexts.find(t => t.id === this.selectedTextId);
    if (selectedText) {
      selectedText.fontStyle = this.textFontStyle;
      this.renderAllObjectsToCanvas();
    }
  }
  
  applyTexts() {
    if (!this.currentImage()) return;
    
    // Render all texts to the actual image data
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
    
    // Clear draggable texts after applying
    this.draggableTexts = [];
    this.selectedTextId = null;
  }

  // Icon/Emoji functionality
  addEmoji(emoji: string) {
    if (!this.currentImage()) return;
    const canvas = this.canvasRef.nativeElement;
    
    // Create a new draggable icon at the center of the canvas
    const newIcon: DraggableIcon = {
      id: `icon-${Date.now()}-${Math.random()}`,
      emoji: emoji,
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: this.iconSize
    };
    
    this.draggableIcons.push(newIcon);
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
    
    // Draw all watermarks first (so they appear behind other objects)
    this.draggableWatermarks.forEach(watermark => {
      ctx.save();
      ctx.globalAlpha = watermark.opacity;
      
      // Draw the watermark image
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
    this.draggableTexts.forEach(text => {
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
    this.draggableIcons.forEach(icon => {
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
  
  // Removed duplicate method - use renderAllObjectsToCanvas() directly
  
  onIconMouseDown(event: MouseEvent, iconId: string) {
    event.stopPropagation();
    const icon = this.draggableIcons.find(i => i.id === iconId);
    if (!icon) return;
    
    this.selectedIconId = iconId;
    this.selectedTextId = null; // Deselect text
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
    const draggingIcon = this.draggableIcons.find(i => i.isDragging);
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
    this.draggableIcons.forEach(icon => icon.isDragging = false);
  }
  
  deleteSelectedIcon() {
    if (!this.selectedIconId) return;
    this.draggableIcons = this.draggableIcons.filter(i => i.id !== this.selectedIconId);
    this.selectedIconId = null;
    this.renderAllObjectsToCanvas();
  }
  
  updateSelectedIconSize() {
    if (!this.selectedIconId) return;
    const selectedIcon = this.draggableIcons.find(i => i.id === this.selectedIconId);
    if (selectedIcon) {
      selectedIcon.size = this.iconSize;
      this.renderAllObjectsToCanvas();
    }
  }
  
  applyIcons() {
    if (!this.currentImage()) return;
    
    // Render all icons to the actual image data
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
    
    // Clear draggable icons after applying
    this.draggableIcons = [];
    this.selectedIconId = null;
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
    this.draggableIcons = [];
    this.draggableTexts = [];
    this.selectedIconId = null;
    this.selectedTextId = null;
  }

  // Filter functionality
  async applyInvert() {
    if (!this.currentImage()) return;
    try {
      // Manual invert using pixel manipulation
      const imgData = this.currentImage()!;
      const data = new Uint8ClampedArray(imgData.data);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];         // Red
        data[i + 1] = 255 - data[i + 1]; // Green
        data[i + 2] = 255 - data[i + 2]; // Blue
      }
      const inverted = new ImageData(data, imgData.width, imgData.height);
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
    
    this.loadingFilterPreviews.set(true);
    this.filterPreviewsGenerated = false; // Will be set to true when complete
    // Reset previews to show spinners
    this.filterPreviews.set({});
    
    try {
      // Create a smaller version of the image for previews (max 150px for faster processing)
      const imgData = this.currentImage()!;
      const maxSize = 150; // Reduced from 200 for faster generation
      const scale = Math.min(maxSize / imgData.width, maxSize / imgData.height, 1);
      const previewWidth = Math.floor(imgData.width * scale);
      const previewHeight = Math.floor(imgData.height * scale);
      
      // Create scaled down version ONCE
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgData.width;
      tempCanvas.height = imgData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imgData, 0, 0);
      
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = previewWidth;
      scaledCanvas.height = previewHeight;
      const scaledCtx = scaledCanvas.getContext('2d')!;
      scaledCtx.drawImage(tempCanvas, 0, 0, previewWidth, previewHeight);
      
      const scaledImageData = scaledCtx.getImageData(0, 0, previewWidth, previewHeight);
      const originalDataURL = scaledCanvas.toDataURL('image/png'); // Cache original preview
      
      // Generate ALL previews in parallel using Promise.allSettled
      const previewPromises = this.filterList.map(async (filter) => {
        try {
          let previewData: ImageData;
          
          if (filter.method === 'none') {
            // Original - just return cached data URL
            return { filterId: filter.id, dataURL: originalDataURL };
          } else {
            // Use PhotonService.filter() for all filters
            try {
              previewData = await this.photonService.filter(
                new ImageData(
                  scaledImageData.data.slice(), // Only slice when needed
                  scaledImageData.width,
                  scaledImageData.height
                ),
                filter.method
              );
            } catch (error) {
              console.error(`Failed to generate preview for ${filter.name}:`, error);
              // Use original as fallback
              return { filterId: filter.id, dataURL: originalDataURL };
            }
          }
          
          // Convert to data URL
          const previewCanvas = document.createElement('canvas');
          previewCanvas.width = previewData.width;
          previewCanvas.height = previewData.height;
          const previewCtx = previewCanvas.getContext('2d')!;
          previewCtx.putImageData(previewData, 0, 0);
          
          return { filterId: filter.id, dataURL: previewCanvas.toDataURL('image/png') };
        } catch (e) {
          console.error(`Failed to generate preview for ${filter.name}:`, e);
          // Use original as fallback
          return { filterId: filter.id, dataURL: originalDataURL };
        }
      });
      
      // Wait for all previews to complete
      const results = await Promise.allSettled(previewPromises);
      
      // Build the previews object from results
      const newPreviews: { [key: string]: string } = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { filterId, dataURL } = result.value;
          newPreviews[filterId] = dataURL;
        } else {
          // Fallback to original on error
          const filter = this.filterList[index];
          newPreviews[filter.id] = originalDataURL;
        }
      });
      
      // Update all previews at once (single signal update)
      this.filterPreviews.set(newPreviews);
      
      // Mark as generated to prevent re-generation
      this.filterPreviewsGenerated = true;
    } catch (e) {
      this.error.set('Failed to generate filter previews');
      this.filterPreviewsGenerated = false; // Allow retry on error
    } finally {
      this.loadingFilterPreviews.set(false);
    }
  }

  async applyFilterFromPreview(filter: FilterDefinition) {
    if (!this.currentImage()) return;
    
    // If clicking the same filter that's already active, do nothing
    if (filter.id === this.activeFilterId()) {
      return;
    }
    
    // Always reset to original image first (enforces one filter at a time)
    if (this.originalImage) {
      this.currentImage.set(new ImageData(
        this.originalImage.data.slice(),
        this.originalImage.width,
        this.originalImage.height
      ));
    }
    
    if (filter.method === 'none') {
      // Just reset to original (already done above)
      this.activeFilterId.set('original');
      this.saveToHistory();
      return;
    }
    
    // Apply filter using PhotonService
    this.error.set(null);
    try {
      const processed = await this.photonService.filter(this.currentImage()!, filter.method);
      this.currentImage.set(processed);
      this.saveToHistory();
      
      // Set this filter as active after successful application
      this.activeFilterId.set(filter.id);
    } catch (e) {
      this.error.set(`Failed to apply filter: ${e instanceof Error ? e.message : 'Unknown error'}`);
      // Reset to original on error
      this.activeFilterId.set('original');
    }
  }

  /**
   * Apply all tuning adjustments cumulatively.
   * This ensures that when you switch between adjustments (brightness, saturation, etc.),
   * all previous adjustments are preserved. The adjustments are applied in a specific order
   * to the original image to avoid cumulative degradation.
   * 
   * Order: Opacity → Brightness → Contrast → Saturation → Hue → Sharpen → Denoise
   */
  async applyAllTuningAdjustments() {
    if (!this.originalImage) return;
    
    try {
      // Start from original image (optimized copy)
      let imgData = this.originalImage;
      let data = imgData.data.slice();
      
      // 1. Apply Opacity (0-10 scale, where 10 = 100% opaque)
      if (this.opacity !== 10) {
        const alpha = this.opacity / 10;
        for (let i = 0; i < data.length; i += 4) {
          data[i + 3] = Math.round(data[i + 3] * alpha);
        }
      }
      
      // 2. Apply Brightness (0-10 scale, where 5 = neutral)
      // Convert: 0 = -50, 5 = 0, 10 = +50 (10 units per step)
      // Industry standard range prevents extreme over/under exposure
      if (this.brightness !== 5) {
        const brightnessValue = (this.brightness - 5) * 10;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, data[i] + brightnessValue));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightnessValue));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightnessValue));
        }
      }
      
      // 3. Apply Contrast (0-10 scale, where 5 = neutral)
      // Convert: 0 = -50, 5 = 0, 10 = +50 (10 units per step)
      // Industry standard range prevents extreme posterization
      if (this.contrast !== 5) {
        const contrastValue = (this.contrast - 5) * 10;
        const factor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
          data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }
      }
      
      // Create intermediate image data for photon effects
      let currentData = new ImageData(data, imgData.width, imgData.height);
      
      // 4. Apply Saturation/Desaturation (0-10 scale, where 5 = neutral)
      // Convert: 0 = -1.0 (full desaturate), 5 = 0 (no change), 10 = +1.0 (full saturate)
      if (this.saturation > 5) {
        // Saturate: convert 6-10 to 0.2-1.0 (0.2 per step)
        const saturationLevel = (this.saturation - 5) * 0.2;
        currentData = await this.photonService.saturate_hsl(currentData, saturationLevel);
      } else if (this.saturation < 5) {
        // Desaturate: convert 0-4 to 1.0-0.2 (0.2 per step)
        const desaturationLevel = (5 - this.saturation) * 0.2;
        currentData = await this.photonService.desaturate_hsl(currentData, desaturationLevel);
      }
      
      // 5. Apply Hue Rotation (0-10 scale, where 5 = neutral)
      // Convert: 0 = -180°, 5 = 0°, 10 = +180° (36 degrees per step)
      // Industry standard range for color adjustments
      if (this.hueRotation !== 5) {
        const hueValue = (this.hueRotation - 5) * 36;
        currentData = await this.photonService.hue_rotate_hsl(currentData, hueValue);
      }
      
      // 6. Apply Sharpen (0-10 scale)
      // Map to 0-3 iterations max to prevent over-sharpening
      // 0-3: 0 iterations, 4-6: 1 iteration, 7-9: 2 iterations, 10: 3 iterations
      if (this.sharpenIntensity > 0) {
        const iterations = Math.floor(this.sharpenIntensity / 3.33);
        for (let i = 0; i < iterations; i++) {
          currentData = await this.photonService.sharpen(currentData);
        }
      }
      
      // 7. Apply Noise Reduction (0-10 scale)
      // Map to 0-3 iterations max to prevent excessive blur
      // 0-3: 0 iterations, 4-6: 1 iteration, 7-9: 2 iterations, 10: 3 iterations
      if (this.noiseIntensity > 0) {
        const iterations = Math.floor(this.noiseIntensity / 3.33);
        for (let i = 0; i < iterations; i++) {
          currentData = await this.photonService.noise_reduction(currentData);
        }
      }
      
      this.currentImage.set(currentData);
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



  async applyCornerRadius() {
    if (!this.currentImage() || this.cornerRadius === 0) return;
    try {
      const imgData = this.currentImage()!;
      const canvas = document.createElement('canvas');
      canvas.width = imgData.width;
      canvas.height = imgData.height;
      const ctx = canvas.getContext('2d')!;
      
      // First, draw the original image to a temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgData.width;
      tempCanvas.height = imgData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imgData, 0, 0);
      
      // Calculate radius as percentage of smaller dimension
      const smallerDimension = Math.min(imgData.width, imgData.height);
      const radiusInPixels = (this.cornerRadius / 100) * (smallerDimension / 2);
      
      // Now create the rounded rectangle clip path and draw the image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      this.roundRect(ctx, 0, 0, canvas.width, canvas.height, radiusInPixels);
      ctx.closePath();
      ctx.clip();
      
      // Draw the image from temp canvas (not putImageData)
      ctx.drawImage(tempCanvas, 0, 0);
      
      const rounded = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.currentImage.set(rounded);
      this.saveToHistory();
    } catch (e) {
      this.error.set('Failed to apply corner radius');
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
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
  
  addWatermark(image: HTMLImageElement) {
    if (!this.currentImage()) return;
    const canvas = this.canvasRef.nativeElement;
    
    // Calculate watermark dimensions maintaining aspect ratio
    const aspectRatio = image.width / image.height;
    const width = this.watermarkSize;
    const height = width / aspectRatio;
    
    // Create a new draggable watermark at the center of the canvas
    const newWatermark: DraggableWatermark = {
      id: `watermark-${Date.now()}-${Math.random()}`,
      image: image,
      x: canvas.width / 2,
      y: canvas.height / 2,
      width: width,
      height: height,
      opacity: this.watermarkOpacity / 100
    };
    
    this.draggableWatermarks.push(newWatermark);
    this.renderAllObjectsToCanvas();
  }
  
  onWatermarkMouseDown(event: MouseEvent, watermarkId: string) {
    event.stopPropagation();
    const watermark = this.draggableWatermarks.find(wm => wm.id === watermarkId);
    if (!watermark) return;
    
    this.selectedWatermarkId = watermarkId;
    this.selectedIconId = null; // Deselect icons
    this.selectedTextId = null; // Deselect text
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
    const draggingWatermark = this.draggableWatermarks.find(wm => wm.isDragging);
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
    this.draggableWatermarks.forEach(wm => wm.isDragging = false);
  }
  
  deleteSelectedWatermark() {
    if (!this.selectedWatermarkId) return;
    this.draggableWatermarks = this.draggableWatermarks.filter(wm => wm.id !== this.selectedWatermarkId);
    this.selectedWatermarkId = null;
    this.renderAllObjectsToCanvas();
  }
  
  updateSelectedWatermarkSize() {
    if (!this.selectedWatermarkId) return;
    const selectedWatermark = this.draggableWatermarks.find(wm => wm.id === this.selectedWatermarkId);
    if (selectedWatermark) {
      const aspectRatio = selectedWatermark.image.width / selectedWatermark.image.height;
      selectedWatermark.width = this.watermarkSize;
      selectedWatermark.height = this.watermarkSize / aspectRatio;
      this.renderAllObjectsToCanvas();
    }
  }
  
  updateSelectedWatermarkOpacity() {
    if (!this.selectedWatermarkId) return;
    const selectedWatermark = this.draggableWatermarks.find(wm => wm.id === this.selectedWatermarkId);
    if (selectedWatermark) {
      selectedWatermark.opacity = this.watermarkOpacity / 100;
      this.renderAllObjectsToCanvas();
    }
  }
  
  applyWatermarks() {
    if (!this.currentImage()) return;
    
    // Render all watermarks to the actual image data
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    const newImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImage.set(newImage);
    this.saveToHistory();
    
    // Clear draggable watermarks after applying
    this.draggableWatermarks = [];
    this.selectedWatermarkId = null;
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
      const clickedWatermark = this.draggableWatermarks.find(watermark => {
        const halfWidth = watermark.width / 2;
        const halfHeight = watermark.height / 2;
        return x >= watermark.x - halfWidth && x <= watermark.x + halfWidth &&
               y >= watermark.y - halfHeight && y <= watermark.y + halfHeight;
      });
      
      if (clickedWatermark) {
        this.onWatermarkMouseDown(event, clickedWatermark.id);
        return;
      }
    }
    
    // Check if clicking on a text
    if (this.activeTool() === 'text') {
      const clickedText = this.draggableTexts.find(text => {
        const canvas = this.canvasRef.nativeElement;
        const ctx = canvas.getContext('2d')!;
        ctx.font = `${text.fontStyle} ${text.size}px Arial`;
        const metrics = ctx.measureText(text.text);
        const halfWidth = metrics.width / 2;
        const halfHeight = text.size / 2;
        return x >= text.x - halfWidth && x <= text.x + halfWidth &&
               y >= text.y - halfHeight && y <= text.y + halfHeight;
      });
      
      if (clickedText) {
        this.onTextMouseDown(event, clickedText.id);
        return;
      }
    }
    
    // Check if clicking on an icon
    if (this.activeTool() === 'icon') {
      const clickedIcon = this.draggableIcons.find(icon => {
        const halfSize = icon.size / 2;
        return x >= icon.x - halfSize && x <= icon.x + halfSize &&
               y >= icon.y - halfSize && y <= icon.y + halfSize;
      });
      
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
    if (this.draggableIcons.length > 0 || this.draggableTexts.length > 0 || this.draggableWatermarks.length > 0) {
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

  // Helper method for transformations
  private transformImage(transformFn: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, imgData: ImageData) => void) {
    if (!this.currentImage()) return;
    
    try {
      const imgData = this.currentImage()!;
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = imgData.width;
      sourceCanvas.height = imgData.height;
      const sourceCtx = sourceCanvas.getContext('2d')!;
      sourceCtx.putImageData(imgData, 0, 0);
      
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = imgData.width;
      targetCanvas.height = imgData.height;
      const targetCtx = targetCanvas.getContext('2d')!;
      
      transformFn(targetCtx, sourceCanvas, imgData);
      
      const transformed = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      this.currentImage.set(transformed);
      this.saveToHistory();
    } catch (e) {
      this.error.set('Failed to apply transformation');
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
