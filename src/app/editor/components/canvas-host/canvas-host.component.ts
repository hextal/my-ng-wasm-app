import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { FabricCanvasService } from '../../services/fabric-canvas.service';
import { DocumentStoreService } from '../../services/document-store.service';

/**
 * CanvasHostComponent - Host for the Fabric canvas
 * Provides the DOM element and initializes Fabric
 */
@Component({
  selector: 'app-canvas-host',
  standalone: true,
  templateUrl: './canvas-host.component.html',
  styleUrls: ['./canvas-host.component.scss'],
})
export class CanvasHostComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private resizeTimeout: any;

  constructor(
    private fabricCanvas: FabricCanvasService,
    private documentStore: DocumentStoreService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Component initialized
  }

  async ngAfterViewInit(): Promise<void> {
    console.log('CanvasHostComponent: AfterViewInit starting');
    
    // Wait a tick for the DOM to be fully ready
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (!this.canvasRef) {
      console.error('Canvas element ref is not available');
      return;
    }

    const canvasElement = this.canvasRef.nativeElement;
    
    if (!canvasElement) {
      console.error('Canvas native element is not available');
      return;
    }

    // Calculate dimensions from the container
    const container = this.elementRef.nativeElement.querySelector('.canvas-container');
    if (!container) {
      console.error('Canvas container not found');
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const width = Math.floor(containerRect.width);
    const height = Math.floor(containerRect.height);

    console.log('Initializing canvas with container dimensions:', width, height);

    // Update document store dimensions
    this.documentStore.setDimensions(width, height);

    try {
      await this.fabricCanvas.init(canvasElement, width, height);
      console.log('Canvas initialized successfully');
    } catch (error) {
      console.error('Failed to initialize canvas:', error);
    }
  }

  @HostListener('window:resize')
  async onWindowResize(): Promise<void> {
    // Debounce resize events
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.handleResize();
    }, 250);
  }

  private async handleResize(): Promise<void> {
    const container = this.elementRef.nativeElement.querySelector('.canvas-container');
    if (!container || !this.canvasRef) return;

    const containerRect = container.getBoundingClientRect();
    const width = Math.floor(containerRect.width);
    const height = Math.floor(containerRect.height);

    console.log('Resizing canvas to:', width, height);

    // Update document dimensions
    this.documentStore.setDimensions(width, height);

    // Resize the Fabric canvas
    const canvas = this.fabricCanvas.getCanvas();
    if (canvas) {
      canvas.setDimensions({ width, height });
      canvas.requestRenderAll();
    }
  }

  ngOnDestroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.fabricCanvas.dispose();
  }
}
