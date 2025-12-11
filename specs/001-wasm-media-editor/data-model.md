# Data Model: WASM Media Editor

**Feature**: 001-wasm-media-editor  
**Date**: 2025-12-10  
**Purpose**: Define entities, relationships, state management, and validation rules

## Overview

This document defines the core data structures for the WASM Media Editor application. All entities are TypeScript interfaces/classes designed for client-side state management with browser LocalStorage persistence.

## Core Entities

### 1. MediaAsset

Represents an uploaded image or video file with its metadata and current processing state.

**Attributes**:

| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `id` | `string` | Unique identifier (UUID v4) | Required, unique |
| `type` | `'image' \| 'video'` | Media type discriminator | Required |
| `format` | `string` | File format (e.g., 'jpeg', 'png', 'mp4') | Required, lowercase |
| `originalFile` | `File` | Original uploaded file reference | Required, max 50MB (images), 200MB (videos) |
| `originalSize` | `number` | File size in bytes | Required, > 0 |
| `width` | `number` | Media width in pixels | Required, > 0, ≤ 7680 |
| `height` | `number` | Media height in pixels | Required, > 0, ≤ 4320 |
| `duration` | `number \| null` | Video duration in seconds (null for images) | Optional, ≥ 0, ≤ 600 |
| `uploadedAt` | `Date` | Upload timestamp | Required |
| `state` | `MediaAssetState` | Current asset state | Required |
| `thumbnail` | `string` | Data URL for thumbnail preview | Required |
| `currentImageData` | `ImageData \| null` | Current processed image data (images only) | Optional |
| `originalImageData` | `ImageData \| null` | Original image data for reset (images only) | Optional |

**State Enum**:
```typescript
enum MediaAssetState {
  UPLOADING = 'uploading',
  READY = 'ready',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  ERROR = 'error'
}
```

**State Transitions**:
```
UPLOADING → READY (upload complete)
READY → PROCESSING (effect/operation started)
PROCESSING → PROCESSED (operation complete)
PROCESSING → ERROR (operation failed)
PROCESSED → PROCESSING (new operation started)
PROCESSED → READY (reset to original)
ERROR → READY (user retry)
```

**Validation Rules**:
1. `id` must be valid UUID v4 format
2. `originalSize` must not exceed limits (50MB images, 200MB videos)
3. `width` and `height` must be within 1-7680 and 1-4320 respectively (8K max)
4. `format` must be in allowed lists: `['jpeg', 'jpg', 'png', 'gif', 'webp']` (images) or `['mp4', 'mov', 'webm']` (videos)
5. `duration` required for videos, null for images
6. `thumbnail` must be valid data URL with format `data:image/[format];base64,[data]`

**Storage Strategy**:
- MediaAsset metadata persisted in LocalStorage (max 5 recent sessions)
- Large files (originalFile, currentImageData) kept in memory only
- Thumbnails stored as base64 data URLs (<50KB each)

**Relationships**:
- 1-to-1 with `EffectChain` (one asset has one effect chain)
- N-to-1 with `EditSession` (session contains one asset at a time)

---

### 2. EffectChain

Represents the ordered sequence of editing operations applied to a MediaAsset.

**Attributes**:

| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `assetId` | `string` | Foreign key to MediaAsset | Required, valid UUID |
| `effects` | `Effect[]` | Ordered list of effects | Required, max 50 effects |
| `createdAt` | `Date` | Chain creation timestamp | Required |
| `lastModified` | `Date` | Last modification timestamp | Required |

**Effect Interface**:
```typescript
interface Effect {
  id: string;                    // UUID v4
  type: EffectType;              // Filter, Transform, Adjustment
  name: string;                  // Effect name (e.g., 'grayscale', 'crop')
  parameters: Record<string, number | string | boolean>;  // Effect-specific params
  appliedAt: Date;               // Application timestamp
  isActive: boolean;             // Can be temporarily disabled
}
```

**Effect Types**:
```typescript
enum EffectType {
  FILTER = 'filter',           // Grayscale, sepia, blur, sharpen
  TRANSFORM = 'transform',     // Crop, rotate, flip, resize
  ADJUSTMENT = 'adjustment'    // Brightness, contrast, saturation, hue
}
```

**Example Effects with Parameters**:

```typescript
// Filter effect
{
  id: 'ef-123',
  type: EffectType.FILTER,
  name: 'grayscale',
  parameters: {},
  appliedAt: new Date(),
  isActive: true
}

// Transform effect
{
  id: 'ef-456',
  type: EffectType.TRANSFORM,
  name: 'crop',
  parameters: {
    x: 100,
    y: 100,
    width: 800,
    height: 600,
    aspectRatio: 'free'  // 'free' | '1:1' | '4:3' | '16:9'
  },
  appliedAt: new Date(),
  isActive: true
}

// Adjustment effect
{
  id: 'ef-789',
  type: EffectType.ADJUSTMENT,
  name: 'brightness',
  parameters: {
    value: 20,  // Range: -100 to 100
    intensity: 0.8  // Range: 0 to 1
  },
  appliedAt: new Date(),
  isActive: true
}
```

**Validation Rules**:
1. Maximum 50 effects per chain (performance limit)
2. Each effect must have unique `id`
3. Effect parameters must match schema for effect type
4. `lastModified` must be ≥ `createdAt`

**Operations**:
- `addEffect(effect: Effect): void` - Append effect to chain
- `removeEffect(effectId: string): void` - Remove effect by ID
- `reorderEffects(fromIndex: number, toIndex: number): void` - Change effect order
- `toggleEffect(effectId: string): void` - Enable/disable effect without removing
- `clearEffects(): void` - Remove all effects

**Storage Strategy**:
- Full effect chain persisted in LocalStorage with MediaAsset
- Reconstructed on session restore

**Relationships**:
- 1-to-1 with `MediaAsset`
- Used by `UndoRedoHistory` to track changes

---

### 3. UserPreset

Represents a saved collection of effects that can be reused across editing sessions.

**Attributes**:

| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `id` | `string` | Unique preset identifier | Required, UUID v4 |
| `name` | `string` | User-defined preset name | Required, 1-50 characters |
| `description` | `string \| null` | Optional preset description | Optional, max 200 characters |
| `effectChainDefinition` | `Effect[]` | Array of effect definitions | Required, 1-50 effects |
| `thumbnail` | `string \| null` | Preview image data URL | Optional, <50KB |
| `category` | `PresetCategory` | Preset category for organization | Required |
| `createdAt` | `Date` | Creation timestamp | Required |
| `lastUsed` | `Date \| null` | Last application timestamp | Optional |
| `usageCount` | `number` | Times preset has been applied | Required, ≥ 0 |
| `isBuiltIn` | `boolean` | System preset vs user-created | Required, default false |

**Preset Categories**:
```typescript
enum PresetCategory {
  FILTER = 'filter',         // Color filters (vintage, b&w, etc.)
  PORTRAIT = 'portrait',     // Portrait enhancements
  LANDSCAPE = 'landscape',   // Landscape optimizations
  ARTISTIC = 'artistic',     // Creative effects
  CORRECTION = 'correction', // Color/exposure corrections
  CUSTOM = 'custom'          // User-defined
}
```

**Validation Rules**:
1. `name` must be unique per user
2. `name` cannot be empty or whitespace-only
3. `effectChainDefinition` must contain at least 1 effect
4. `usageCount` cannot be negative
5. Built-in presets (`isBuiltIn: true`) cannot be deleted
6. `description` limited to 200 characters

**Operations**:
- `apply(asset: MediaAsset): EffectChain` - Apply preset to asset
- `duplicate(newName: string): UserPreset` - Create copy with new name
- `export(): string` - Serialize to JSON for sharing
- `import(json: string): UserPreset` - Deserialize from JSON

**Storage Strategy**:
- All presets stored in LocalStorage key `wasm-editor-presets`
- Maximum 100 custom presets (delete oldest if exceeded)
- Built-in presets bundled with application (not deletable)

**Relationships**:
- Independent entity (no foreign keys)
- Referenced by `EditSession` when preset is applied

---

### 4. EditSession

Represents a user's editing workspace state including asset, effects, and history.

**Attributes**:

| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `id` | `string` | Unique session identifier | Required, UUID v4 |
| `asset` | `MediaAsset` | Currently loaded media asset | Required |
| `effectChain` | `EffectChain` | Current effect chain | Required |
| `history` | `UndoRedoHistory` | Undo/redo operation history | Required |
| `createdAt` | `Date` | Session creation time | Required |
| `lastModified` | `Date` | Last modification time | Required |
| `state` | `SessionState` | Current session state | Required |
| `activePreset` | `string \| null` | Currently applied preset ID | Optional |

**Session States**:
```typescript
enum SessionState {
  ACTIVE = 'active',       // Currently being edited
  SAVED = 'saved',         // Saved but not active
  ABANDONED = 'abandoned'  // User navigated away without saving
}
```

**State Transitions**:
```
ACTIVE → SAVED (user saves session)
ACTIVE → ABANDONED (user navigates away)
SAVED → ACTIVE (user resumes session)
ABANDONED → ACTIVE (user restores abandoned session)
```

**Validation Rules**:
1. Only one session can be ACTIVE at a time per browser tab
2. `lastModified` must be ≥ `createdAt`
3. Maximum 5 saved sessions in LocalStorage (oldest auto-deleted)
4. Abandoned sessions auto-deleted after 24 hours

**Operations**:
- `save(): void` - Persist session to LocalStorage
- `resume(): void` - Restore session to active state
- `abandon(): void` - Mark session as abandoned
- `duplicate(): EditSession` - Create copy of current session

**Storage Strategy**:
- Active session persisted on every change (debounced 500ms)
- Recent sessions list stored in LocalStorage key `wasm-editor-sessions`
- Thumbnails generated for session previews

**Relationships**:
- 1-to-1 with `MediaAsset` (composition)
- 1-to-1 with `EffectChain` (composition)
- 1-to-1 with `UndoRedoHistory` (composition)
- N-to-1 with `UserPreset` (optional reference)

---

### 5. UndoRedoHistory

Manages undo/redo functionality using Command pattern.

**Attributes**:

| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `commands` | `Command[]` | Stack of executed commands | Required, max 10 |
| `currentIndex` | `number` | Current position in history | Required, -1 to commands.length-1 |

**Command Interface**:
```typescript
interface Command {
  id: string;                           // UUID v4
  type: CommandType;                    // ADD_EFFECT, REMOVE_EFFECT, etc.
  timestamp: Date;                      // Execution time
  execute(): void;                      // Apply command
  undo(): void;                         // Reverse command
  redo(): void;                         // Reapply command
  getDescription(): string;             // Human-readable description
  canExecute(): boolean;                // Validation before execution
  serialize(): CommandState;            // For persistence
  deserialize(state: CommandState): void; // For restoration
}
```

**Command Types**:
```typescript
enum CommandType {
  ADD_EFFECT = 'add_effect',
  REMOVE_EFFECT = 'remove_effect',
  MODIFY_EFFECT = 'modify_effect',
  REORDER_EFFECTS = 'reorder_effects',
  APPLY_PRESET = 'apply_preset',
  RESET_ALL = 'reset_all'
}
```

**Example Commands**:

```typescript
class AddEffectCommand implements Command {
  constructor(
    private effectChain: EffectChain,
    private effect: Effect
  ) {}

  execute(): void {
    this.effectChain.addEffect(this.effect);
  }

  undo(): void {
    this.effectChain.removeEffect(this.effect.id);
  }

  redo(): void {
    this.execute();
  }

  getDescription(): string {
    return `Add ${this.effect.name} effect`;
  }
}
```

**Validation Rules**:
1. Maximum 10 commands in history (constitution requirement)
2. Commands after `currentIndex` are discarded when new command executed
3. Cannot undo when `currentIndex === -1`
4. Cannot redo when `currentIndex === commands.length - 1`

**Operations**:
- `execute(command: Command): void` - Execute new command and add to history
- `undo(): boolean` - Undo last command (returns success)
- `redo(): boolean` - Redo next command (returns success)
- `canUndo(): boolean` - Check if undo is available
- `canRedo(): boolean` - Check if redo is available
- `clear(): void` - Reset history
- `getHistory(): Command[]` - Get all commands up to currentIndex

**Storage Strategy**:
- Command history serialized with EditSession
- Only command metadata stored (not full image data)
- Original image cached for reset functionality

**Relationships**:
- Owned by `EditSession` (composition)
- Operates on `EffectChain`

---

### 6. ProcessingJob

Represents an asynchronous video processing operation (FFmpeg).

**Attributes**:

| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `id` | `string` | Unique job identifier | Required, UUID v4 |
| `type` | `JobType` | Type of processing operation | Required |
| `assetId` | `string` | Foreign key to MediaAsset | Required, valid UUID |
| `status` | `JobStatus` | Current job status | Required |
| `progress` | `number` | Completion percentage | Required, 0-100 |
| `estimatedTime` | `number \| null` | Estimated seconds remaining | Optional, ≥ 0 |
| `startedAt` | `Date \| null` | Job start timestamp | Optional |
| `completedAt` | `Date \| null` | Job completion timestamp | Optional |
| `errorMessage` | `string \| null` | Error description if failed | Optional, max 500 characters |
| `inputParams` | `Record<string, any>` | Job-specific input parameters | Required |
| `outputBlob` | `Blob \| null` | Resulting video blob | Optional |

**Job Types**:
```typescript
enum JobType {
  TRIM = 'trim',                 // Trim video by timeline markers
  CONVERT = 'convert',           // Convert video format
  EXTRACT_FRAME = 'extract_frame', // Extract single frame as image
  COMPRESS = 'compress'          // Reduce video file size
}
```

**Job Statuses**:
```typescript
enum JobStatus {
  QUEUED = 'queued',       // Waiting to start
  PROCESSING = 'processing', // Currently executing
  COMPLETED = 'completed',   // Finished successfully
  FAILED = 'failed',         // Error occurred
  CANCELLED = 'cancelled'    // User cancelled
}
```

**Status Transitions**:
```
QUEUED → PROCESSING (job started)
PROCESSING → COMPLETED (success)
PROCESSING → FAILED (error)
PROCESSING → CANCELLED (user action)
QUEUED → CANCELLED (cancelled before start)
```

**Example Job Parameters**:

```typescript
// Trim job
{
  type: JobType.TRIM,
  inputParams: {
    startTime: 5.5,    // seconds
    endTime: 15.2,     // seconds
    outputFormat: 'mp4'
  }
}

// Convert job
{
  type: JobType.CONVERT,
  inputParams: {
    outputFormat: 'webm',
    quality: 'high',  // 'low' | 'medium' | 'high'
    codec: 'vp9'
  }
}

// Extract frame job
{
  type: JobType.EXTRACT_FRAME,
  inputParams: {
    timestamp: 10.5,   // seconds
    format: 'jpeg',
    quality: 90        // 1-100
  }
}
```

**Validation Rules**:
1. `progress` must be 0-100
2. `completedAt` must be ≥ `startedAt`
3. `errorMessage` required when status is FAILED
4. `outputBlob` required when status is COMPLETED
5. Cannot transition from COMPLETED/FAILED/CANCELLED to other states

**Operations**:
- `start(): Promise<void>` - Begin processing
- `cancel(): void` - Cancel in-progress job
- `retry(): ProcessingJob` - Create new job with same parameters
- `getResult(): Blob | null` - Retrieve output blob

**Storage Strategy**:
- Job metadata persisted in LocalStorage during processing
- Output blobs kept in memory only (not persisted)
- Completed jobs auto-deleted after 1 hour

**Relationships**:
- N-to-1 with `MediaAsset` (one asset can have multiple jobs)
- Managed by `JobQueue` service

---

## Derived State

### Browser Storage Schema

**LocalStorage Keys**:
- `wasm-editor-sessions`: Array of EditSession metadata
- `wasm-editor-presets`: Array of UserPreset objects
- `wasm-editor-settings`: User preferences (theme, default quality, etc.)
- `wasm-editor-recent-files`: Array of recent MediaAsset metadata (last 5)

**LocalStorage Size Budget**: 5MB total
- Sessions: ~1MB (5 sessions × 200KB each)
- Presets: ~500KB (100 presets × 5KB each)
- Settings: ~10KB
- Recent files: ~250KB (5 files × 50KB thumbnail each)
- Reserve: ~3.24MB for future use

### State Management

**Angular Signals Strategy**:
```typescript
// Global state service
@Injectable({ providedIn: 'root' })
export class EditorStateService {
  // Current session
  readonly currentSession = signal<EditSession | null>(null);
  
  // Recent sessions
  readonly recentSessions = signal<EditSession[]>([]);
  
  // User presets
  readonly presets = signal<UserPreset[]>([]);
  
  // Active processing jobs
  readonly processingJobs = signal<ProcessingJob[]>([]);
  
  // Computed signals
  readonly canUndo = computed(() => 
    this.currentSession()?.history.canUndo() ?? false
  );
  
  readonly canRedo = computed(() => 
    this.currentSession()?.history.canRedo() ?? false
  );
  
  readonly isProcessing = computed(() => 
    this.processingJobs().some(job => job.status === JobStatus.PROCESSING)
  );
}
```

**State Persistence**:
- Auto-save current session every 5 seconds (debounced)
- Persist on browser navigation events (beforeunload)
- Restore most recent session on app load

## Validation Summary

### File Upload Validation

```typescript
interface FileValidationRules {
  images: {
    formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    maxSize: 50 * 1024 * 1024;  // 50MB
    maxWidth: 7680;
    maxHeight: 4320;
  };
  videos: {
    formats: ['mp4', 'mov', 'webm'];
    maxSize: 200 * 1024 * 1024;  // 200MB
    maxWidth: 7680;
    maxHeight: 4320;
    maxDuration: 600;  // 10 minutes
  };
}
```

### Effect Parameter Validation

```typescript
interface EffectParameterRules {
  brightness: { min: -100, max: 100, default: 0 };
  contrast: { min: -100, max: 100, default: 0 };
  saturation: { min: -100, max: 100, default: 0 };
  hue: { min: 0, max: 360, default: 0 };
  blur: { min: 0, max: 100, default: 0 };
  rotate: { values: [0, 90, 180, 270], default: 0 };
  quality: { min: 1, max: 100, default: 90 };
}
```

## Error States

All entities must handle error states gracefully:

```typescript
interface EntityError {
  entity: string;        // Entity name
  field: string | null;  // Field with error (null for entity-level)
  code: string;          // Error code (VALIDATION_FAILED, SIZE_EXCEEDED, etc.)
  message: string;       // User-friendly error message
  technical: string;     // Technical details for debugging
}
```

Common error codes:
- `VALIDATION_FAILED`: Input validation failed
- `SIZE_EXCEEDED`: File/data too large
- `FORMAT_UNSUPPORTED`: File format not supported
- `WASM_LOAD_FAILED`: WASM module initialization failed
- `PROCESSING_FAILED`: Processing operation failed
- `STORAGE_FULL`: LocalStorage quota exceeded
- `MEMORY_EXCEEDED`: Browser memory limit reached

## Conclusion

This data model provides a complete foundation for client-side media editing with WASM. All entities are designed for:
- **Type Safety**: Full TypeScript interfaces
- **Validation**: Clear constraints and rules
- **Persistence**: LocalStorage strategy with size budgets
- **Performance**: Memory-efficient storage, limited history depth
- **User Experience**: Clear error states, progress tracking
- **Testability**: Well-defined operations and state transitions

Next step: Generate TypeScript interface contracts in `contracts/` directory.
