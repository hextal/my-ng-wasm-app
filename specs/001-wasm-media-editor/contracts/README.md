# TypeScript Interface Contracts

**Feature**: 001-wasm-media-editor  
**Purpose**: Define TypeScript interfaces for type-safe development

This directory contains TypeScript interface definitions extracted from the data model. These contracts establish clear boundaries between services, components, and data structures.

## Contract Files

### Core Interfaces
1. **media-asset.interface.ts** - MediaAsset entity and MediaAssetState enum
2. **effect-chain.interface.ts** - EffectChain, Effect, EffectType enum
3. **user-preset.interface.ts** - UserPreset and PresetCategory enum
4. **edit-session.interface.ts** - EditSession and SessionState enum
5. **undo-redo.interface.ts** - UndoRedoHistory, Command, CommandType enum
6. **processing-job.interface.ts** - ProcessingJob, JobType, JobStatus enums

### Service Interfaces
7. **wasm-services.interface.ts** - IPhotonService, IFFmpegService interfaces
8. **storage.interface.ts** - IStorageService, LocalStorageSchema
9. **state-management.interface.ts** - IEditorStateService, global state

### Validation Interfaces
10. **validation.interface.ts** - FileValidationRules, EffectParameterRules, EntityError

## Usage

Import contracts in your TypeScript files:

```typescript
import { MediaAsset, MediaAssetState } from '@contracts/media-asset.interface';
import { EffectChain, Effect, EffectType } from '@contracts/effect-chain.interface';
import { IPhotonService } from '@contracts/wasm-services.interface';
```

## Contract Summary

### 1. media-asset.interface.ts

```typescript
export enum MediaAssetState {
  UPLOADING = 'uploading',
  READY = 'ready',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  ERROR = 'error'
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  format: string;
  originalFile: File;
  originalSize: number;
  width: number;
  height: number;
  duration: number | null;
  uploadedAt: Date;
  state: MediaAssetState;
  thumbnail: string;
  currentImageData: ImageData | null;
  originalImageData: ImageData | null;
}
```

### 2. effect-chain.interface.ts

```typescript
export enum EffectType {
  FILTER = 'filter',
  TRANSFORM = 'transform',
  ADJUSTMENT = 'adjustment'
}

export interface Effect {
  id: string;
  type: EffectType;
  name: string;
  parameters: Record<string, number | string | boolean>;
  appliedAt: Date;
  isActive: boolean;
}

export interface EffectChain {
  assetId: string;
  effects: Effect[];
  createdAt: Date;
  lastModified: Date;
  addEffect(effect: Effect): void;
  removeEffect(effectId: string): void;
  reorderEffects(fromIndex: number, toIndex: number): void;
  toggleEffect(effectId: string): void;
  clearEffects(): void;
}
```

### 3. user-preset.interface.ts

```typescript
export enum PresetCategory {
  FILTER = 'filter',
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  ARTISTIC = 'artistic',
  CORRECTION = 'correction',
  CUSTOM = 'custom'
}

export interface UserPreset {
  id: string;
  name: string;
  description: string | null;
  effectChainDefinition: Effect[];
  thumbnail: string | null;
  category: PresetCategory;
  createdAt: Date;
  lastUsed: Date | null;
  usageCount: number;
  isBuiltIn: boolean;
}
```

### 4. processing-job.interface.ts

```typescript
export enum JobType {
  TRIM = 'trim',
  CONVERT = 'convert',
  EXTRACT_FRAME = 'extract_frame',
  COMPRESS = 'compress'
}

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ProcessingJob {
  id: string;
  type: JobType;
  assetId: string;
  status: JobStatus;
  progress: number;
  estimatedTime: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  inputParams: Record<string, any>;
  outputBlob: Blob | null;
}
```

### 5. wasm-services.interface.ts

```typescript
export interface IPhotonService {
  readonly isReady: Signal<boolean>;
  readonly isLoading: Signal<boolean>;
  readonly loadError: Signal<Error | null>;
  
  initialize(): Promise<void>;
  processImage(imageData: ImageData, effect: string): ImageData;
  applyFilter(imageData: ImageData, filterName: string, intensity?: number): ImageData;
  cropImage(imageData: ImageData, x: number, y: number, width: number, height: number): ImageData;
  rotateImage(imageData: ImageData, degrees: 90 | 180 | 270): ImageData;
  resizeImage(imageData: ImageData, width: number, height: number): ImageData;
  dispose(): void;
}

export interface IFFmpegService {
  readonly isReady: Signal<boolean>;
  readonly isLoading: Signal<boolean>;
  readonly currentProgress: Signal<FFmpegProgress | null>;
  
  initialize(useMultiThread?: boolean): Promise<void>;
  transcodeVideo(inputFile: File, outputFormat: string, options?: TranscodeOptions): Promise<Blob>;
  trimVideo(inputFile: File, startTime: number, endTime: number): Promise<Blob>;
  extractFrame(inputFile: File, timestamp: number): Promise<Blob>;
  terminate(): void;
}

export interface FFmpegProgress {
  progress: number;
  time: number;
}
```

### 6. validation.interface.ts

```typescript
export interface FileValidationRules {
  images: {
    formats: string[];
    maxSize: number;
    maxWidth: number;
    maxHeight: number;
  };
  videos: {
    formats: string[];
    maxSize: number;
    maxWidth: number;
    maxHeight: number;
    maxDuration: number;
  };
}

export interface EffectParameterRules {
  [effectName: string]: {
    min?: number;
    max?: number;
    default: number;
    values?: any[];
  };
}

export interface EntityError {
  entity: string;
  field: string | null;
  code: string;
  message: string;
  technical: string;
}
```

### 7. state-management.interface.ts

```typescript
export interface IEditorStateService {
  readonly currentSession: Signal<EditSession | null>;
  readonly recentSessions: Signal<EditSession[]>;
  readonly presets: Signal<UserPreset[]>;
  readonly processingJobs: Signal<ProcessingJob[]>;
  readonly canUndo: Signal<boolean>;
  readonly canRedo: Signal<boolean>;
  readonly isProcessing: Signal<boolean>;
  
  createSession(asset: MediaAsset): EditSession;
  saveSession(session: EditSession): void;
  loadSession(sessionId: string): Promise<EditSession>;
  deleteSession(sessionId: string): void;
  
  addPreset(preset: UserPreset): void;
  deletePreset(presetId: string): void;
  applyPreset(presetId: string): void;
  
  executeCommand(command: Command): void;
  undo(): void;
  redo(): void;
}
```

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@contracts/*": ["specs/001-wasm-media-editor/contracts/*"]
    }
  }
}
```

## Implementation Notes

1. **Signals**: All reactive state uses Angular signals (`signal()`, `computed()`)
2. **Readonly**: Service interfaces expose readonly signals to prevent external mutation
3. **Type Safety**: Strict TypeScript mode enforced (no `any` types except in generic Record)
4. **Enums**: Use string enums for better debugging and serialization
5. **Dates**: All timestamps use `Date` objects (not timestamps or ISO strings)
6. **Nullable**: Use `| null` explicitly (not `undefined`) for optional values

## Contract Enforcement

All implementations must:
- Implement interface contracts exactly (no extra public methods beyond interface)
- Validate inputs against constraints from data-model.md
- Throw typed errors matching EntityError interface
- Use dependency injection for testability
- Provide mock implementations for testing

## Next Steps

1. Implement services using these contracts
2. Create mock factories for testing
3. Generate API documentation from interfaces (TypeDoc)
4. Validate constraints with runtime validation (Zod or class-validator)
