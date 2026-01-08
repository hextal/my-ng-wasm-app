import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HistoryService } from './history.service';
import { DocumentStoreService } from './document-store.service';
import {
  AddObjectCommand,
  RemoveObjectCommand,
  TransformObjectCommand,
} from '../core/commands/object.commands';
import { EditorObjectFactory } from '../core/models/document.model';

describe('HistoryService', () => {
  let historyService: HistoryService;
  let documentStore: DocumentStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    documentStore = TestBed.inject(DocumentStoreService);
    historyService = TestBed.inject(HistoryService);
    historyService.clear();
  });

  it('should be created', () => {
    expect(historyService).toBeTruthy();
  });

  it('should execute command and add to undo stack', async () => {
    const imageObj = EditorObjectFactory.createImageObject(
      'asset-123',
      'image/png',
      100,
      100,
      50,
      50
    );

    await historyService.run(new AddObjectCommand(imageObj));

    expect(historyService.canUndo()).toBe(true);
    expect(historyService.canRedo()).toBe(false);
    expect(documentStore.getObjects()).toHaveLength(1);
  });

  it('should undo command', async () => {
    const imageObj = EditorObjectFactory.createImageObject(
      'asset-123',
      'image/png',
      100,
      100,
      50,
      50
    );

    await historyService.run(new AddObjectCommand(imageObj));
    expect(documentStore.getObjects()).toHaveLength(1);

    await historyService.undo();
    expect(documentStore.getObjects()).toHaveLength(0);
    expect(historyService.canRedo()).toBe(true);
  });

  it('should redo command', async () => {
    const imageObj = EditorObjectFactory.createImageObject(
      'asset-123',
      'image/png',
      100,
      100,
      50,
      50
    );

    await historyService.run(new AddObjectCommand(imageObj));
    await historyService.undo();
    expect(documentStore.getObjects()).toHaveLength(0);

    await historyService.redo();
    expect(documentStore.getObjects()).toHaveLength(1);
    expect(historyService.canUndo()).toBe(true);
  });

  it('should clear redo stack when new command is run', async () => {
    const obj1 = EditorObjectFactory.createImageObject('a1', 'image/png', 10, 10, 0, 0);
    const obj2 = EditorObjectFactory.createImageObject('a2', 'image/png', 10, 10, 0, 0);

    await historyService.run(new AddObjectCommand(obj1));
    await historyService.undo();
    
    expect(historyService.canRedo()).toBe(true);

    await historyService.run(new AddObjectCommand(obj2));
    
    expect(historyService.canRedo()).toBe(false);
  });

  it('should handle transform command', async () => {
    const imageObj = EditorObjectFactory.createImageObject(
      'asset-123',
      'image/png',
      100,
      100,
      50,
      50
    );

    await historyService.run(new AddObjectCommand(imageObj));

    const beforeTransform = { x: 50, y: 50, scaleX: 1, scaleY: 1, angle: 0 };
    const afterTransform = { x: 100, y: 100, scaleX: 2, scaleY: 2, angle: 45 };

    await historyService.run(
      new TransformObjectCommand(imageObj.id, beforeTransform, afterTransform)
    );

    const obj = documentStore.getObject(imageObj.id);
    expect(obj?.x).toBe(100);
    expect(obj?.y).toBe(100);
    expect(obj?.angle).toBe(45);

    await historyService.undo();

    const objAfterUndo = documentStore.getObject(imageObj.id);
    expect(objAfterUndo?.x).toBe(50);
    expect(objAfterUndo?.y).toBe(50);
    expect(objAfterUndo?.angle).toBe(0);
  });

  it('should get command descriptions', async () => {
    const imageObj = EditorObjectFactory.createImageObject(
      'asset-123',
      'image/png',
      100,
      100,
      50,
      50
    );

    await historyService.run(new AddObjectCommand(imageObj));

    const desc = historyService.getUndoDescription();
    expect(desc).toContain('Add');
  });
});
