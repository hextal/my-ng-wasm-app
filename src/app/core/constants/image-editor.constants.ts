/**
 * Image Editor Constants
 * 
 * Centralized constants to prevent magic numbers and ensure consistency
 * across the image editor application.
 * 
 * IMPORTANT: These values have been carefully chosen based on:
 * - User experience testing
 * - Performance benchmarks
 * - Memory constraints
 * - Visual quality requirements
 * 
 * DO NOT modify these values without:
 * 1. Documenting the rationale
 * 2. Updating related tests
 * 3. Verifying performance impact
 * 4. Getting user feedback
 */

/**
 * Thumbnail Preview Configuration
 * 
 * CONTEXT: Thumbnail size was increased from 150px to 200px on 2025-12-18
 * to fix bug where filter effects were barely visible in previews.
 * 
 * At 200px:
 * - Filter effects are clearly distinguishable
 * - Memory usage: ~160KB per thumbnail (acceptable)
 * - Total memory for 31 thumbnails: ~4.96MB
 * - Performance: Parallel generation completes in <2s on modern hardware
 */
export const THUMBNAIL_PREVIEW = {
  /**
   * Minimum thumbnail size for adequate filter visibility
   * DO NOT reduce below 200px - filters become imperceptible
   * Reference: .specify/memory/bug-filter-thumbnail-preview-2025-12-18.md
   */
  MIN_SIZE: 200,
  
  /**
   * Default/current thumbnail preview size
   * Provides 78% more pixels than the old 150px size
   */
  DEFAULT_SIZE: 200,
  
  /**
   * Maximum thumbnail size before performance degrades
   * Above 300px, generation time increases noticeably
   */
  MAX_SIZE: 300,
  
  /**
   * Quality setting for thumbnail JPEG/PNG encoding
   * 0.85 provides good visual quality with reasonable file size
   */
  QUALITY: 0.85,
  
  /**
   * Number of filters + original (30 Photon filters + 1 original)
   */
  FILTER_COUNT: 31,
  
  /**
   * Estimated memory per thumbnail in bytes (RGBA at 200x200)
   */
  MEMORY_PER_THUMBNAIL: 160_000, // 200 * 200 * 4
  
  /**
   * Total memory budget for all thumbnails in MB
   * Should stay under 10MB for smooth performance
   */
  TOTAL_MEMORY_BUDGET_MB: 10,
} as const;

/**
 * Image Processing Configuration
 */
export const IMAGE_PROCESSING = {
  /**
   * Maximum image dimension for web display (width or height)
   * Larger images are scaled down to prevent memory issues
   */
  MAX_DISPLAY_DIMENSION: 4096,
  
  /**
   * Maximum file size in bytes (50MB)
   * Larger files are rejected to prevent browser crashes
   */
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  
  /**
   * Timeout for WASM operations in milliseconds
   * Prevents infinite hangs on corrupted/malicious images
   */
  WASM_OPERATION_TIMEOUT: 30_000,
  
  /**
   * Default JPEG quality for exports (0-1)
   */
  DEFAULT_JPEG_QUALITY: 0.9,
  
  /**
   * Default PNG compression level (0-9)
   */
  DEFAULT_PNG_COMPRESSION: 6,
} as const;

/**
 * Filter Categories
 * 
 * Photon-WASM provides 30 filters across 3 categories:
 * - Special Effects (4): solarize, oil, pixelize, sepia
 * - Standalone Functions (10): lix, neue, ryo, lofi, golden, cali, dramatic, pastel_pink, firenze, obsidian
 * - Named Filters (15): oceanic, islands, marine, seagreen, flagblue, liquid, diamante, radio, twenties, rosetint, mauve, bluechrome, vintage, perfume, serenity
 */
export const FILTER_CATEGORIES = {
  SPECIAL_EFFECTS: ['solarize', 'oil', 'pixelize', 'sepia'] as const,
  
  STANDALONE_FUNCTIONS: [
    'lix', 'neue', 'ryo', 'lofi', 'golden',
    'cali', 'dramatic', 'pastel_pink', 'firenze', 'obsidian'
  ] as const,
  
  NAMED_FILTERS: [
    'oceanic', 'islands', 'marine', 'seagreen', 'flagblue',
    'liquid', 'diamante', 'radio', 'twenties', 'rosetint',
    'mauve', 'bluechrome', 'vintage', 'perfume', 'serenity'
  ] as const,
  
  CORE_ADJUSTMENTS: ['grayscale', 'brighten', 'darken', 'contrast'] as const,
} as const;

/**
 * Total count of all filters
 */
export const TOTAL_FILTER_COUNT = 
  FILTER_CATEGORIES.SPECIAL_EFFECTS.length +
  FILTER_CATEGORIES.STANDALONE_FUNCTIONS.length +
  FILTER_CATEGORIES.NAMED_FILTERS.length +
  FILTER_CATEGORIES.CORE_ADJUSTMENTS.length;

/**
 * Canvas Configuration
 */
export const CANVAS_CONFIG = {
  /**
   * Default canvas background color for transparency
   */
  BACKGROUND_COLOR: '#ffffff',
  
  /**
   * Maximum zoom level (400%)
   */
  MAX_ZOOM: 4.0,
  
  /**
   * Minimum zoom level (10%)
   */
  MIN_ZOOM: 0.1,
  
  /**
   * Zoom step increment
   */
  ZOOM_STEP: 0.1,
  
  /**
   * Default zoom level (100%)
   */
  DEFAULT_ZOOM: 1.0,
} as const;

/**
 * Performance Thresholds
 */
export const PERFORMANCE = {
  /**
   * Warning threshold for operation duration (ms)
   */
  SLOW_OPERATION_WARNING_MS: 2000,
  
  /**
   * Maximum parallel operations for thumbnail generation
   */
  MAX_PARALLEL_OPERATIONS: 31, // All filters at once
  
  /**
   * Debounce time for slider adjustments (ms)
   */
  ADJUSTMENT_DEBOUNCE_MS: 150,
  
  /**
   * Cache size limit for thumbnails (number of images)
   */
  THUMBNAIL_CACHE_SIZE: 5,
} as const;

/**
 * Supported File Formats
 */
export const SUPPORTED_FORMATS = {
  /**
   * Photon-compatible formats (can be processed directly)
   */
  PHOTON_COMPATIBLE: ['png', 'jpg', 'jpeg', 'bmp'] as const,
  
  /**
   * Requires ImageMagick conversion
   */
  MAGICK_ONLY: ['webp', 'gif', 'tiff', 'avif', 'heic', 'heif', 'ico', 'svg'] as const,
  
  /**
   * All supported input formats
   */
  ALL_INPUTS: [
    'png', 'jpg', 'jpeg', 'bmp',
    'webp', 'gif', 'tiff', 'avif',
    'heic', 'heif', 'ico', 'svg'
  ] as const,
  
  /**
   * Supported export formats
   */
  EXPORT_FORMATS: ['png', 'jpg', 'bmp', 'webp', 'tiff'] as const,
} as const;

/**
 * Type exports for TypeScript type safety
 */
export type SpecialEffectFilter = typeof FILTER_CATEGORIES.SPECIAL_EFFECTS[number];
export type StandaloneFunctionFilter = typeof FILTER_CATEGORIES.STANDALONE_FUNCTIONS[number];
export type NamedFilter = typeof FILTER_CATEGORIES.NAMED_FILTERS[number];
export type CoreAdjustmentFilter = typeof FILTER_CATEGORIES.CORE_ADJUSTMENTS[number];
export type AllFilters = SpecialEffectFilter | StandaloneFunctionFilter | NamedFilter | CoreAdjustmentFilter;

export type PhotonCompatibleFormat = typeof SUPPORTED_FORMATS.PHOTON_COMPATIBLE[number];
export type MagickOnlyFormat = typeof SUPPORTED_FORMATS.MAGICK_ONLY[number];
export type SupportedInputFormat = typeof SUPPORTED_FORMATS.ALL_INPUTS[number];
export type ExportFormat = typeof SUPPORTED_FORMATS.EXPORT_FORMATS[number];
