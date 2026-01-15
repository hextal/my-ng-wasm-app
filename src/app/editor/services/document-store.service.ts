import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DocumentModel,
  DocumentFactory,
  EditorObject,
} from '../core/models/document.model';

/**
 * DocumentStoreService - Source of truth for the editor document
 * Holds the current document state and provides reactive updates
 */
@Injectable({
  providedIn: 'root',
})
export class DocumentStoreService {
  private documentSubject = new BehaviorSubject<DocumentModel>(
    DocumentFactory.createDocument()
  );

  private selectedObjectIdSignal = signal<string | null>(null);

  // Observable for reactive subscriptions
  document$: Observable<DocumentModel> = this.documentSubject.asObservable();
  
  // Observable for objects (derived from document$)
  objects$: Observable<EditorObject[]> = this.document$.pipe(
    map(doc => doc.objects)
  );

  // Signals for reactive UI
  documentSignal = signal<DocumentModel>(DocumentFactory.createDocument());
  selectedObjectId = this.selectedObjectIdSignal.asReadonly();

  // Computed signal for selected object
  selectedObject = computed(() => {
    const doc = this.documentSignal();
    const selectedId = this.selectedObjectIdSignal();
    if (!selectedId) return null;
    return doc.objects.find((obj) => obj.id === selectedId) ?? null;
  });

  /**
   * Load a document into the store
   */
  loadDocument(doc: DocumentModel): void {
    this.documentSubject.next(doc);
    this.documentSignal.set(doc);
    this.selectedObjectIdSignal.set(null);
  }

  /**
   * Get a snapshot of the current document
   */
  getSnapshot(): DocumentModel {
    return this.documentSubject.value;
  }

  /**
   * Update the document using a mutator function
   * The mutator should return a new document (immutable)
   */
  update(
    mutatorFn: (doc: DocumentModel) => DocumentModel
  ): void {
    const currentDoc = this.documentSubject.value;
    const newDoc = mutatorFn(currentDoc);
    
    // Increment version
    newDoc.version = currentDoc.version + 1;
    
    this.documentSubject.next(newDoc);
    this.documentSignal.set(newDoc);
  }

  /**
   * Select an object by ID
   */
  selectObject(objectId: string | null): void {
    this.selectedObjectIdSignal.set(objectId);
  }

  /**
   * Get the currently selected object ID
   */
  getSelectedObjectId(): string | null {
    return this.selectedObjectIdSignal();
  }

  /**
   * Get an object by ID
   */
  getObject(objectId: string): EditorObject | undefined {
    return this.documentSubject.value.objects.find(
      (obj) => obj.id === objectId
    );
  }

  /**
   * Get all objects
   */
  getObjects(): EditorObject[] {
    return this.documentSubject.value.objects;
  }

  /**
   * Get objects sorted by z-index
   */
  getObjectsSortedByZ(): EditorObject[] {
    return [...this.documentSubject.value.objects].sort(
      (a, b) => a.zIndex - b.zIndex
    );
  }

  /**
   * Check if an object exists
   */
  hasObject(objectId: string): boolean {
    return this.documentSubject.value.objects.some(
      (obj) => obj.id === objectId
    );
  }

  /**
   * Get document dimensions
   */
  getDimensions(): { width: number; height: number } {
    const doc = this.documentSubject.value;
    return { width: doc.width, height: doc.height };
  }

  /**
   * Update document dimensions
   */
  setDimensions(width: number, height: number): void {
    this.update((doc) => ({ ...doc, width, height }));
  }

  /**
   * Get document background
   */
  getBackground(): { color?: string; transparent?: boolean } {
    return this.documentSubject.value.background;
  }

  /**
   * Set document background
   */
  setBackground(background: { color?: string; transparent?: boolean }): void {
    this.update((doc) => ({ ...doc, background }));
  }

  /**
   * Clear the document (reset to empty)
   */
  clear(): void {
    this.loadDocument(
      DocumentFactory.createDocument(
        this.documentSubject.value.width,
        this.documentSubject.value.height
      )
    );
  }
}
