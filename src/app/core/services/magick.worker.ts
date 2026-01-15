/**
 * ImageMagick WASM Web Worker
 * 
 * This worker handles all ImageMagick WASM image conversion operations off the main thread.
 * Benefits:
 * - Non-blocking UI during format conversions
 * - Efficient data transfer using Transferable Objects
 * - Isolated WASM memory space
 * 
 * Best Practices:
 * - Uses zero-copy transfer with ArrayBuffer
 * - Initializes WASM once and reuses the instance
 * - Handles errors gracefully
 */

import { initializeImageMagick, ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';

// Worker global state
let isInitialized = false;

// Message types for type safety
interface WorkerMessage {
  id: string;
  type: 'initialize' | 'convert-format' | 'terminate';
  payload?: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Initialize ImageMagick WASM module
 */
async function initializeMagick(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    // Fetch WASM file as bytes
    const wasmUrl = '/assets/magick-wasm/magick.wasm';
    console.log('[Magick Worker] Fetching WASM from:', wasmUrl);
    
    const response = await fetch(wasmUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
    }
    
    const wasmBytes = await response.arrayBuffer();
    console.log('[Magick Worker] WASM bytes fetched:', wasmBytes.byteLength, 'bytes');
    
    // Initialize with bytes
    await initializeImageMagick(wasmBytes);
    isInitialized = true;
    console.log('[Magick Worker] Initialized successfully');
  } catch (error) {
    console.error('[Magick Worker] Initialization failed:', error);
    throw error;
  }
}

/**
 * Convert format string to MagickFormat enum
 */
function getFormatEnum(format: string): MagickFormat {
  const normalizedFormat = format.toLowerCase();
  
  switch (normalizedFormat) {
    case 'png':
      return MagickFormat.Png;
    case 'jpg':
    case 'jpeg':
      return MagickFormat.Jpeg;
    case 'gif':
      return MagickFormat.Gif;
    case 'bmp':
      return MagickFormat.Bmp;
    case 'webp':
      return MagickFormat.WebP;
    case 'tiff':
    case 'tif':
      return MagickFormat.Tiff;
    case 'ico':
      return MagickFormat.Ico;
    case 'svg':
      return MagickFormat.Svg;
    case 'avif':
      return MagickFormat.Avif;
    case 'heic':
      return MagickFormat.Heic;
    case 'heif':
      return MagickFormat.Heif;
    default:
      return MagickFormat.Png;
  }
}

/**
 * Convert image from one format to another
 */
async function convertFormat(
  imageData: Uint8Array,
  sourceFormat: string,
  targetFormat: string
): Promise<Uint8Array> {
  if (!isInitialized) {
    await initializeMagick();
  }

  return ImageMagick.read(imageData, getFormatEnum(sourceFormat), (image) => {
    // Write the image to the target format
    return image.write(getFormatEnum(targetFormat), (data) => {
      return data;
    });
  });
}

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;
  
  const response: WorkerResponse = {
    id,
    success: false
  };
  
  try {
    switch (type) {
      case 'initialize':
        await initializeMagick();
        response.success = true;
        response.data = { initialized: true };
        break;
        
      case 'convert-format':
        const { buffer, byteOffset, byteLength, sourceFormat, targetFormat } = payload;
        // Reconstruct Uint8Array from the transferred buffer
        const imageData = new Uint8Array(buffer, byteOffset, byteLength);
        const result = await convertFormat(imageData, sourceFormat, targetFormat);
        
        // IMPORTANT: Copy the result to a new ArrayBuffer before transferring
        // WASM memory buffers cannot be transferred, so we must copy the data
        const resultCopy = new Uint8Array(result.length);
        resultCopy.set(result);
        
        response.success = true;
        response.data = resultCopy;
        
        // Transfer the copied ArrayBuffer back to main thread (zero-copy)
        self.postMessage(response, { transfer: [resultCopy.buffer] });
        return; // Early return to avoid double posting
        
      case 'terminate':
        response.success = true;
        self.close();
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    self.postMessage(response);
  } catch (error) {
    response.success = false;
    response.error = error instanceof Error ? error.message : String(error);
    self.postMessage(response);
  }
};

// Handle errors
self.onerror = (error) => {
  console.error('[Magick Worker] Error:', error);
};

console.log('[Magick Worker] Ready');
