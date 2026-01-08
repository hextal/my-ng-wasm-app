import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DocumentStoreService } from './document-store.service';
import { EditorObjectFactory } from '../core/models/document.model';

describe('DocumentStoreService', () => {
  let service: DocumentStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an empty document', () => {
    const doc = service.getSnapshot();
    expect(doc.objects).toHaveLength(0);
    expect(doc.width).toBeGreaterThan(0);
    expect(doc.height).toBeGreaterThan(0);
  });

  it('should update document and increment version', () => {
    const initialVersion = service.getSnapshot().version;

    service.update((doc) => ({
      ...doc,
      background: { color: '#ff0000' },
    }));

    const updated = service.getSnapshot();
    expect(updated.version).toBe(initialVersion + 1);
    expect(updated.background.color).toBe('#ff0000');
  });

  it('should add and retrieve objects', () => {
    const imageObj = EditorObjectFactory.createImageObject(
      'asset-123',
      'image/png',
      100,
      100,
      50,
      50
    );

    service.update((doc) => ({
      ...doc,
      objects: [...doc.objects, imageObj],
    }));

    expect(service.hasObject(imageObj.id)).toBe(true);
    expect(service.getObjects()).toHaveLength(1);

    const retrieved = service.getObject(imageObj.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(imageObj.id);
  });

  it('should manage selected object', () => {
    const imageObj = EditorObjectFactory.createImageObject(
      'asset-123',
      'image/png',
      100,
      100,
      50,
      50
    );

    service.update((doc) => ({
      ...doc,
      objects: [...doc.objects, imageObj],
    }));

    service.selectObject(imageObj.id);
    expect(service.getSelectedObjectId()).toBe(imageObj.id);
    expect(service.selectedObject()).toBeDefined();

    service.selectObject(null);
    expect(service.getSelectedObjectId()).toBe(null);
    expect(service.selectedObject()).toBe(null);
  });

  it('should get objects sorted by z-index', () => {
    const obj1 = { ...EditorObjectFactory.createImageObject('a1', 'image/png', 10, 10, 0, 0), zIndex: 2 };
    const obj2 = { ...EditorObjectFactory.createImageObject('a2', 'image/png', 10, 10, 0, 0), zIndex: 0 };
    const obj3 = { ...EditorObjectFactory.createImageObject('a3', 'image/png', 10, 10, 0, 0), zIndex: 1 };

    service.update((doc) => ({
      ...doc,
      objects: [obj1, obj2, obj3],
    }));

    const sorted = service.getObjectsSortedByZ();
    expect(sorted[0].zIndex).toBe(0);
    expect(sorted[1].zIndex).toBe(1);
    expect(sorted[2].zIndex).toBe(2);
  });

  it('should update dimensions', () => {
    service.setDimensions(1920, 1080);

    const dims = service.getDimensions();
    expect(dims.width).toBe(1920);
    expect(dims.height).toBe(1080);
  });

  it('should clear document', () => {
    const imageObj = EditorObjectFactory.createImageObject(
      'asset-123',
      'image/png',
      100,
      100,
      50,
      50
    );

    service.update((doc) => ({
      ...doc,
      objects: [...doc.objects, imageObj],
    }));

    expect(service.getObjects()).toHaveLength(1);

    service.clear();

    expect(service.getObjects()).toHaveLength(0);
  });
});
