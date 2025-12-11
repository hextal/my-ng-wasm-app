import { Component, signal, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PhotonService } from '../../core/services/photon.service';

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

type Tool = 'select' | 'crop' | 'flip' | 'rotate' | 'draw' | 'shape' | 'icon' | 'text' | 'watermark' | 'filter' | 'corner';

@Component({
  selector: 'app-image-editor',
  standalone: true,
  imports: [FormsModule],
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

  // Tool state
  activeTool = signal<Tool>('select');
  selectedObject = signal<DrawingObject | null>(null);

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

  // Draggable text
  draggableTexts: DraggableText[] = [];
  selectedTextId: string | null = null;

  // Filter settings
  brightness: number = 0;
  contrast: number = 0;
  saturation: number = 0;
  hueRotation: number = 0;
  cornerRadius: number = 0;
  opacity: number = 100;

  // Watermark settings
  draggableWatermarks: DraggableWatermark[] = [];
  selectedWatermarkId: string | null = null;
  watermarkOpacity: number = 50;
  watermarkSize: number = 200;

  // Zoom settings
  zoomLevel = signal<number>(1);

  // Expose Math for template
  Math = Math;

  constructor(private photonService: PhotonService) {
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
    
    // Initialize photon-wasm on startup
    this.photonService.initialize().catch(() => {
      this.error.set('Failed to initialize image editor');
    });
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
  
  private deleteSelectedObject() {
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

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.error.set(null);
    this.loading.set(true);
    try {
      const img = await this.loadImage(file);
      
      // Save original for reset
      this.originalImage = new ImageData(
        new Uint8ClampedArray(img.data),
        img.width,
        img.height
      );
      
      // Set current and initialize history
      this.currentImage.set(img);
      this.history = [img];
      this.historyIndex = 0;
    } catch (e) {
      this.error.set('Failed to load image');
    } finally {
      this.loading.set(false);
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
    this.processing.set(true);
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
    } finally {
      this.processing.set(false);
    }
  }

  async applyEffect(effect: 'grayscale' | 'sepia' | 'blur') {
    return this.applyPhotonEffect(effect);
  }



  downloadImage() {
    if (!this.currentImage()) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited-image.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  }

  // Tool management
  setActiveTool(tool: Tool) {
    this.activeTool.set(tool);
    if (tool === 'crop') {
      this.startCrop();
    }
  }

  // History management
  saveToHistory() {
    const current = this.currentImage();
    if (!current) return;
    
    // Remove any history after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add current state
    const copy = new ImageData(
      new Uint8ClampedArray(current.data),
      current.width,
      current.height
    );
    this.history.push(copy);
    this.historyIndex++;
    
    // Limit history to 50 states
    if (this.history.length > 50) {
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
    const copy = new ImageData(
      new Uint8ClampedArray(state.data),
      state.width,
      state.height
    );
    this.currentImage.set(copy);
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    const copy = new ImageData(
      new Uint8ClampedArray(state.data),
      state.width,
      state.height
    );
    this.currentImage.set(copy);
  }

  resetImage() {
    if (!this.originalImage) return;
    const copy = new ImageData(
      new Uint8ClampedArray(this.originalImage.data),
      this.originalImage.width,
      this.originalImage.height
    );
    this.currentImage.set(copy);
    this.saveToHistory();
  }

  generateImage() {
    this.loading.set(true);
    this.error.set(null);
    
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
      
      // Save original for reset
      this.originalImage = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
      
      // Set current and initialize history
      this.currentImage.set(imageData);
      this.history = [imageData];
      this.historyIndex = 0;
    } catch (error) {
      this.error.set('Failed to generate image');
    } finally {
      this.loading.set(false);
    }
  }

  deleteObject() {
    // Placeholder for object deletion
    this.selectedObject.set(null);
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
    
    this.processing.set(true);
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
        this.processing.set(false);
        return;
      }
      
      // Clamp values to image bounds
      const clampedX = Math.max(0, Math.min(x, imgData.width - 1));
      const clampedY = Math.max(0, Math.min(y, imgData.height - 1));
      const clampedWidth = Math.min(width, imgData.width - clampedX);
      const clampedHeight = Math.min(height, imgData.height - clampedY);
      
      if (clampedWidth <= 0 || clampedHeight <= 0) {
        this.error.set('Crop area is outside image bounds');
        this.processing.set(false);
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
    } finally {
      this.processing.set(false);
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
    this.processing.set(true);
    
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
    } finally {
      this.processing.set(false);
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
    this.renderTextAndIconsToCanvas();
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
    
    this.renderTextAndIconsToCanvas();
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
    
    this.renderTextAndIconsToCanvas();
  }
  
  onTextMouseUp(event: MouseEvent) {
    this.draggableTexts.forEach(text => text.isDragging = false);
  }
  
  deleteSelectedText() {
    if (!this.selectedTextId) return;
    this.draggableTexts = this.draggableTexts.filter(t => t.id !== this.selectedTextId);
    this.selectedTextId = null;
    this.renderTextAndIconsToCanvas();
  }
  
  updateSelectedTextSize() {
    if (!this.selectedTextId) return;
    const selectedText = this.draggableTexts.find(t => t.id === this.selectedTextId);
    if (selectedText) {
      selectedText.size = this.textFontSize;
      this.renderTextAndIconsToCanvas();
    }
  }
  
  updateSelectedTextColor() {
    if (!this.selectedTextId) return;
    const selectedText = this.draggableTexts.find(t => t.id === this.selectedTextId);
    if (selectedText) {
      selectedText.color = this.textColor;
      this.renderTextAndIconsToCanvas();
    }
  }
  
  updateSelectedTextStyle() {
    if (!this.selectedTextId) return;
    const selectedText = this.draggableTexts.find(t => t.id === this.selectedTextId);
    if (selectedText) {
      selectedText.fontStyle = this.textFontStyle;
      this.renderTextAndIconsToCanvas();
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
    this.renderTextAndIconsToCanvas();
  }
  
  renderTextAndIconsToCanvas() {
    this.renderAllObjectsToCanvas();
  }
  
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
  
  // Renamed from renderIconsToCanvas for backward compatibility
  renderIconsToCanvas() {
    this.renderAllObjectsToCanvas();
  }
  
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
    
    this.renderTextAndIconsToCanvas();
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
    
    this.renderTextAndIconsToCanvas();
  }
  
  onIconMouseUp(event: MouseEvent) {
    this.draggableIcons.forEach(icon => icon.isDragging = false);
  }
  
  deleteSelectedIcon() {
    if (!this.selectedIconId) return;
    this.draggableIcons = this.draggableIcons.filter(i => i.id !== this.selectedIconId);
    this.selectedIconId = null;
    this.renderTextAndIconsToCanvas();
  }
  
  updateSelectedIconSize() {
    if (!this.selectedIconId) return;
    const selectedIcon = this.draggableIcons.find(i => i.id === this.selectedIconId);
    if (selectedIcon) {
      selectedIcon.size = this.iconSize;
      this.renderTextAndIconsToCanvas();
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
    this.processing.set(true);
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
    } finally {
      this.processing.set(false);
    }
  }

  async applySharpen() {
    return this.applyPhotonEffect('sharpen');
  }

  async applyEmboss() {
    return this.applyPhotonEffect('emboss');
  }

  async applyEdgeDetection() {
    return this.applyPhotonEffect('edge_detection');
  }

  async applySolarize() {
    return this.applyPhotonEffect('solarize');
  }

  async applyPrimary() {
    return this.applyPhotonEffect('primary');
  }

  async applyColorize() {
    return this.applyPhotonEffect('colorize');
  }

  async applyHalftone() {
    return this.applyPhotonEffect('halftone');
  }

  async applyGaussianBlur() {
    return this.applyPhotonEffect('gaussian_blur');
  }

  async applyNoiseReduction() {
    return this.applyPhotonEffect('noise_reduction');
  }

  async applyBrightness() {
    if (!this.originalImage || this.brightness === 0) {
      if (this.originalImage && this.brightness === 0) {
        this.currentImage.set(new ImageData(
          new Uint8ClampedArray(this.originalImage.data),
          this.originalImage.width,
          this.originalImage.height
        ));
      }
      return;
    }
    
    this.processing.set(true);
    try {
      // Always work from original image to avoid cumulative effects
      const imgData = this.originalImage;
      const data = new Uint8ClampedArray(imgData.data);
      const factor = this.brightness;
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + factor));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + factor));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + factor));
      }
      
      const adjusted = new ImageData(data, imgData.width, imgData.height);
      this.currentImage.set(adjusted);
      this.saveToHistory();
    } catch (error) {
      this.error.set('Failed to adjust brightness');
    } finally {
      this.processing.set(false);
    }
  }

  async applyContrast() {
    if (!this.currentImage() || this.contrast === 0) return;
    this.processing.set(true);
    try {
      const imgData = this.currentImage()!;
      const data = new Uint8ClampedArray(imgData.data);
      const factor = (259 * (this.contrast + 255)) / (255 * (259 - this.contrast));
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }
      
      const adjusted = new ImageData(data, imgData.width, imgData.height);
      this.currentImage.set(adjusted);
    } finally {
      this.processing.set(false);
    }
  }

  async applySaturation() {
    if (!this.currentImage() || this.saturation === 0) return;
    return this.applyPhotonEffect('saturate_hsl', this.saturation);
  }

  async applyHueRotation() {
    if (!this.currentImage() || this.hueRotation === 0) return;
    return this.applyPhotonEffect('hue_rotate_hsl', this.hueRotation);
  }

  async applyOpacity() {
    if (!this.originalImage || this.opacity === 100) {
      if (this.originalImage && this.opacity === 100) {
        this.currentImage.set(new ImageData(
          new Uint8ClampedArray(this.originalImage.data),
          this.originalImage.width,
          this.originalImage.height
        ));
      }
      return;
    }
    
    this.processing.set(true);
    try {
      // Always work from original image to avoid cumulative effects
      const imgData = this.originalImage;
      const data = new Uint8ClampedArray(imgData.data);
      const alpha = this.opacity / 100;
      
      for (let i = 0; i < data.length; i += 4) {
        // Multiply the alpha channel by the opacity percentage
        data[i + 3] = Math.round(data[i + 3] * alpha);
      }
      
      const adjusted = new ImageData(data, imgData.width, imgData.height);
      this.currentImage.set(adjusted);
      this.saveToHistory();
    } catch (error) {
      this.error.set('Failed to adjust opacity');
    } finally {
      this.processing.set(false);
    }
  }

  async applyCornerRadius() {
    if (!this.currentImage() || this.cornerRadius === 0) return;
    this.processing.set(true);
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
    } finally {
      this.processing.set(false);
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
  zoomIn() {
    this.zoomLevel.set(Math.min(3, this.zoomLevel() + 0.1));
  }

  zoomOut() {
    this.zoomLevel.set(Math.max(0.1, this.zoomLevel() - 0.1));
  }

  onZoomChange() {
    this.applyZoom();
  }

  private applyZoom() {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const zoom = this.zoomLevel();
    canvas.style.transform = `scale(${zoom})`;
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
    this.processing.set(true);
    
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
    } finally {
      this.processing.set(false);
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
