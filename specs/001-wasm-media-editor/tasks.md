# Implementation Tasks: WASM Media Editor

**Feature**: 001-wasm-media-editor  
**Branch**: `001-wasm-media-editor`  
**Created**: 2025-12-10  
**Status**: Ready for Implementation

## Task Execution Guide

### Phases
Tasks are organized into 5 phases that must be completed sequentially:
1. **Setup**: Project initialization and WASM library setup
2. **Tests**: Test infrastructure and TDD test creation
3. **Core**: Core services and feature implementation
4. **Integration**: UI/UX integration and feature modules
5. **Polish**: Final testing, optimization, and validation

### Execution Rules
- ✅ Complete phases in order (Setup → Tests → Core → Integration → Polish)
- ✅ Tasks within a phase marked **[P]** can run in parallel
- ✅ Tasks without **[P]** must run sequentially (dependency chain)
- ✅ Mark tasks with [X] when completed
- ✅ Test tasks must pass before proceeding to dependent implementation tasks

---

## Phase 0: Setup

### Project Foundation

- [X] **S-001**: Verify git repository and create/update .gitignore
  - **Files**: `.gitignore`
  - **Action**: Ensure patterns for node_modules/, dist/, .env*, *.log, .angular/, .vscode/ exist
  - **Test**: `git status` should not show ignored files

- [X] **S-002**: Install WASM dependencies with Bun
  - **Files**: `package.json`
  - **Action**: Run `bun add @ffmpeg/ffmpeg @ffmpeg/util`
  - **Verify**: Check photon-wasm@0.0.4 already exists in package.json
  - **Test**: `bun install` completes successfully in <30 seconds

- [X] **S-003**: Configure Vite for WASM support
  - **Files**: `vite.config.ts`
  - **Action**: Add ESM WASM loading config, manual chunks for photon and ffmpeg, dev server headers for SharedArrayBuffer
  - **Reference**: `research.md` section 3
  - **Test**: Dev server starts with `bun run start`

- [X] **S-004**: Configure TypeScript for WASM types
  - **Files**: `tsconfig.json`, `src/types/photon-wasm.d.ts`
  - **Action**: Add custom TypeScript declarations for photon-wasm
  - **Reference**: `research.md` section 1 (Type Definitions)
  - **Test**: No TypeScript errors on import of photon-wasm

- [X] **S-005**: Configure Tailwind CSS
  - **Files**: `tailwind.config.js`, `src/styles.scss`
  - **Action**: Install @tailwindcss/forms, configure content paths, add custom theme colors
  - **Reference**: `quickstart.md` Step 2.3
  - **Test**: Tailwind classes render in browser

---

## Phase 1: Core WASM Services (Priority 1)

### 1.1: Photon-WASM Service Setup

- [X] **C-001**: Create PhotonService with signal-based state management
  - **Files**: `src/app/core/services/photon.service.ts`
  - **Action**: Implement injectable service with async initialization, signal for module state, error handling
  - **Reference**: `research.md` section 1, `quickstart.md` Step 1.1
  - **Dependencies**: S-004 (TypeScript types)
  - **Test**: Service initializes without errors

- [X] **C-002**: Create PhotonService unit tests (TDD)
  - **Files**: `src/app/core/services/photon.service.spec.ts`
  - **Action**: Write tests for initialization, error handling, isReady state
  - **Reference**: `quickstart.md` Phase 3
  - **Test**: All tests pass with `bun test`

- [X] **C-003**: Implement basic image processing methods in PhotonService
  - **Files**: `src/app/core/services/photon.service.ts`
  - **Action**: Add methods for grayscale, sepia, blur filters
  - **Dependencies**: C-001 (Service created)
  - **Test**: Unit tests pass for each filter

### 1.2: FFmpeg-WASM Service Setup

- [X] **C-004**: Create FFmpegService with CDN loading strategy
  - **Files**: `src/app/core/services/ffmpeg.service.ts`
  - **Action**: Implement service with toBlobURL pattern, progress tracking with signals, multi-thread feature detection
  - **Reference**: `research.md` section 2, `quickstart.md` Step 1.2
  - **Dependencies**: S-002 (FFmpeg packages installed)
  - **Test**: Service initializes and loads FFmpeg core from CDN

- [X] **C-005**: Create FFmpegService unit tests (TDD)
  - **Files**: `src/app/core/services/ffmpeg.service.spec.ts`
  - **Action**: Write tests for initialization, progress tracking, SharedArrayBuffer detection, error handling
  - **Test**: All tests pass with `bun test`

- [ ] **C-006**: Implement video processing methods in FFmpegService
  - **Files**: `src/app/core/services/ffmpeg.service.ts`
  - **Action**: Add methods for trim, format conversion, frame extraction with virtual filesystem I/O
  - **Reference**: `research.md` section 2 (File I/O Patterns)
  - **Dependencies**: C-004 (Service created)
  - **Test**: Unit tests pass for each operation

### 1.3: Storage and State Services

- [ ] **C-007**: Create StorageService for LocalStorage abstraction
  - **Files**: `src/app/core/services/storage.service.ts`
  - **Action**: Implement methods for saving/loading presets, sessions, settings with size limits
  - **Reference**: `data-model.md` (Browser Storage Schema)
  - **Test**: Data persists and restores correctly

- [ ] **C-008**: Create EditorStateService for global state management
  - **Files**: `src/app/core/services/editor-state.service.ts`
  - **Action**: Implement signal-based state for currentSession, recentSessions, presets, processingJobs
  - **Reference**: `data-model.md` (State Management section)
  - **Test**: State updates propagate to UI components

---

## Phase 2: Remove Boilerplate and Create Custom UI

### 2.1: Application Shell Replacement

- [X] **U-001**: Replace app.component.html with custom tabbed layout
  - **Files**: `src/app/app.component.html`, `src/app/app.component.scss`
  - **Action**: Remove Angular boilerplate, create header with tab navigation (Home, Image Editor, Video Editor)
  - **Reference**: `quickstart.md` Step 2.1
  - **Dependencies**: S-005 (Tailwind configured)
  - **Test**: Tabs render and route correctly

- [ ] **U-002**: Configure lazy-loaded routes for feature modules
  - **Files**: `src/app/app.routes.ts`
  - **Action**: Define routes with lazy loading for home, image-editor, video-editor
  - **Reference**: `plan.md` (Project Structure)
  - **Test**: Routes load without errors, bundle splits into separate chunks

### 2.2: Shared Components (Can run in parallel **[P]**)

- [ ] **U-003**: [P] Create FileUploadComponent with drag-and-drop
  - **Files**: `src/app/shared/components/file-upload/file-upload.component.ts`
  - **Action**: Implement drag-drop directive, file picker, file validation (size, format)
  - **Reference**: `data-model.md` (File Upload Validation)
  - **Test**: Files upload via drag-drop and file picker

- [ ] **U-004**: [P] Create ProgressIndicatorComponent
  - **Files**: `src/app/shared/components/progress-indicator/progress-indicator.component.ts`
  - **Action**: Implement progress bar with percentage, estimated time, cancel button
  - **Test**: Progress updates in real-time during processing

- [ ] **U-005**: [P] Create ErrorMessageComponent
  - **Files**: `src/app/shared/components/error-message/error-message.component.ts`
  - **Action**: Implement error display with user-friendly messages, retry button
  - **Reference**: `data-model.md` (Error States)
  - **Test**: Errors display correctly with appropriate actions

- [ ] **U-006**: [P] Create LoadingSpinnerComponent
  - **Files**: `src/app/shared/components/loading-spinner/loading-spinner.component.ts`
  - **Action**: Implement spinner with optional message
  - **Test**: Spinner displays during async operations

---

## Phase 3: Image Editor Implementation

### 3.1: Image Editor Components

- [ ] **I-001**: Create ImageEditorComponent shell
  - **Files**: `src/app/features/image-editor/image-editor.component.ts`
  - **Action**: Create component with file upload zone, canvas preview, effect panels
  - **Reference**: `quickstart.md` Step 2.2
  - **Dependencies**: C-001 (PhotonService), U-003 (FileUploadComponent)
  - **Test**: Component loads and initializes PhotonService

- [ ] **I-002**: Create ImageCanvasComponent for preview
  - **Files**: `src/app/features/image-editor/components/image-canvas/image-canvas.component.ts`
  - **Action**: Implement canvas rendering with ImageData, zoom, pan controls
  - **Test**: Image displays on canvas with correct dimensions

- [ ] **I-003**: Create FilterPanelComponent
  - **Files**: `src/app/features/image-editor/components/filter-panel/filter-panel.component.ts`
  - **Action**: Implement filter buttons (grayscale, sepia, blur, sharpen) with intensity sliders
  - **Reference**: `spec.md` FR-005
  - **Test**: Filters apply with real-time preview <300ms

- [ ] **I-004**: Create ToolsPanelComponent for crop, rotate, resize
  - **Files**: `src/app/features/image-editor/components/tools-panel/tools-panel.component.ts`
  - **Action**: Implement crop with aspect ratio options, rotate buttons, resize dialog
  - **Reference**: `spec.md` FR-006
  - **Test**: All tools work correctly and maintain image quality

### 3.2: Image Processing Logic

- [ ] **I-005**: Create ImageProcessorService for effect chain management
  - **Files**: `src/app/features/image-editor/services/image-processor.service.ts`
  - **Action**: Implement effect chain application, undo/redo command pattern (10 operations max)
  - **Reference**: `data-model.md` (EffectChain, UndoRedoHistory)
  - **Dependencies**: C-003 (Photon methods)
  - **Test**: Effects apply in sequence, undo/redo works correctly

- [ ] **I-006**: Implement EffectChain model and Command pattern
  - **Files**: `src/app/features/image-editor/models/effect-chain.model.ts`, `src/app/features/image-editor/models/commands/`
  - **Action**: Create Effect interface, AddEffectCommand, RemoveEffectCommand, ModifyEffectCommand
  - **Reference**: `data-model.md` (EffectChain section)
  - **Test**: Commands execute, undo, redo correctly

- [ ] **I-007**: Add history panel for undo/redo UI
  - **Files**: `src/app/features/image-editor/components/history-panel/history-panel.component.ts`
  - **Action**: Display operation history, undo/redo buttons with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  - **Reference**: `spec.md` FR-008
  - **Test**: Undo/redo accessible via UI and keyboard

### 3.3: Image Editor Features

- [ ] **I-008**: Implement download functionality
  - **Files**: `src/app/features/image-editor/image-editor.component.ts`
  - **Action**: Export canvas to blob, trigger download with original/converted format options
  - **Reference**: `spec.md` FR-009
  - **Test**: Downloaded image matches preview

- [ ] **I-009**: Add preset management (save, apply, delete)
  - **Files**: `src/app/features/image-editor/services/preset.service.ts`
  - **Action**: Implement UserPreset CRUD operations, LocalStorage persistence
  - **Reference**: `data-model.md` (UserPreset)
  - **Dependencies**: C-007 (StorageService)
  - **Test**: Presets save, load, apply correctly

---

## Phase 4: Video Editor Implementation

### 4.1: Video Editor Components

- [ ] **V-001**: Create VideoEditorComponent shell
  - **Files**: `src/app/features/video-editor/video-editor.component.ts`
  - **Action**: Create component with video upload, player, timeline, format panel
  - **Dependencies**: C-004 (FFmpegService), U-003 (FileUploadComponent)
  - **Test**: Component loads and initializes FFmpegService

- [ ] **V-002**: Create VideoPlayerComponent with playback controls
  - **Files**: `src/app/features/video-editor/components/video-player/video-player.component.ts`
  - **Action**: Implement HTML5 video player with play/pause, seek, volume controls
  - **Test**: Video plays correctly with all controls functional

- [ ] **V-003**: Create TimelineComponent with trim markers
  - **Files**: `src/app/features/video-editor/components/timeline/timeline-component.ts`
  - **Action**: Implement seekable timeline with draggable start/end markers for trimming
  - **Reference**: `spec.md` User Story 3 (acceptance scenarios)
  - **Test**: Trim markers set correctly, preview updates

- [ ] **V-004**: Create FormatPanelComponent for conversion options
  - **Files**: `src/app/features/video-editor/components/format-panel/format-panel.component.ts`
  - **Action**: Implement format selection (MP4, WEBM, GIF), quality settings, codec options
  - **Reference**: `spec.md` FR-007
  - **Test**: Format options display correctly

### 4.2: Video Processing Logic

- [ ] **V-005**: Create VideoProcessorService for job management
  - **Files**: `src/app/features/video-editor/services/video-processor.service.ts`
  - **Action**: Implement JobQueue with ProcessingJob state management (queued, processing, completed, failed)
  - **Reference**: `data-model.md` (ProcessingJob)
  - **Dependencies**: C-006 (FFmpeg methods)
  - **Test**: Jobs queue and process sequentially

- [ ] **V-006**: Implement video trim operation
  - **Files**: `src/app/features/video-editor/services/video-processor.service.ts`
  - **Action**: Use FFmpeg to trim video by start/end timestamps with progress tracking
  - **Reference**: `research.md` section 2 (File I/O Patterns)
  - **Test**: Trimmed video downloads correctly

- [ ] **V-007**: Implement format conversion operation
  - **Files**: `src/app/features/video-editor/services/video-processor.service.ts`
  - **Action**: Convert between MP4, WEBM, GIF with configurable quality
  - **Reference**: `spec.md` FR-007
  - **Test**: Converted video plays in target format

- [ ] **V-008**: Implement frame extraction operation
  - **Files**: `src/app/features/video-editor/services/video-processor.service.ts`
  - **Action**: Extract frame at playhead position as JPEG/PNG
  - **Reference**: `spec.md` FR-007
  - **Test**: Extracted frame matches video timestamp

### 4.3: Video Editor Features

- [ ] **V-009**: Add processing queue UI with cancel functionality
  - **Files**: `src/app/features/video-editor/components/processing-queue/processing-queue.component.ts`
  - **Action**: Display active jobs with progress, estimated time, cancel button
  - **Reference**: `spec.md` FR-011
  - **Test**: Jobs display correctly, cancel stops processing

- [ ] **V-010**: Implement download functionality for processed videos
  - **Files**: `src/app/features/video-editor/video-editor.component.ts`
  - **Action**: Download processed video blob with original/target format
  - **Test**: Downloaded video matches preview

---

## Phase 5: Testing, Optimization, and Polish

### 5.1: Unit Testing (Can run in parallel **[P]**)

- [ ] **T-001**: [P] Write comprehensive unit tests for PhotonService
  - **Files**: `src/app/core/services/photon.service.spec.ts`
  - **Action**: Test all filters, error handling, memory management
  - **Reference**: `quickstart.md` Phase 3
  - **Target**: 100% code coverage
  - **Test**: All tests pass

- [ ] **T-002**: [P] Write comprehensive unit tests for FFmpegService
  - **Files**: `src/app/core/services/ffmpeg.service.spec.ts`
  - **Action**: Test all operations, progress tracking, error handling
  - **Target**: 100% code coverage
  - **Test**: All tests pass

- [ ] **T-003**: [P] Write unit tests for all shared components
  - **Files**: `src/app/shared/components/**/*.spec.ts`
  - **Action**: Test FileUpload, ProgressIndicator, ErrorMessage, LoadingSpinner
  - **Target**: >90% coverage
  - **Test**: All tests pass

- [ ] **T-004**: [P] Write unit tests for ImageEditor components
  - **Files**: `src/app/features/image-editor/**/*.spec.ts`
  - **Action**: Test all image editor components and services
  - **Target**: >90% coverage
  - **Test**: All tests pass

- [ ] **T-005**: [P] Write unit tests for VideoEditor components
  - **Files**: `src/app/features/video-editor/**/*.spec.ts`
  - **Action**: Test all video editor components and services
  - **Target**: >90% coverage
  - **Test**: All tests pass

### 5.2: Integration Testing

- [ ] **T-006**: Create WASM integration tests
  - **Files**: `tests/integration/wasm-integration.spec.ts`
  - **Action**: Test real Photon-WASM and FFmpeg-WASM integration with Angular services
  - **Reference**: `quickstart.md` Phase 3 (Integration Test example)
  - **Test**: All WASM operations work end-to-end

- [ ] **T-007**: Create image processing flow integration tests
  - **Files**: `tests/integration/image-processing-flow.spec.ts`
  - **Action**: Test upload → apply effects → download flow
  - **Test**: Complete flow works without errors

- [ ] **T-008**: Create video processing flow integration tests
  - **Files**: `tests/integration/video-processing-flow.spec.ts`
  - **Action**: Test upload → trim → convert → download flow
  - **Test**: Complete flow works without errors

### 5.3: E2E Testing with Playwright

- [ ] **T-009**: Set up Playwright for E2E testing
  - **Files**: `playwright.config.ts`, `tests/e2e/setup.ts`
  - **Action**: Install Playwright, configure for Angular app
  - **Test**: Playwright launches browser and navigates to app

- [ ] **T-010**: Create image editor E2E tests
  - **Files**: `tests/e2e/image-editor.e2e.spec.ts`
  - **Action**: Test complete user journey: upload, filter, crop, download
  - **Reference**: `spec.md` User Story 1 acceptance scenarios
  - **Test**: All acceptance scenarios pass

- [ ] **T-011**: Create video editor E2E tests
  - **Files**: `tests/e2e/video-editor.e2e.spec.ts`
  - **Action**: Test complete user journey: upload, trim, convert, download
  - **Reference**: `spec.md` User Story 3 acceptance scenarios
  - **Test**: All acceptance scenarios pass

- [ ] **T-012**: Create tab navigation E2E tests
  - **Files**: `tests/e2e/tab-navigation.e2e.spec.ts`
  - **Action**: Test tab switching with state preservation, browser back button
  - **Reference**: `spec.md` FR-016
  - **Test**: Navigation works correctly

### 5.4: Performance Optimization

- [ ] **P-001**: Measure and optimize bundle size
  - **Files**: `vite.config.ts`
  - **Action**: Run production build, analyze bundle with rollup-plugin-visualizer
  - **Target**: Main bundle <500KB gzipped (excluding WASM)
  - **Reference**: `spec.md` SC-009
  - **Test**: `bun run build` produces bundle <500KB

- [ ] **P-002**: Measure and optimize Time to Interactive (TTI)
  - **Action**: Run Lighthouse audit, optimize critical rendering path
  - **Target**: TTI <3 seconds on 3G network
  - **Reference**: `spec.md` SC-003
  - **Test**: Lighthouse Performance score >90

- [ ] **P-003**: Optimize real-time preview performance
  - **Files**: Image processing services
  - **Action**: Implement debouncing (100ms), reduced resolution preview (1024px max)
  - **Target**: Preview updates <300ms for files <10MB
  - **Reference**: `research.md` section 6 (Real-Time Preview)
  - **Test**: Manual testing with large images

- [ ] **P-004**: Implement memory leak prevention
  - **Files**: All WASM services
  - **Action**: Add explicit cleanup in ngOnDestroy, monitor memory with Chrome DevTools
  - **Reference**: `research.md` section 7 (Memory Leaks)
  - **Test**: Memory stabilizes after multiple operations

### 5.5: Accessibility

- [ ] **A-001**: Implement keyboard navigation
  - **Files**: All components
  - **Action**: Add keyboard handlers (Tab, Enter, Space, Escape, Ctrl+Z, Ctrl+Y)
  - **Reference**: `spec.md` FR-014
  - **Test**: All features accessible via keyboard

- [ ] **A-002**: Add ARIA labels and screen reader announcements
  - **Files**: All components
  - **Action**: Add aria-label, aria-describedby, role attributes, live region announcements
  - **Reference**: `spec.md` FR-015
  - **Test**: Screen reader announces all state changes

- [ ] **A-003**: Run automated accessibility testing
  - **Action**: Install and run axe DevTools, WAVE browser extension
  - **Target**: Zero errors for WCAG 2.1 Level AA
  - **Reference**: `spec.md` SC-005
  - **Test**: No accessibility errors detected

### 5.6: Cross-Browser Testing

- [ ] **B-001**: Test on Chrome 90+
  - **Action**: Manual testing of all features
  - **Test**: All features work correctly

- [ ] **B-002**: Test on Firefox 88+
  - **Action**: Manual testing of all features
  - **Test**: All features work correctly

- [ ] **B-003**: Test on Safari 14+
  - **Action**: Manual testing of all features (especially SharedArrayBuffer fallback)
  - **Test**: All features work correctly

- [ ] **B-004**: Test on Edge 90+
  - **Action**: Manual testing of all features
  - **Test**: All features work correctly

### 5.7: Final Validation

- [ ] **F-001**: Verify all Success Criteria met
  - **Reference**: `spec.md` Success Criteria (SC-001 through SC-012)
  - **Action**: Check each SC against implementation
  - **Test**: All 12 success criteria verified

- [ ] **F-002**: Verify all Functional Requirements implemented
  - **Reference**: `spec.md` Functional Requirements (FR-001 through FR-020)
  - **Action**: Check each FR against implementation
  - **Test**: All 20 functional requirements verified

- [ ] **F-003**: Run full test suite
  - **Action**: Execute `bun test` for unit + integration tests
  - **Target**: All tests pass, >90% coverage
  - **Test**: Test suite passes

- [ ] **F-004**: Run E2E test suite
  - **Action**: Execute `bun run test:e2e`
  - **Target**: All user journeys pass
  - **Test**: E2E suite passes

- [ ] **F-005**: Update documentation
  - **Files**: `README.md`, `specs/001-wasm-media-editor/`
  - **Action**: Document setup, usage, architecture, known issues
  - **Test**: Documentation is accurate and complete

---

## Task Summary

### Phase Breakdown
- **Phase 0 (Setup)**: 5 tasks
- **Phase 1 (Core WASM Services)**: 8 tasks
- **Phase 2 (Remove Boilerplate & Custom UI)**: 6 tasks
- **Phase 3 (Image Editor)**: 9 tasks
- **Phase 4 (Video Editor)**: 10 tasks
- **Phase 5 (Testing & Polish)**: 24 tasks

**Total Tasks**: 62

### Parallel Tasks
Tasks marked **[P]** can run in parallel:
- U-003 through U-006 (Shared components) - 4 tasks
- T-001 through T-005 (Unit testing) - 5 tasks

### Critical Path
1. Setup (S-001 → S-005) → 2. WASM Services (C-001 → C-008) → 3. UI Replacement (U-001 → U-006) → 4. Feature Implementation (I-001 → V-010) → 5. Testing & Optimization (T-001 → F-005)

### Estimated Timeline
- **Phase 0**: 1-2 hours
- **Phase 1**: 4-6 hours
- **Phase 2**: 3-4 hours
- **Phase 3**: 6-8 hours
- **Phase 4**: 8-10 hours
- **Phase 5**: 8-12 hours

**Total Estimated Time**: 30-42 hours

---

## Success Validation

Before marking this feature complete, verify:

✅ All 62 tasks marked [X]  
✅ All tests pass (unit, integration, E2E)  
✅ Bundle size <500KB (main bundle, gzipped)  
✅ TTI <3 seconds (Lighthouse score >90)  
✅ Zero accessibility errors (WCAG 2.1 AA)  
✅ Cross-browser compatible (Chrome, Firefox, Safari, Edge)  
✅ All 20 Functional Requirements implemented  
✅ All 12 Success Criteria met  
✅ Documentation complete and accurate

---

## Notes

- **TDD Approach**: Write tests before implementation (marked as "TDD" in actions)
- **Constitution Compliance**: All tasks align with constitution principles (testability, performance, accessibility, developer experience)
- **WASM Priority**: Phase 1 focuses on correct Photon-WASM and FFmpeg-WASM implementation as requested
- **Boilerplate Removal**: Phase 2 explicitly removes Angular boilerplate and replaces with custom UI
- **Robust Testing**: Phase 5 ensures everything works robustly with comprehensive test coverage

## References

- Specification: `spec.md`
- Technical Plan: `plan.md`
- Research: `research.md`
- Data Model: `data-model.md`
- Developer Guide: `quickstart.md`
- Constitution: `.specify/memory/constitution.md`
