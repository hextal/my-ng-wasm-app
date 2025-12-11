# Quickstart Guide: WASM Media Editor Development

**Feature**: 001-wasm-media-editor  
**Branch**: `001-wasm-media-editor`  
**Last Updated**: 2025-12-10

## Overview

This guide helps developers get started building the WASM Media Editor. Follow these steps to set up your environment, understand the architecture, and begin implementing features.

## Prerequisites

Before starting, ensure you have:

✅ **Bun** v1.0.0+ installed ([bun.sh](https://bun.sh))  
✅ **Node.js** v20+ (for compatibility checks)  
✅ **Git** configured with your credentials  
✅ **VS Code** or similar IDE with TypeScript support  
✅ **Modern browser** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd C:\Users\hassan.talpur\projects\angular-image-editor\my-ng-wasm-app
bun install
```

**Expected Output**: All dependencies install in <30 seconds

### 2. Install WASM Libraries

```bash
bun add @ffmpeg/ffmpeg @ffmpeg/util
```

**Note**: photon-wasm@0.0.4 already in package.json

### 3. Start Development Server

```bash
bun run start
```

**Expected Output**: 
```
✔ Browser application bundle generation complete.
Local: http://localhost:4200/
```

### 4. Verify WASM Support

Open `http://localhost:4200/` in your browser and open DevTools Console. You should see:
- No CORS errors
- No WASM loading errors
- Application loads in <3 seconds

## Project Structure

```
src/
├── app/
│   ├── core/                    # Singleton services (WASM loaders)
│   ├── shared/                  # Reusable components (file upload, progress)
│   ├── features/                # Feature modules (lazy-loaded)
│   │   ├── image-editor/       # Image editing (Photon-WASM)
│   │   └── video-editor/       # Video editing (FFmpeg-WASM)
│   ├── app.component.ts         # Root with tab navigation
│   └── app.routes.ts            # Route definitions
│
specs/001-wasm-media-editor/     # Feature documentation
├── spec.md                       # Feature specification
├── plan.md                       # Implementation plan (this feature)
├── research.md                   # WASM integration research
├── data-model.md                 # Entity definitions
├── contracts/                    # TypeScript interfaces
└── quickstart.md                 # This guide

tests/
├── unit/                         # Vitest unit tests
├── integration/                  # WASM integration tests
└── e2e/                          # Playwright E2E tests
```

## Development Workflow

### Phase 1: WASM Setup (Priority)

**Goal**: Initialize Photon-WASM and FFmpeg-WASM correctly

#### Step 1.1: Create PhotonService

```bash
# Create service directory
mkdir -p src/app/core/services

# Create service file
touch src/app/core/services/photon.service.ts
```

**Implementation Template** (see research.md for full code):

```typescript
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PhotonService {
  private photon = signal<any | null>(null);
  readonly isReady = computed(() => this.photon() !== null);
  
  async initialize(): Promise<void> {
    const module = await import('photon-wasm');
    this.photon.set(module);
  }
  
  processImage(imageData: ImageData, effect: string): ImageData {
    // Implementation
  }
}
```

**Test**:
```bash
bun test src/app/core/services/photon.service.spec.ts
```

#### Step 1.2: Create FFmpegService

```bash
touch src/app/core/services/ffmpeg.service.ts
```

**Implementation Template** (see research.md for full code):

```typescript
import { Injectable, signal } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

@Injectable({ providedIn: 'root' })
export class FFmpegService {
  private ffmpeg = signal<FFmpeg | null>(null);
  
  async initialize(useMultiThread: boolean = false): Promise<void> {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    });
    
    this.ffmpeg.set(ffmpeg);
  }
}
```

**Test**:
```bash
bun test src/app/core/services/ffmpeg.service.spec.ts
```

### Phase 2: UI/UX Demo

**Goal**: Replace Angular boilerplate with custom UI showcasing image/video editing

#### Step 2.1: Create Tab Navigation

**Update `src/app/app.component.html`**:

```html
<div class="app-shell">
  <header class="header">
    <h1>WASM Media Editor</h1>
    <nav class="tabs">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
        Home
      </a>
      <a routerLink="/image-editor" routerLinkActive="active">
        Image Editor
      </a>
      <a routerLink="/video-editor" routerLinkActive="active">
        Video Editor
      </a>
    </nav>
  </header>
  
  <main class="content">
    <router-outlet />
  </main>
</div>
```

**Update `src/app/app.routes.ts`**:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component')
  },
  {
    path: 'image-editor',
    loadComponent: () => import('./features/image-editor/image-editor.component')
  },
  {
    path: 'video-editor',
    loadComponent: () => import('./features/video-editor/video-editor.component')
  }
];
```

#### Step 2.2: Create Image Editor Component

```bash
mkdir -p src/app/features/image-editor
touch src/app/features/image-editor/image-editor.component.ts
```

**Basic Structure**:

```typescript
import { Component, signal } from '@angular/core';
import { PhotonService } from '../../core/services/photon.service';

@Component({
  selector: 'app-image-editor',
  standalone: true,
  template: `
    <div class="editor-container">
      <!-- File Upload Zone -->
      <div class="upload-zone" (drop)="onFileDrop($event)" (dragover)="$event.preventDefault()">
        <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" hidden>
        <button (click)="fileInput.click()">Upload Image</button>
        <p>or drag and drop</p>
      </div>
      
      <!-- Canvas Preview -->
      @if (currentImage()) {
        <canvas #canvas></canvas>
      }
      
      <!-- Effect Panel -->
      @if (currentImage()) {
        <div class="effects-panel">
          <button (click)="applyEffect('grayscale')">Grayscale</button>
          <button (click)="applyEffect('sepia')">Sepia</button>
          <button (click)="applyEffect('blur')">Blur</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .editor-container {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 1rem;
      height: 100%;
    }
    
    .upload-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
    }
    
    canvas {
      max-width: 100%;
      border: 1px solid #eee;
    }
  `]
})
export class ImageEditorComponent {
  currentImage = signal<ImageData | null>(null);
  
  constructor(private photonService: PhotonService) {}
  
  async ngOnInit() {
    await this.photonService.initialize();
  }
  
  async onFileSelected(event: Event) {
    // Implementation: Load file, create ImageData, display on canvas
  }
  
  async applyEffect(effect: string) {
    const image = this.currentImage();
    if (!image) return;
    
    const processed = this.photonService.processImage(image, effect);
    this.currentImage.set(processed);
    // Update canvas
  }
}
```

#### Step 2.3: Style with Tailwind CSS

**Install Tailwind** (if not already configured):

```bash
bun add -d tailwindcss @tailwindcss/forms
```

**Configure Tailwind** (`tailwind.config.js`):

```javascript
export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        secondary: '#06b6d4'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
```

**Import in `src/styles.scss`**:

```scss
@tailwind base;
@tailwind components;
@tailwind utilities;

// Custom styles
.upload-zone {
  @apply border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer;
  @apply hover:border-primary transition-colors;
}
```

### Phase 3: Testing (TDD)

**Goal**: Write tests before implementing features

#### Example: PhotonService Unit Test

**File**: `src/app/core/services/photon.service.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhotonService } from './photon.service';

describe('PhotonService', () => {
  let service: PhotonService;

  beforeEach(() => {
    service = new PhotonService();
  });

  describe('initialize', () => {
    it('should load photon-wasm module', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });

    it('should handle initialization errors', async () => {
      // Mock import failure
      vi.spyOn(global, 'import').mockRejectedValueOnce(new Error('Network error'));
      
      await expect(service.initialize()).rejects.toThrow('Network error');
      expect(service.loadError()).toBeTruthy();
    });
  });

  describe('processImage', () => {
    it('should throw if not initialized', () => {
      const imageData = new ImageData(100, 100);
      expect(() => service.processImage(imageData, 'grayscale')).toThrow();
    });

    it('should apply grayscale filter', async () => {
      await service.initialize();
      const imageData = new ImageData(100, 100);
      
      const result = service.processImage(imageData, 'grayscale');
      
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      // Add pixel value assertions
    });
  });
});
```

**Run Tests**:

```bash
bun test
```

#### Example: Integration Test

**File**: `tests/integration/wasm-integration.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { PhotonService } from '../../src/app/core/services/photon.service';
import { FFmpegService } from '../../src/app/core/services/ffmpeg.service';

describe('WASM Integration', () => {
  describe('Photon-WASM', () => {
    it('should initialize and process image end-to-end', async () => {
      const service = new PhotonService();
      await service.initialize();
      
      // Create test image
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 200, 200);
      
      const imageData = ctx.getImageData(0, 0, 200, 200);
      const processed = service.processImage(imageData, 'grayscale');
      
      // Verify grayscale conversion
      expect(processed.data[0]).toBe(processed.data[1]);
      expect(processed.data[1]).toBe(processed.data[2]);
    });
  });

  describe('FFmpeg-WASM', () => {
    it('should initialize without errors', async () => {
      const service = new FFmpegService();
      await service.initialize();
      
      expect(service.isReady()).toBe(true);
    }, 30000); // 30s timeout for WASM download
  });
});
```

## Common Development Tasks

### Adding a New Effect

1. **Define effect parameters** in `data-model.md`
2. **Add to Effect interface** in contracts
3. **Implement in PhotonService**:
   ```typescript
   applyCustomEffect(imageData: ImageData, params: CustomParams): ImageData {
     // Photon-WASM call
   }
   ```
4. **Write tests first** (TDD):
   ```typescript
   it('should apply custom effect with parameters', async () => {
     // Test implementation
   });
   ```
5. **Update UI** to expose new effect

### Debugging WASM Issues

**Enable WASM Logging**:

```typescript
@Injectable({ providedIn: 'root' })
export class PhotonService {
  private readonly DEBUG = true;
  
  async initialize() {
    if (this.DEBUG) {
      console.log('[Photon] Initializing...');
    }
    // ...
  }
}
```

**Common Issues**:

| Issue | Solution |
|-------|----------|
| CORS errors | Use toBlobURL pattern for FFmpeg |
| Memory errors | Check file size limits, add validation |
| Slow loading | Enable lazy loading, check network tab |
| Type errors | Ensure custom .d.ts files are in tsconfig paths |

## Performance Testing

**Measure Bundle Size**:

```bash
bun run build
```

Check `dist/` output - main bundle should be <500KB (gzipped).

**Measure TTI**:

1. Open Chrome DevTools
2. Run Lighthouse audit
3. Verify TTI <3 seconds
4. Check Performance score >90

**Profile Memory**:

1. Open DevTools → Performance → Memory
2. Record session
3. Upload large image (20MB)
4. Apply multiple effects
5. Check for memory leaks (heap should stabilize)

## Configuration Files

### vite.config.ts

Create if not exists:

```typescript
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  optimizeDeps: {
    exclude: ['photon-wasm', '@ffmpeg/ffmpeg']
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'photon': ['photon-wasm'],
          'ffmpeg': ['@ffmpeg/ffmpeg']
        }
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run start` | Start dev server |
| `bun run build` | Production build |
| `bun test` | Run all tests |
| `bun test --watch` | Watch mode |
| `bun run test:e2e` | E2E tests |
| `bun lint` | Lint code |
| `bun format` | Format code (Prettier) |

## Next Steps

1. ✅ Complete WASM service setup (PhotonService, FFmpegService)
2. ✅ Create tabbed UI with routing
3. ✅ Implement file upload with drag-and-drop
4. ✅ Add real-time preview canvas
5. ✅ Build filter effects panel
6. ✅ Write comprehensive tests (unit + integration)
7. ✅ Optimize bundle size (<500KB)
8. ✅ Verify performance targets (TTI <3s, preview <300ms)
9. ✅ Add accessibility features (keyboard nav, screen reader)
10. ✅ Deploy and validate cross-browser

## Resources

- **Feature Spec**: `specs/001-wasm-media-editor/spec.md`
- **Research**: `specs/001-wasm-media-editor/research.md`
- **Data Model**: `specs/001-wasm-media-editor/data-model.md`
- **Contracts**: `specs/001-wasm-media-editor/contracts/`
- **Constitution**: `.specify/memory/constitution.md`

## Getting Help

- Check research.md for WASM integration patterns
- Review data-model.md for entity structures
- See contracts for TypeScript interfaces
- Refer to constitution for development principles

## Development Checklist

Before starting a new feature:

- [ ] Read relevant section in spec.md
- [ ] Review acceptance scenarios
- [ ] Check data-model.md for entities involved
- [ ] Import contracts from contracts/
- [ ] Write failing tests first (TDD)
- [ ] Implement minimal code to pass tests
- [ ] Refactor while keeping tests green
- [ ] Verify constitution compliance
- [ ] Update documentation if needed

Happy coding! 🚀
