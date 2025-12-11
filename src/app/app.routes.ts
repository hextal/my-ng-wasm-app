import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/image-editor', pathMatch: 'full' },
  { 
    path: 'image-editor', 
    loadComponent: () => import('./features/image-editor/image-editor.component').then(m => m.ImageEditorComponent)
  }
];
