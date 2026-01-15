import { Component, ViewChild, ElementRef, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasHostComponent } from './components/canvas-host/canvas-host.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { SubmenuPanel } from './components/submenu-panel/submenu-panel';
import { FabricCanvasService } from './services/fabric-canvas.service';
import { PhotonService } from '../core/services/photon.service';
import { MagickService } from '../core/services/magick.service';
import { FileUtilityService } from '../core/services/file-utility.service';
import { FilterService } from '../core/services/filter.service';
import { FilterPreviewService } from '../core/services/filter-preview.service';
import { CanvasUtilityService } from '../core/services/canvas-utility.service';
import { DocumentStoreService } from './services/document-store.service';
import { HistoryService } from './services/history.service';
import { AssetStoreService } from './services/asset-store.service';
import { ImageObject } from './core/models/document.model';

/**
 * EditorComponent - Main editor container
 * Integrates canvas, toolbar, and handles file input
 */
@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, CanvasHostComponent, ToolbarComponent, SubmenuPanel],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  
  hasImage = false;
  activeTool = signal<string>('select');
  
  // Track original file info for export
  private originalFileName = 'edited-image';
  private originalFormat = 'png';
  
  // Track uploaded blob for filter preview generation
  private lastUploadedBlob: Blob | null = null;

  constructor(
    private fabricCanvas: FabricCanvasService,
    private photonService: PhotonService,
    private magickService: MagickService,
    private fileUtility: FileUtilityService,
    private filterService: FilterService,
    private filterPreview: FilterPreviewService,
    private canvasUtil: CanvasUtilityService,
    private documentStore: DocumentStoreService,
    private history: HistoryService,
    private assetStore: AssetStoreService
  ) {
    // Subscribe to document changes to track if image exists
    this.documentStore.objects$.subscribe(objects => {
      this.hasImage = objects.some(obj => obj.type === 'image');
    });

    // Watch for selection changes and regenerate previews for the selected image
    effect(async () => {
      const selectedId = this.documentStore.selectedObjectId();
      
      if (!selectedId) {
        return;
      }

      const obj = this.documentStore.getObject(selectedId);
      if (!obj || obj.type !== 'image') {
        return;
      }

      const imageObj = obj as ImageObject;
      
      // Use originalAssetId if available, otherwise use current assetId
      const assetId = imageObj.originalAssetId || imageObj.assetId;
      
      // Check if we already have cached previews for this asset
      if (this.filterPreview.hasCachedPreviews(assetId)) {
        this.filterPreview.loadCachedPreviews(assetId);
        return;
      }

      // Generate new previews for this image
      try {
        await this.filterPreview.generatePreviewsFromAssetId(assetId);
      } catch (error) {
        console.error('[EditorComponent] Failed to generate previews for selected image:', error);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Initialize Photon WASM in the background
    try {
      await this.photonService.initialize();
    } catch (error) {
      console.error('Failed to initialize Photon:', error);
    }

    // Initialize ImageMagick WASM in the background
    try {
      await this.magickService.initialize();
    } catch (error) {
      console.error('Failed to initialize ImageMagick:', error);
    }
  }

  onImportImage(): void {
    this.fileInputRef.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Get file extension to validate image format
    const extension = this.fileUtility.getFileExtension(file.name).toLowerCase();
    const validImageExtensions = [
      'png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp', 'tiff', 'tif',
      'heic', 'heif', 'avif', 'ico', 'svg'
    ];
    
    // Validate file type - check both MIME type and extension
    if (!file.type.startsWith('image/') && !validImageExtensions.includes(extension)) {
      alert('Please select an image file');
      return;
    }

    // Store original file info for export
    this.originalFileName = this.fileUtility.getFileNameWithoutExtension(file.name);
    this.originalFormat = extension;

    try {
      // Wait for canvas to be ready (max 5 seconds)
      const maxAttempts = 50;
      let attempts = 0;
      while (!this.fabricCanvas.isCanvasReady() && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!this.fabricCanvas.isCanvasReady()) {
        throw new Error('Canvas initialization timeout');
      }
      
      // Check if format needs conversion to PNG for editing
      const needsConversion = !this.magickService.isPhotonCompatible(extension);
      
      let finalBlob: Blob;
      
      if (needsConversion) {
        console.log(`Converting ${extension.toUpperCase()} to PNG for editing...`);
        
        // Convert to Uint8Array
        const imageData = await this.fileUtility.fileToUint8Array(file);
        
        // Convert to PNG using ImageMagick
        const convertedData = await this.magickService.convertFormat(
          imageData,
          extension,
          'png'
        );
        
        // Create PNG blob
        finalBlob = this.fileUtility.uint8ArrayToBlob(convertedData, 'image/png');
        console.log(`Successfully converted ${extension.toUpperCase()} to PNG`);
      } else {
        // Use original blob for compatible formats
        finalBlob = new Blob([await file.arrayBuffer()], { type: file.type });
      }
      
      // Store blob for filter preview generation
      this.lastUploadedBlob = finalBlob;
      
      // Add to canvas
      await this.fabricCanvas.addImageFromBlob(finalBlob);
      
      // Generate filter previews in background
      setTimeout(async () => {
        // Get the asset ID from the added image
        const objects = this.documentStore.getSnapshot().objects;
        const lastImage = objects.filter(obj => obj.type === 'image').pop() as ImageObject | undefined;
        const assetId = lastImage?.assetId;
        
        if (assetId) {
          try {
            await this.filterPreview.generatePreviewsFromBlob(finalBlob, assetId);
          } catch (error) {
            console.error('[EditorComponent] Failed to generate previews in background:', error);
          }
        }
      }, 0);
    } catch (error) {
      console.error('Failed to import image:', error);
      alert(`Failed to import image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset input
    input.value = '';
  }

  onReset(): void {
    if (confirm('Are you sure you want to clear the canvas?')) {
      this.fabricCanvas.clear();
      // Reset original file info
      this.originalFileName = 'edited-image';
      this.originalFormat = 'png';
      // Clear filter previews
      this.filterPreview.clearPreviews();
      this.lastUploadedBlob = null;
    }
  }

  /**
   * Called when a tool is activated
   * Generates filter previews if the filters tool is selected and previews don't exist
   */
  async onToolChange(tool: string): Promise<void> {
    console.log(`[EditorComponent] Tool changed to: ${tool}`);
    this.activeTool.set(tool);
    
    // If switching to filters tool and we have an uploaded image but no previews
    if (tool === 'filters') {
      console.log('[EditorComponent] Filters tool activated');
      console.log('[EditorComponent] Has blob:', !!this.lastUploadedBlob);
      console.log('[EditorComponent] Has previews:', this.hasPreviews());
      console.log('[EditorComponent] Preview count:', Object.keys(this.filterService.getPreviews()()).length);
      
      if (this.lastUploadedBlob && !this.hasPreviews()) {
        console.log('[EditorComponent] → Generating previews now...');
        try {
          await this.filterPreview.generatePreviewsFromBlob(this.lastUploadedBlob);
        } catch (error) {
          console.error('[EditorComponent] Failed to generate previews:', error);
        }
      } else if (!this.lastUploadedBlob) {
        console.warn('[EditorComponent] → Cannot generate previews: No blob available');
      } else if (this.hasPreviews()) {
        console.log('[EditorComponent] → Previews already exist, skipping generation');
      }
    }
  }

  /**
   * Check if filter previews exist
   */
  private hasPreviews(): boolean {
    return this.filterPreview.hasPreviewsGenerated();
  }

  async onDownload(): Promise<void> {
    const canvas = this.fabricCanvas.getCanvas();
    if (!canvas) {
      alert('No canvas to download');
      return;
    }

    try {
      // Export canvas as PNG (high quality)
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1,
      });

      // Convert data URL to Blob
      const response = await fetch(dataURL);
      const pngBlob = await response.blob();
      
      // Check if we need to convert to original format
      const targetFormat = this.originalFormat;
      const compatibleOutputFormats = this.magickService.getCompatibleOutputFormats(targetFormat);
      
      // If original format is in compatible list and not already PNG, convert it
      if (compatibleOutputFormats.includes(targetFormat) && targetFormat !== 'png') {
        console.log(`Converting PNG back to ${targetFormat.toUpperCase()} for download...`);
        
        // Convert PNG blob to Uint8Array
        const pngData = await this.fileUtility.fileToUint8Array(
          new File([pngBlob], 'temp.png', { type: 'image/png' })
        );
        
        // Convert to target format
        const convertedData = await this.magickService.convertFormat(
          pngData,
          'png',
          targetFormat
        );
        
        // Create blob with target format
        const finalBlob = this.fileUtility.uint8ArrayToBlob(
          convertedData,
          this.fileUtility.getMimeType(targetFormat)
        );
        
        // Download converted file
        const url = this.canvasUtil.createObjectURL(finalBlob);
        const link = this.canvasUtil.createDownloadLink(`${this.originalFileName}.${targetFormat}`, url);
        this.canvasUtil.triggerDownload(link);
        this.canvasUtil.revokeObjectURL(url);
        
        console.log(`Successfully converted to ${targetFormat.toUpperCase()}`);
      } else {
        // Download as PNG (original was PNG or format not supported for output)
        const link = this.canvasUtil.createDownloadLink(`${this.originalFileName}.png`, dataURL);
        this.canvasUtil.triggerDownload(link);
      }
    } catch (error) {
      console.error('Failed to download image:', error);
      alert(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  onUndo(): void {
    this.history.undo();
  }

  onRedo(): void {
    this.history.redo();
  }
}
