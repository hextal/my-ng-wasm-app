# Photon Image Editor

A powerful WebAssembly-powered image editor built with Angular 21, featuring drag-and-drop functionality, real-time crop preview, and keyboard shortcuts for an intuitive editing experience.

## Features

### Image Editor (Photon-WASM)
- **Real-time Crop Preview**: Visual feedback with dimensions, corner handles, and aspect ratio support
- **Keyboard Shortcuts**: 
  - Delete/Backspace to remove selected objects
  - Ctrl+Z/Cmd+Z for Undo
  - Ctrl+Y/Cmd+Y for Redo
  - Esc to cancel crop
- **Drag & Drop Objects**: Add and position text, emojis, and shapes anywhere on your image
- **Real-time Adjustments**: Modify size, colors, and styles while objects are selected
- **Advanced Filters**: Brightness, contrast, saturation, hue rotation, opacity, and more
- **Photon Effects**: Grayscale, sepia, blur, sharpen, emboss, edge detection, and more
- **Drawing Tools**: Free-hand drawing with customizable brush sizes and colors
- **Shape Tools**: Rectangles, circles, triangles, and lines with customizable colors and strokes
- **Image Transformations**: Crop, flip, rotate, and corner radius adjustments
- **Undo/Redo**: Full history support with 50 state limit

### Available Filters (30+ Artistic Effects)

The editor includes the following artistic filters powered by Photon-WASM:

- **Original** - No filter applied
- **Bluechrome** - Cool blue tones
- **Cali** - California-inspired warm filter
- **Diamante** - Diamond sparkle effect
- **Dramatic** - High contrast dramatic look
- **Firenze** - Florence-inspired artistic filter
- **Flagblue** - Patriotic blue tones
- **Golden** - Warm golden hour effect
- **Islands** - Tropical island vibes
- **Liquid** - Smooth liquid color effect
- **Lix** - Unique color grading
- **Lofi** - Low-fidelity vintage look
- **Marine** - Ocean blue tones
- **Mauve** - Purple-pink color cast
- **Neue** - Modern clean filter
- **Obsidian** - Dark dramatic tones
- **Oceanic** - Deep sea blue effect
- **Oil Painting** - Oil painting artistic effect
- **Pastel Pink** - Soft pink tones
- **Perfume** - Elegant soft filter
- **Pixelize** - Pixelated retro effect
- **Radio** - Vintage radio-era look
- **Rosetint** - Rose-colored tint
- **Ryo** - Japanese-inspired filter
- **Seagreen** - Ocean green tones
- **Sepia** - Classic brown vintage tone
- **Serenity** - Calm peaceful tones
- **Solarize** - Solarization effect
- **Twenties** - 1920s vintage style
- **Vintage** - Classic vintage look


### Supported Image Formats

The editor supports a wide range of image formats for both upload and download:

#### Format Support Table

| Input Format | Can Upload/Edit? | Photon Editing? | Available Export Formats |
|--------------|------------------|------------------|-------------------------|
| PNG          | ? Yes            | ? Yes            | PNG, JPEG, BMP, WebP, TIFF |
| JPEG/JPG     | ? Yes            | ? Yes            | PNG, JPEG, BMP, WebP, TIFF |
| BMP          | ? Yes            | ? Yes            | PNG, JPEG, BMP, WebP, TIFF |
| WebP         | ? Yes            | ? No*            | PNG, JPEG, BMP, WebP, TIFF |
| TIFF/TIF     | ? Yes            | ? No*            | PNG, JPEG, BMP, WebP, TIFF |
| GIF          | ? Yes            | ? No*            | PNG, JPEG (Limited Support) |
| AVIF         | ? Yes            | ? No*            | PNG, JPEG (Limited Support) |
| HEIC         | ? Yes            | ? No*            | PNG, JPEG (Limited Support) |
| HEIF         | ? Yes            | ? No*            | PNG, JPEG (Limited Support) |
| ICO          | ? Yes            | ? No*            | PNG, JPEG (Limited Support) |
| SVG          | ? Yes            | ? No*            | PNG, JPEG (Limited Support) |

*Non-Photon compatible formats are automatically converted to PNG for editing.*

#### Format Categories

**Full Support Formats** (All features available):
- PNG, JPEG/JPG, BMP, WebP, TIFF
- Direct upload and editing with all Photon filters
- Export to all 5 formats

**Limited Support Formats** (Restricted export options):
- GIF, AVIF, HEIC, HEIF, ICO, SVG
- Can upload and edit (auto-converted to PNG internally)
- All Photon filters and effects available
- Export limited to PNG and JPEG only
## Technology Stack

- **Angular 21.0.0** with standalone components
- **Bun** as package manager
- **Photon-WASM** for high-performance image processing
- **TypeScript 5.9.2**
- **Tailwind CSS** for styling
- **Vitest** for testing

## Development

### Prerequisites
- [Bun](https://bun.sh/) v1.3.4 or later

### Installation

```bash
bun install
```

### Development Server

```bash
bun run dev
# or
bun run start
```

Navigate to `http://localhost:4800/`. The application will automatically reload when you change source files.

### Building

```bash
bun run build
```

Build artifacts will be stored in the `dist/` directory.

### Testing

```bash
bun test
# or for UI
bun run test:ui
```

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   └── services/          # Core services (Photon, ImageCache, Performance)
│   ├── features/
│   │   ├── image-editor/      # Custom Photon-based editor
│   │   └── tui-editor/        # TUI Image Editor integration
│   ├── types/                 # TypeScript type definitions
│   └── app.*                  # App root component
├── assets/                    # Static assets
└── public/                    # Public files
```

## Usage Guide

### Icons & Emojis
1. Click an emoji button to add it to the canvas
2. Click the icon to select it (blue border appears)
3. Drag to reposition
4. Adjust size slider while selected for real-time resizing
5. Click "Apply Icons" to commit to image

### Text
1. Type text in the textarea
2. Click "Add Text" to place on canvas
3. Click the text to select it
4. Drag to reposition
5. Adjust size/color/style while selected
6. Click "Apply Texts" to commit to image

### Shapes
1. Click shape button (rectangle, circle, triangle, line)
2. Click the shape to select it
3. Drag to reposition
4. Adjust size/colors/stroke while selected
5. Click "Apply Shapes" to commit to image

## Performance

- **Initial Bundle**: ~316 KB (82 KB gzipped)
- **Image Editor Component**: ~103 KB (20 KB gzipped)
- **WASM Module**: Loaded on-demand for optimal performance

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Any browser supporting WebAssembly and ES2022

## License

This project is private and not licensed for public use.

## Contributing

This is a private project. Contributions are not currently accepted.

