# Fabric.js Editor Implementation

A production-ready image editor built with Angular 21, Fabric.js, Photon WASM, and ImageMagick WASM following SOLID principles and clean architecture patterns.

## Architecture Overview

### Core Principles

1. **DocumentModel is Source of Truth**: All state lives in the document model, Fabric.js is just the view layer
2. **Command Pattern for Undo/Redo**: All mutations go through commands for full history support
3. **WASM Off the Hot Path**: No Photon/ImageMagick during drag/draw operations
4. **Clean Separation**: Fabric handles UI, Photon handles filters, ImageMagick handles conversion

### Component Structure

```
/src/app/editor/
├── components/
│   ├── canvas-host/         # Fabric.js canvas host
│   └── toolbar/             # Tool controls and filters
├── core/
│   ├── commands/            # Command pattern implementations
│   │   ├── command.interface.ts
│   │   └── object.commands.ts
│   ├── models/              # Data models (source of truth)
│   │   └── document.model.ts
│   └── renderer/            # Fabric renderer (model → view sync)
│       └── fabric-renderer.ts
└── services/
    ├── asset-store.service.ts      # Blob cache management
    ├── document-store.service.ts   # Document state management
    ├── fabric-canvas.service.ts    # Canvas interactions
    ├── history.service.ts          # Undo/redo management
    ├── photon-filters.service.ts   # Photon WASM adapter
    └── export.service.ts           # Export with offscreen rendering
```

## Data Flow

### Adding an Image

```
User → FabricCanvasService.addImageFromBlob()
  → AssetStore.put() (store blob)
  → CreateImageObject (model)
  → AddObjectCommand (history)
  → DocumentStore.update() (state)
  → FabricRenderer.addObject() (view)
```

### Applying a Filter

```
User → PhotonFiltersService.applyFilter()
  → AssetStore.get() (fetch blob)
  → Photon WASM (process)
  → AssetStore.put() (store result)
  → UpdateImageAssetCommand (history)
  → DocumentStore.update() (state)
  → FabricRenderer.updateObject() (view)
```

### Transform (Drag/Scale/Rotate)

```
Fabric "object:rotating/scaling/moving" → Capture beforeTransform
Fabric "object:modified" → Capture afterTransform
  → TransformObjectCommand (history)
  → DocumentStore.update() (state)
  → FabricRenderer syncs on document change
```

### Export

```
User → ExportService.export()
  → Create offscreen Fabric canvas
  → Render all objects at target resolution
  → Export to PNG (lossless)
  → ImageMagick conversion (if needed)
  → Download file
```

## Key Features

### Document Model

- **Source of Truth**: All editor state lives here
- **Immutable Updates**: Uses functional updates with version tracking
- **Observable**: Reactive updates via RxJS and Angular signals

### Command Pattern

- **Undoable Operations**: Every mutation is a command
- **Full History**: Undo/redo stack with descriptions
- **Atomic**: Commands execute/undo atomically

### Asset Store

- **Blob Management**: In-memory cache (upgradeable to IndexedDB)
- **Object URL Caching**: Prevents repeated URL creation
- **Lifecycle Management**: Automatic cleanup on delete

### Fabric Integration

- **Event Handling**: Captures selection, drawing, transforms
- **Transform Snapshots**: Only commits on gesture end (not per frame)
- **Bidirectional Sync**: Model changes update Fabric, Fabric events update model

### Photon Integration

- **Off Hot Path**: Only runs on explicit "Apply Filter"
- **Blob API**: Works with Blob → ImageData → Blob pipeline
- **Filter Catalog**: Predefined list of available filters

### Export Pipeline

- **Offscreen Rendering**: Creates temporary Fabric canvas
- **Resolution Independent**: Supports arbitrary scale factors
- **Format Conversion**: PNG intermediate → ImageMagick → target format
- **Background Handling**: Proper transparency/solid background support

## Performance Considerations

1. **No WASM on Hot Path**: Drag/draw operations don't trigger Photon/ImageMagick
2. **Transform Batching**: Only commit commands on "object:modified", not per-frame
3. **Image Caching**: HTMLImageElement cached by assetId
4. **Object URL Caching**: Reuse URLs for same assets
5. **Offscreen Export**: Doesn't block main canvas during export

## Testing

### Unit Tests

- `asset-store.service.spec.ts`: Blob storage and retrieval
- `document-store.service.spec.ts`: State management and updates
- `history.service.spec.ts`: Undo/redo with commands

### Integration Tests

- `editor.integration.spec.ts`: Full workflows (add → undo → redo)

Run tests:
```bash
bun test
```

## Usage Example

```typescript
import { EditorComponent } from './editor/editor.component';

// In your route/component
{
  path: 'editor',
  component: EditorComponent
}
```

The editor provides:
- Import images
- Draw paths with brush tool
- Select and transform objects (move, scale, rotate)
- Apply Photon filters (grayscale, blur, sharpen, etc.)
- Undo/redo all operations
- Export to PNG/JPEG/WEBP with resolution control

## SOLID Principles Applied

1. **Single Responsibility**:
   - AssetStoreService: ONLY manages blobs
   - FabricCanvasService: ONLY handles Fabric interactions
   - PhotonFiltersService: ONLY applies Photon filters
   - ExportService: ONLY handles export
   
2. **Open/Closed**:
   - Command interface allows new commands without modifying history service
   - Filter list extensible without changing PhotonFiltersService

3. **Liskov Substitution**:
   - All EditorObject types (Image, Path, Text) are substitutable
   - All commands implement Command interface consistently

4. **Interface Segregation**:
   - Command interface is minimal (execute/undo/describe)
   - Services expose only what's needed

5. **Dependency Inversion**:
   - Services depend on DocumentStoreService abstraction, not concrete Fabric implementation
   - Commands depend on Command interface, not concrete implementations

## Future Enhancements

- [ ] IndexedDB for AssetStore (large document support)
- [ ] Web Workers for Photon/ImageMagick (keep UI responsive)
- [ ] Layer panel component
- [ ] Properties panel for selected object
- [ ] Text tool with font selection
- [ ] Crop tool with UI
- [ ] Filter preview thumbnails
- [ ] Real-time filter preview (debounced)
- [ ] Keyboard shortcuts
- [ ] Touch/gesture support
- [ ] Document save/load (JSON serialization)

## Dependencies

- **fabric**: ^7.1.0 - Canvas interactions and rendering
- **uuid**: ^13.0.0 - Asset ID generation
- **photon-wasm**: Existing - Image filters and processing
- **@imagemagick/magick-wasm**: Existing - Format conversion

## License

Part of the ImageEditor project.
