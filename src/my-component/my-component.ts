import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-component',
  imports: [CommonModule],
  template: `<canvas #canvas></canvas><input type="file" #fileInput />`,
  styles: [``],
})
export class MyComponent implements OnInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;

  protected photon: any = null;
  protected originalImageData: any = null;
  protected currentImageData: any = null;
  protected isLoading = signal(true);
  protected errorMessage = signal('');
  protected imageLoaded = signal(false);
  protected activeTab = signal('filters');

  async ngOnInit() {
    try {
      // Initialize photon-wasm
      const photonModule = await import('photon-wasm');
      
      // Initialize WASM module with the WASM file path
      const wasmPath = new URL('photon-wasm/dist/photon_bg.wasm', import.meta.url);
      await photonModule.initWasm(fetch(wasmPath));
      
      this.photon = photonModule;
      this.isLoading.set(false);
    } catch (error) {
      this.errorMessage.set('Failed to load image editor');
      this.isLoading.set(false);
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.loadImage(input.files[0]);
    }
  }

  loadImage(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.drawImageOnCanvas(img);
        this.imageLoaded.set(true);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  drawImageOnCanvas(img: HTMLImageElement) {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to image size
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw the image
    ctx?.drawImage(img, 0, 0);
    
    // Store the original image data
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    if (imageData) {
      this.originalImageData = new this.photon.PhotonImage(new Uint8Array(imageData.data), imageData.width, imageData.height);
      this.currentImageData = new this.photon.PhotonImage(new Uint8Array(imageData.data), imageData.width, imageData.height);
    }
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
  }

  // Helper method to apply any effect
  private applyEffect(effectFn: (img: any) => void) {
    if (!this.currentImageData) return;
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return;
    
    const photonImage = new this.photon.PhotonImage(new Uint8Array(imageData.data), imageData.width, imageData.height);
    effectFn(photonImage);
    ctx?.putImageData(photonImage.get_image_data(), 0, 0);
  }

  // COLOR FILTERS - using filter() function with filter names
  applyGrayscale() { this.applyEffect((img) => this.photon.grayscale(img)); }
  applySepia() { this.applyEffect((img) => this.photon.sepia(img)); }
  applyInvert() { this.applyEffect((img) => this.photon.invert(img)); }
  applyGolden() { this.applyEffect((img) => this.photon.golden(img)); }
  applyPastelPink() { this.applyEffect((img) => this.photon.pastel_pink(img)); }
  applyLofi() { this.applyEffect((img) => this.photon.lofi(img)); }
  applyFirenze() { this.applyEffect((img) => this.photon.firenze(img)); }
  applyObsidian() { this.applyEffect((img) => this.photon.obsidian(img)); }
  applyCali() { this.applyEffect((img) => this.photon.cali(img)); }
  applyDramatic() { this.applyEffect((img) => this.photon.dramatic(img)); }
  
  // More filters using filter() function
  applyOceanic() { this.applyEffect((img) => this.photon.filter(img, "oceanic")); }
  applyIslands() { this.applyEffect((img) => this.photon.filter(img, "islands")); }
  applyMarine() { this.applyEffect((img) => this.photon.filter(img, "marine")); }
  applyVintage() { this.applyEffect((img) => this.photon.filter(img, "vintage")); }
  applyPerfume() { this.applyEffect((img) => this.photon.filter(img, "perfume")); }

  // Solarize filters
  applyLix() { this.applyEffect((img) => this.photon.lix(img)); }
  applyNeue() { this.applyEffect((img) => this.photon.neue(img)); }
  applyRyo() { this.applyEffect((img) => this.photon.ryo(img)); }

  // CONVOLUTION EFFECTS
  applyBoxBlur() { this.applyEffect((img) => this.photon.box_blur(img)); }
  applyGaussianBlur() { this.applyEffect((img) => this.photon.gaussian_blur(img, 3)); }
  applySharpen() { this.applyEffect((img) => this.photon.sharpen(img)); }
  applyEdgeDetection() { this.applyEffect((img) => this.photon.edge_detection(img)); }
  applyEdgeOne() { this.applyEffect((img) => this.photon.edge_one(img)); }
  applyEmboss() { this.applyEffect((img) => this.photon.emboss(img)); }
  applyLaplace() { this.applyEffect((img) => this.photon.laplace(img)); }
  applySobelHorizontal() { this.applyEffect((img) => this.photon.sobel_horizontal(img)); }
  applySobelVertical() { this.applyEffect((img) => this.photon.sobel_vertical(img)); }
  applyPrewittHorizontal() { this.applyEffect((img) => this.photon.prewitt_horizontal(img)); }

  // LINE DETECTION
  applyHorizontalLines() { this.applyEffect((img) => this.photon.detect_horizontal_lines(img)); }
  applyVerticalLines() { this.applyEffect((img) => this.photon.detect_vertical_lines(img)); }
  apply45DegLines() { this.applyEffect((img) => this.photon.detect_45_deg_lines(img)); }
  apply135DegLines() { this.applyEffect((img) => this.photon.detect_135_deg_lines(img)); }

  // COLOR ADJUSTMENTS
  applyIncreaseBrightness() { this.applyEffect((img) => this.photon.inc_brightness(img, 30)); }
  applyIncreaseContrast() { this.applyEffect((img) => this.photon.adjust_contrast(img, 30)); }
  applyDecreaseContrast() { this.applyEffect((img) => this.photon.adjust_contrast(img, -30)); }
  
  // Using HSL color space
  applyLighten() { this.applyEffect((img) => this.photon.lighten_hsl(img, 0.1)); }
  applyDarken() { this.applyEffect((img) => this.photon.darken_hsl(img, 0.1)); }
  applySaturate() { this.applyEffect((img) => this.photon.saturate_hsl(img, 0.1)); }
  applyDesaturate() { this.applyEffect((img) => this.photon.desaturate_hsl(img, 0.1)); }
  applyHueRotate() { this.applyEffect((img) => this.photon.hue_rotate_hsl(img, 0.3)); }

  // MONOCHROME & SPECIAL EFFECTS
  applySolarize() { this.applyEffect((img) => this.photon.solarize(img)); }
  applyPrimary() { this.applyEffect((img) => this.photon.primary(img)); }
  applyColorize() { this.applyEffect((img) => this.photon.colorize(img)); }
  applyThreshold() { this.applyEffect((img) => this.photon.threshold(img, 100)); }

  // CHANNEL EFFECTS
  applyRemoveRedChannel() { this.applyEffect((img) => this.photon.remove_red_channel(img)); }
  applyRemoveGreenChannel() { this.applyEffect((img) => this.photon.remove_green_channel(img)); }
  applyRemoveBlueChannel() { this.applyEffect((img) => this.photon.remove_blue_channel(img)); }
  applySwapChannels() { this.applyEffect((img) => this.photon.swap_channels(img, 0, 2)); }
  applyAlterRedChannel() { this.applyEffect((img) => this.photon.alter_red_channel(img, 50)); }
  applyAlterGreenChannel() { this.applyEffect((img) => this.photon.alter_green_channel(img, 50)); }
  applyAlterBlueChannel() { this.applyEffect((img) => this.photon.alter_blue_channel(img, 50)); }

  // NOISE & OTHER EFFECTS
  applyNoiseReduction() { this.applyEffect((img) => this.photon.noise_reduction(img)); }
  applyAddNoise() { this.applyEffect((img) => this.photon.add_noise_rand(img)); }
  applyPixelize() { this.applyEffect((img) => this.photon.pixelize(img, 10)); }
  applyOilPainting() { this.applyEffect((img) => this.photon.oil(img, 4, 55.0)); }
  applyFrostedGlass() { this.applyEffect((img) => this.photon.frosted_glass(img)); }
  
  // DUOTONE effects
  applyDuotone() { 
    this.applyEffect((img) => {
      const color1 = new this.photon.Rgb(255, 100, 0);
      const color2 = new this.photon.Rgb(0, 100, 255);
      this.photon.duotone(img, color1, color2);
    }); 
  }
  applyDuotoneHorizon() { this.applyEffect((img) => this.photon.duotone_horizon(img)); }
  applyDuotoneLilac() { this.applyEffect((img) => this.photon.duotone_lilac(img)); }
  applyDuotoneOchre() { this.applyEffect((img) => this.photon.duotone_ochre(img)); }

  resetImage() {
    if (!this.originalImageData) return;
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    
    ctx?.putImageData(this.originalImageData.get_image_data(), 0, 0);
  }

  downloadImage() {
    const canvas = this.canvasRef.nativeElement;
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL();
    link.click();
  }

  triggerFileInput() {
    this.fileInputRef.nativeElement.click();
  }
}
