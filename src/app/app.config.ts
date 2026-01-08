import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { PhotonService } from './core/services/photon.service';

/**
 * Initialize Photon WASM service at app startup
 * ImageMagick is lazy-initialized only when needed for format conversion
 */
function initializePhotonService(photonService: PhotonService) {
  return () => {
    return photonService.initialize().catch((error) => {
      console.error('Failed to initialize Photon service:', error);
      // Don't throw - allow app to continue even if Photon fails
    });
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
    // Initialize Photon service at app startup
    {
      provide: APP_INITIALIZER,
      useFactory: initializePhotonService,
      deps: [PhotonService],
      multi: true
    }
  ]
};
