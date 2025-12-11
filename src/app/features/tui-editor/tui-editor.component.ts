import { 
  Component, 
  ViewChild, 
  ElementRef, 
  AfterViewInit, 
  OnDestroy,
  signal,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-tui-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tui-editor.component.html',
  styleUrls: ['./tui-editor.component.scss']
})
export class TuiEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('tuiImageEditor') editorContainer!: ElementRef<HTMLDivElement>;
  
  private imageEditor: any;
  private isBrowser: boolean;
  
  // Component state
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  imageLoaded = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.initializeEditor();
    }
  }

  ngOnDestroy() {
    if (this.imageEditor) {
      this.imageEditor.destroy();
    }
  }

  private async initializeEditor() {
    try {
      // Dynamic import only in browser
      const { default: ImageEditor } = await import('tui-image-editor');
      
      // TUI Image Editor configuration
      const options = {
        includeUI: {
          theme: this.getThemeConfig(),
          menu: ['shape', 'filter', 'crop', 'flip', 'rotate', 'draw', 'mask', 'icon', 'text'],
          initMenu: 'filter',
          uiSize: {
            width: '100%',
            height: '600px'
          },
          menuBarPosition: 'bottom'
        },
        cssMaxWidth: 1000,
        cssMaxHeight: 600,
        selectionStyle: {
          cornerSize: 20,
          rotatingPointOffset: 70
        },
        usageStatistics: false
      };

      this.imageEditor = new ImageEditor(this.editorContainer.nativeElement, options);
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      this.error.set('Failed to initialize image editor');
    }
  }

  private getThemeConfig() {
    return {
      'common.bi.image': '',
      'common.bisize.width': '0',
      'common.bisize.height': '0',
      'common.backgroundImage': 'none',
      'common.backgroundColor': '#1e1e1e',
      'common.border': '0px',

      // header
      'header.backgroundImage': 'none',
      'header.backgroundColor': '#2c2c2c',
      'header.border': '0px',

      // load button
      'loadButton.backgroundColor': '#fff',
      'loadButton.border': '1px solid #ddd',
      'loadButton.color': '#222',
      'loadButton.fontFamily': '"Helvetica Neue", sans-serif',
      'loadButton.fontSize': '12px',

      // download button
      'downloadButton.backgroundColor': '#fdba3b',
      'downloadButton.border': '1px solid #fdba3b',
      'downloadButton.color': '#fff',
      'downloadButton.fontFamily': '"Helvetica Neue", sans-serif',
      'downloadButton.fontSize': '12px',

      // main icons
      'menu.normalIcon.color': '#8a8a8a',
      'menu.activeIcon.color': '#555555',
      'menu.disabledIcon.color': '#434343',
      'menu.hoverIcon.color': '#e9e9e9',
      'menu.iconSize.width': '24px',
      'menu.iconSize.height': '24px',

      // submenu primary color
      'submenu.backgroundColor': '#2c2c2c',
      'submenu.partition.color': '#3c3c3c',

      // submenu icons
      'submenu.normalIcon.color': '#8a8a8a',
      'submenu.activeIcon.color': '#e9e9e9',
      'submenu.iconSize.width': '32px',
      'submenu.iconSize.height': '32px',

      // submenu labels
      'submenu.normalLabel.color': '#8a8a8a',
      'submenu.normalLabel.fontWeight': 'lighter',
      'submenu.activeLabel.color': '#fff',
      'submenu.activeLabel.fontWeight': 'lighter',

      // checkbox style
      'checkbox.border': '0px',
      'checkbox.backgroundColor': '#fff',

      // range style
      'range.pointer.color': '#fff',
      'range.bar.color': '#666',
      'range.subbar.color': '#d1d1d1',

      'range.disabledPointer.color': '#414141',
      'range.disabledBar.color': '#282828',
      'range.disabledSubbar.color': '#414141',

      'range.value.color': '#fff',
      'range.value.fontWeight': 'lighter',
      'range.value.fontSize': '11px',
      'range.value.border': '1px solid #353535',
      'range.value.backgroundColor': '#151515',
      'range.title.color': '#fff',
      'range.title.fontWeight': 'lighter',

      // colorpicker style
      'colorpicker.button.border': '1px solid #1e1e1e',
      'colorpicker.title.color': '#fff'
    };
  }

  private setupEventListeners() {
    // Listen to various editor events
    this.imageEditor.on('mousedown', () => {
      // Mouse down tracked silently
    });

    this.imageEditor.on('addText', (pos: any) => {
      // Text addition tracked silently
    });

    this.imageEditor.on('objectMoved', (props: any) => {
      // Object movement tracked silently
    });

    this.imageEditor.on('undoStackChanged', (length: number) => {
      // Undo stack changes tracked silently
    });

    this.imageEditor.on('redoStackChanged', (length: number) => {
      // Redo stack changes tracked silently
    });
  }

  // Public methods for functionality
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    if (this.imageEditor && file) {
      this.loading.set(true);
      this.error.set(null);
      
      const reader = new FileReader();
      reader.onload = () => {
        this.imageEditor.loadImageFromURL(reader.result as string, file.name)
          .then(() => {
            this.loading.set(false);
          })
          .catch(() => {
            this.error.set('Failed to load image');
            this.loading.set(false);
          });
      };
      reader.readAsDataURL(file);
    }
  }

  downloadImage() {
    if (this.imageEditor) {
      const dataURL = this.imageEditor.toDataURL();
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'tui-edited-image.png';
      link.click();
    }
  }

  resetEditor() {
    if (this.imageEditor) {
      this.imageEditor.clearObjects();
    }
  }

  generateImage() {
    if (!this.imageEditor) return;
    
    this.loading.set(true);
    this.error.set(null);
    
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
    
    // Convert to data URL and load into editor
    const dataURL = canvas.toDataURL();
    this.imageEditor.loadImageFromURL(dataURL, 'Generated-Image')
      .then(() => {
        this.loading.set(false);
        this.imageLoaded.set(true);
      })
      .catch(() => {
        this.error.set('Failed to load generated image');
        this.loading.set(false);
      });
  }
}