# WASM Media Editor

A powerful image editor built with Angular 21 and WebAssembly, featuring drag-and-drop functionality for text, icons, and shapes with real-time adjustments.

## Features

### Image Editor (Photon-WASM)
- **Drag & Drop Objects**: Add and position text, emojis, and shapes anywhere on your image
- **Real-time Adjustments**: Modify size, colors, and styles while objects are selected
- **Advanced Filters**: Brightness, contrast, saturation, hue rotation, opacity, and more
- **Photon Effects**: Grayscale, sepia, blur, sharpen, emboss, edge detection, and more
- **Drawing Tools**: Free-hand drawing with customizable brush sizes and colors
- **Shape Tools**: Rectangles, circles, triangles, and lines with customizable colors and strokes
- **Image Transformations**: Crop, flip, rotate, and corner radius adjustments
- **Undo/Redo**: Full history support with 50 state limit

### TUI Image Editor
- Third-party TUI Image Editor integration for additional editing capabilities

## Technology Stack

- **Angular 21.0.0** with standalone components
- **Bun** as package manager
- **Photon-WASM** for high-performance image processing
- **TypeScript 5.9.2**
- **Tailwind CSS** for styling
- **Vitest** for testing
- **SSR Support** with Angular Universal

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

## Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup Instructions

1. **Create a GitHub repository** (if not already created):
   ```bash
   # On GitHub, create a new repository named "my-ng-wasm-app"
   # Then run these commands:
   git remote add origin https://github.com/YOUR_USERNAME/my-ng-wasm-app.git
   ```

2. **Update the workflow file** `.github/workflows/deploy.yml`:
   - Change `--base-href=/my-ng-wasm-app/` to match your repository name
   - If your repo is named differently, update accordingly

3. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to **Pages** section
   - Under **Source**, select **GitHub Actions**

4. **Push your code**:
   ```bash
   git add .
   git commit -m "Initial commit with drag-and-drop image editor"
   git push -u origin 001-wasm-media-editor
   ```

5. **Trigger deployment**:
   - The GitHub Action will automatically deploy on push
   - Or manually trigger from the **Actions** tab

6. **Access your site**:
   - Your site will be available at: `https://hextal.github.io/my-ng-wasm-app/`

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

.github/
└── workflows/
    └── deploy.yml             # GitHub Pages deployment workflow
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
