import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FabricCanvasService } from '../services/fabric-canvas.service';
import { DocumentStoreService } from '../services/document-store.service';
import { HistoryService } from '../services/history.service';
import { AssetStoreService } from '../services/asset-store.service';

describe('Editor Integration Tests', () => {
  let fabricCanvas: FabricCanvasService;
  let documentStore: DocumentStoreService;
  let historyService: HistoryService;
  let assetStore: AssetStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FabricCanvasService,
        DocumentStoreService,
        HistoryService,
        AssetStoreService,
      ],
    });

    fabricCanvas = TestBed.inject(FabricCanvasService);
    documentStore = TestBed.inject(DocumentStoreService);
    historyService = TestBed.inject(HistoryService);
    assetStore = TestBed.inject(AssetStoreService);
  });

  it('should add image, undo, and redo', async () => {
    // Create a test canvas element
    const canvas = document.createElement('canvas');
    await fabricCanvas.init(canvas, 800, 600);

    // Create a test image blob
    const testBlob = new Blob(['fake image data'], { type: 'image/png' });

    // Initial state
    expect(documentStore.getObjects()).toHaveLength(0);

    // Add image
    await fabricCanvas.addImageFromBlob(testBlob);

    // Check state after add
    expect(documentStore.getObjects()).toHaveLength(1);
    expect(assetStore.size()).toBe(1);
    expect(historyService.canUndo()).toBe(true);

    // Undo
    await historyService.undo();
    expect(documentStore.getObjects()).toHaveLength(0);
    expect(historyService.canRedo()).toBe(true);

    // Redo
    await historyService.redo();
    expect(documentStore.getObjects()).toHaveLength(1);
  });

  it('should handle multiple objects with correct z-ordering', async () => {
    const canvas = document.createElement('canvas');
    await fabricCanvas.init(canvas, 800, 600);

    const blob1 = new Blob(['image 1'], { type: 'image/png' });
    const blob2 = new Blob(['image 2'], { type: 'image/png' });

    await fabricCanvas.addImageFromBlob(blob1);
    await fabricCanvas.addImageFromBlob(blob2);

    const objects = documentStore.getObjectsSortedByZ();
    expect(objects).toHaveLength(2);
    expect(objects[0].zIndex).toBeLessThan(objects[1].zIndex);
  });

  it('should delete selected object and support undo', async () => {
    const canvas = document.createElement('canvas');
    await fabricCanvas.init(canvas, 800, 600);

    const testBlob = new Blob(['fake image data'], { type: 'image/png' });
    await fabricCanvas.addImageFromBlob(testBlob);

    const obj = documentStore.getObjects()[0];
    documentStore.selectObject(obj.id);

    await fabricCanvas.deleteSelected();

    expect(documentStore.getObjects()).toHaveLength(0);

    await historyService.undo();

    expect(documentStore.getObjects()).toHaveLength(1);
  });

  it('should maintain document version on changes', async () => {
    const initialVersion = documentStore.getSnapshot().version;

    documentStore.update((doc) => ({
      ...doc,
      background: { color: '#000000' },
    }));

    expect(documentStore.getSnapshot().version).toBe(initialVersion + 1);
  });
});
