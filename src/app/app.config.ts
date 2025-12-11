import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules), // Preload all lazy-loaded modules
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withViewTransitions() // Enable smooth view transitions
    ),
    provideClientHydration(withEventReplay())
  ]
};
