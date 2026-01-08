import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./editor/editor.component').then(m => m.EditorComponent)
  },
  { 
    path: 'legacy', 
    loadComponent: () => import('./features/image-editor/image-editor.component').then(m => m.ImageEditorComponent)
  }
];
