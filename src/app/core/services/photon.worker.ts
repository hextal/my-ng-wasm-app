/**
 * Photon WASM Web Worker
 * 
 * This worker handles all Photon WASM image processing operations off the main thread.
 * Benefits:
 * - Non-blocking UI during heavy image processing
 * - Efficient data transfer using Transferable Objects
 * - Isolated WASM memory space
 * 
 * Best Practices:
 * - Uses zero-copy transfer with ArrayBuffer
 * - Initializes WASM once and reuses the instance
 * - Handles errors gracefully
 */

import type * as PhotonWasm from 'photon-wasm';

// Worker global state
let photonModule: typeof PhotonWasm | null = null;
let isInitialized = false;

// Message types for type safety
interface WorkerMessage {
  id: string;
  type: 'initialize' | 'apply-filter' | 'terminate';
  payload?: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Initialize Photon WASM module
 */
async function initializePhoton(): Promise<void> {
  if (isInitialized && photonModule) {
    return;
  }

  try {
    // Import the WASM module
    const module = await import('photon-wasm');
    
    // Initialize WASM if needed
    if (!(module as any).initialized) {
      await (module as any).initWasm(
        fetch('/assets/photon-wasm/photon_bg.wasm')
      );
    }
    
    photonModule = module as any;
    isInitialized = true;
    console.log('[Photon Worker] Initialized successfully');
  } catch (error) {
    console.error('[Photon Worker] Initialization failed:', error);
    throw error;
  }
}

/**
 * Convert ImageData to PhotonImage
 */
function imageDataToPhotonImage(imageData: ImageData): any {
  if (!photonModule) throw new Error('Photon module not initialized');
  
  const pixelData = imageData.data.slice();
  return new (photonModule as any).PhotonImage(
    pixelData,
    imageData.width,
    imageData.height
  );
}

/**
 * Convert PhotonImage to ImageData
 */
function photonImageToImageData(photonImage: any): ImageData {
  if (!photonModule) throw new Error('Photon module not initialized');
  
  const imageData = (photonModule as any).to_image_data(photonImage);
  
  // CRITICAL: Create deep copy to prevent WASM memory reuse
  const copiedData = new Uint8ClampedArray(imageData.data);
  return new ImageData(copiedData, imageData.width, imageData.height);
}

/**
 * Apply a filter to an image
 */
async function applyFilter(
  imageData: ImageData,
  filterName: string,
  args: any[] = []
): Promise<ImageData> {
  if (!isInitialized) {
    await initializePhoton();
  }
  
  if (!photonModule) {
    throw new Error('Photon module not initialized');
  }
  
  // Convert to PhotonImage
  const photonImage = imageDataToPhotonImage(imageData);
  
  // Get the filter function
  const filterFn = (photonModule as any)[filterName];
  if (!filterFn) {
    throw new Error(`Filter '${filterName}' not found`);
  }
  
  // Apply filter (mutates in-place)
  filterFn(photonImage, ...args);
  
  // Convert back to ImageData
  const result = photonImageToImageData(photonImage);
  
  return result;
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
        await initializePhoton();
        response.success = true;
        response.data = { initialized: true };
        break;
        
      case 'apply-filter':
        const { imageData, filterName, args } = payload;
        const result = await applyFilter(imageData, filterName, args);
        
        response.success = true;
        response.data = result;
        
        // Transfer the ArrayBuffer back to main thread (zero-copy)
        const transferList: Transferable[] = [result.data.buffer];
        self.postMessage(response, { transfer: transferList });
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
  console.error('[Photon Worker] Error:', error);
};

console.log('[Photon Worker] Ready');
