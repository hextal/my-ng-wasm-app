import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { PhotonService } from './core/services/photon.service';
import { MagickService } from './core/services/magick.service';

/**
 * Initialize WASM services (Photon and ImageMagick) at app startup
 * This ensures services are ready before any component needs them
 */
function initializeWasmServices(
  photonService: PhotonService,
  magickService: MagickService
) {
  return () => {
    // Initialize both services in parallel
    const photonInit = photonService.initialize().catch((error) => {
      console.error('Failed to initialize Photon service:', error);
      // Don't throw - allow app to continue even if Photon fails
    });
    
    const magickInit = magickService.initialize().catch((error) => {
      console.error('Failed to initialize ImageMagick service:', error);
      // Don't throw - allow app to continue even if ImageMagick fails
    });
    
    // Return promise that resolves when both are done (or failed)
    return Promise.allSettled([photonInit, magickInit]);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules), // Preload all lazy-loaded modules
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withViewTransitions() // Enable smooth view transitions
    ),
    provideClientHydration(withEventReplay()),
    // Initialize WASM services at app startup
    {
      provide: APP_INITIALIZER,
      useFactory: initializeWasmServices,
      deps: [PhotonService, MagickService],
      multi: true
    }
  ]
};
