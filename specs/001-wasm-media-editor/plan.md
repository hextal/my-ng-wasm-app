# Implementation Plan: WASM Media Editor

**Branch**: `001-wasm-media-editor` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-wasm-media-editor/spec.md`

**Note**: This plan focuses on initial WASM library setup (photon-wasm, ffmpeg-wasm) followed by building an intuitive UI/UX demo with separate tabs for image and video editing.

## Summary

Build a browser-based media editor leveraging WebAssembly for high-performance image and video processing. The application uses Photon-WASM for image manipulation (filters, transforms, color adjustments) and FFmpeg-WASM for video operations (trimming, format conversion, frame extraction). The UI emphasizes intuitive, tab-based navigation with separate sections for image and video editing, allowing users to upload files and immediately experience the editing capabilities. Client-side processing ensures privacy and eliminates server dependencies.

**Initial Focus**: 
1. Correctly install and initialize photon-wasm and ffmpeg-wasm libraries
2. Replace Angular boilerplate with custom UI/UX demo
3. Create tabbed interface for image editor and video editor sections
4. Implement file upload and basic preview functionality

## Technical Context

**Language/Version**: TypeScript 5.9.2 (Angular 21.0.0)  
**Primary Dependencies**: 
- Angular 21.0.0 (framework)
- Photon-WASM 0.0.4 (image processing)
- FFmpeg-WASM (video processing - latest stable version)
- Tailwind CSS 4.x (utility-first styling)
- RxJS 7.8 (reactive state management)

**Storage**: Browser LocalStorage for presets and recent sessions; IndexedDB for large file caching (optional optimization)  
**Testing**: Vitest 4.0.8 (unit tests), Playwright (integration/E2E tests)  
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) with WebAssembly support  
**Project Type**: Single-page web application (SPA) with Angular components  
**Performance Goals**: 
- Bundle size <500KB (gzipped, excluding WASM modules)
- Time to Interactive (TTI) <3 seconds on 3G
- Image processing operations <1 second for files under 10MB
- Real-time preview updates <300ms for filter adjustments

**Constraints**: 
- Client-side only (no backend API)
- WASM modules must load asynchronously without blocking UI
- Offline-capable after initial load (for image editing)
- File size limits: 50MB images, 200MB videos
- Memory-efficient processing for large files

**Scale/Scope**: 
- Single-user application (no multi-user collaboration)
- Support 10 concurrent editing sessions across browser tabs
- Handle images up to 8K resolution (7680×4320)
- Support videos up to 10 minutes duration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User-Centric Design (Intuitive UI) ✅

- **Compliance**: Tabbed interface clearly separates image and video editing workflows
- **Evidence**: Spec includes acceptance scenarios for drag-and-drop upload, real-time preview, clear error messages, tooltips, keyboard accessibility
- **Action Required**: UI/UX design must prioritize discoverability of features and minimize learning curve

### II. Test-Driven Development (Non-Negotiable) ✅

- **Compliance**: TDD mandatory for all features per constitution
- **Evidence**: Spec includes 24 acceptance scenarios that will drive test creation
- **Action Required**: Write failing tests for WASM initialization, file upload, effect application before implementation

### III. Integration & E2E Testing ✅

- **Compliance**: WASM integration is explicitly identified as requiring integration tests
- **Evidence**: Constitution requires "WASM module integration with Angular services" testing
- **Action Required**: 
  - Integration tests for Photon-WASM ↔ Angular service layer
  - Integration tests for FFmpeg-WASM ↔ Angular service layer
  - E2E tests for complete user journeys (upload → edit → download)

### IV. Scalability & Performance ✅

- **Compliance**: Architecture aligns with performance budgets and lazy loading requirements
- **Evidence**: 
  - Bundle size target <500KB documented
  - WASM modules load asynchronously per constitution
  - Lazy loading planned for image/video editing feature modules
- **Action Required**: Implement OnPush change detection, smart/dumb component patterns

### V. Developer & AI Agent Experience ✅

- **Compliance**: Clear specification, TypeScript strict mode, Bun tooling
- **Evidence**: 
  - Detailed spec with acceptance criteria
  - TypeScript 5.9.2 in strict mode
  - Bun package manager for fast installs
  - HMR via Vite for instant feedback
- **Action Required**: Maintain clear JSDoc comments for WASM integration code

### Quality Gates

All quality gates from constitution apply:
1. ✅ Constitution Compliance (verified above)
2. ✅ Test Coverage (TDD enforced)
3. ✅ Type Safety (TypeScript strict mode)
4. ✅ Lint Clean (Prettier configured in package.json)
5. ⚠️ Performance (budgets must be monitored during development)
6. ⚠️ Accessibility (WCAG 2.1 AA compliance required - must verify with axe/WAVE)
7. ✅ Documentation (spec.md completed)

**Gate Status**: ✅ **PASSED** - Ready for Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/001-wasm-media-editor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (WASM setup, best practices)
├── data-model.md        # Phase 1 output (entities and state)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (TypeScript interfaces)
│   ├── media-asset.interface.ts
│   ├── effect-chain.interface.ts
│   ├── wasm-services.interface.ts
│   └── storage-services.interface.ts
└── checklists/
    └── requirements.md  # Specification quality checklist (completed)
```

### Source Code (repository root)

**Project Type**: Single-page Angular application with feature modules

```text
src/
├── app/
│   ├── core/                      # Singleton services and core functionality
│   │   ├── services/
│   │   │   ├── wasm-loader.service.ts         # Loads photon-wasm and ffmpeg-wasm
│   │   │   ├── storage.service.ts             # LocalStorage abstraction
│   │   │   └── error-handler.service.ts       # Global error handling
│   │   └── guards/
│   │       └── wasm-loaded.guard.ts           # Route guard ensuring WASM ready
│   │
│   ├── shared/                    # Shared components and utilities
│   │   ├── components/
│   │   │   ├── file-upload/                   # Drag-and-drop upload component
│   │   │   ├── progress-indicator/            # Processing progress UI
│   │   │   ├── error-message/                 # Error display component
│   │   │   └── loading-spinner/               # Loading states
│   │   ├── directives/
│   │   │   └── drag-drop.directive.ts         # File drag-drop directive
│   │   └── pipes/
│   │       ├── file-size.pipe.ts              # Format bytes to human readable
│   │       └── duration.pipe.ts               # Format video duration
│   │
│   ├── features/                  # Feature modules (lazy loaded)
│   │   ├── image-editor/
│   │   │   ├── components/
│   │   │   │   ├── image-editor-shell/        # Container component
│   │   │   │   ├── image-canvas/              # Preview canvas component
│   │   │   │   ├── filter-panel/              # Filter controls
│   │   │   │   ├── tools-panel/               # Crop, rotate, resize tools
│   │   │   │   └── history-panel/             # Undo/redo UI
│   │   │   ├── services/
│   │   │   │   ├── photon.service.ts          # Photon-WASM wrapper
│   │   │   │   ├── image-processor.service.ts # Image processing logic
│   │   │   │   └── effect-chain.service.ts    # Effect application orchestration
│   │   │   ├── models/
│   │   │   │   ├── media-asset.model.ts       # Image asset representation
│   │   │   │   └── filter-effect.model.ts     # Filter definitions
│   │   │   └── image-editor.module.ts
│   │   │
│   │   └── video-editor/
│   │       ├── components/
│   │       │   ├── video-editor-shell/        # Container component
│   │       │   ├── video-player/              # Video playback component
│   │       │   ├── timeline/                  # Timeline with trim markers
│   │       │   ├── format-panel/              # Format conversion controls
│   │       │   └── processing-queue/          # Job queue UI
│   │       ├── services/
│   │       │   ├── ffmpeg.service.ts          # FFmpeg-WASM wrapper
│   │       │   ├── video-processor.service.ts # Video processing logic
│   │       │   └── job-queue.service.ts       # Async job management
│   │       ├── models/
│   │       │   ├── video-asset.model.ts       # Video asset representation
│   │       │   └── processing-job.model.ts    # Processing job state
│   │       └── video-editor.module.ts
│   │
│   ├── app.component.ts           # Root component with tab navigation
│   ├── app.component.html         # Main layout with tabs
│   ├── app.component.scss         # Global styles
│   ├── app.routes.ts              # Route definitions (lazy loading)
│   └── app.config.ts              # Angular app configuration
│
├── assets/
│   ├── wasm/                      # WASM binaries (loaded on demand)
│   ├── icons/                     # UI icons
│   └── sample-media/              # Demo images/videos (optional)
│
├── styles/
│   ├── tailwind.config.js         # Tailwind configuration
│   └── styles.scss                # Global SCSS styles
│
└── environments/
    ├── environment.ts             # Development config
    └── environment.prod.ts        # Production config

tests/
├── unit/
│   ├── services/
│   │   ├── wasm-loader.service.spec.ts
│   │   ├── photon.service.spec.ts
│   │   └── ffmpeg.service.spec.ts
│   └── components/
│       ├── file-upload.component.spec.ts
│       └── image-canvas.component.spec.ts
│
├── integration/
│   ├── wasm-integration.spec.ts           # WASM ↔ Angular integration
│   ├── image-processing-flow.spec.ts      # Upload → process → download
│   └── video-processing-flow.spec.ts      # Video workflow
│
└── e2e/
    ├── image-editor.e2e.spec.ts           # Complete image editing journey
    ├── video-editor.e2e.spec.ts           # Complete video editing journey
    └── tab-navigation.e2e.spec.ts         # Tab switching and state preservation
```

**Structure Decision**: 

This structure follows Angular best practices with clear separation of concerns:

1. **Core Module**: Singleton services (WASM loader, storage, error handling) loaded once at app startup
2. **Shared Module**: Reusable components (file upload, progress indicators) used across features
3. **Feature Modules**: Lazy-loaded image-editor and video-editor modules to optimize initial bundle size
4. **Smart/Dumb Pattern**: Shell components (containers) manage state; leaf components (presentational) receive data via inputs
5. **Service Layer**: WASM libraries wrapped in Angular services for testability and DI
6. **Models**: TypeScript interfaces and classes for type safety

This aligns with constitution principles:
- **Scalability**: Lazy loading, feature modules, clear boundaries
- **Performance**: Optimized bundle size, async WASM loading
- **Developer Experience**: Standard Angular conventions, clear naming, organized by feature

## Complexity Tracking

> **No violations to justify** - architecture aligns with constitution principles.

**Complexity Justifications** (preventative documentation):

| Architectural Choice | Justification | Simpler Alternative Considered |
|---------------------|---------------|-------------------------------|
| Lazy loading feature modules | Required for <500KB bundle size target; WASM modules are large (10-15MB) | Single bundle: rejected due to slow TTI |
| Service wrappers for WASM | Enables testing via DI and mocking; isolates WASM complexity | Direct WASM calls in components: rejected due to untestability |
| Command pattern for undo/redo | Constitution requires undo for up to 10 operations; command pattern standard solution | State snapshots: rejected due to memory overhead for large images |
| Effect chain model | Multiple effects must be applied in sequence with parameter tracking | Stateless processing: rejected due to lack of undo/history |

All complexity is justified by requirements and aligns with constitution principles (testability, performance, scalability).
