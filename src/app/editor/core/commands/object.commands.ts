import { Command } from './command.interface';
import { DocumentStoreService } from '../../services/document-store.service';
import { EditorObject, TextObject } from '../models/document.model';

/**
 * Command to add an object to the document
 */
export class AddObjectCommand implements Command {
  constructor(private object: EditorObject) {}

  execute(store: DocumentStoreService): void {
    store.update((doc) => {
      // Find max zIndex and set object zIndex to be on top
      const maxZIndex = doc.objects.reduce(
        (max, obj) => Math.max(max, obj.zIndex),
        -1
      );
      const objectWithZIndex = { ...this.object, zIndex: maxZIndex + 1 };
      
      return {
        ...doc,
        objects: [...doc.objects, objectWithZIndex],
      };
    });
  }

  undo(store: DocumentStoreService): void {
    store.update((doc) => ({
      ...doc,
      objects: doc.objects.filter((obj) => obj.id !== this.object.id),
    }));
  }

  describe(): string {
    return `Add ${this.object.type} object`;
  }
}

/**
 * Command to remove an object from the document
 */
export class RemoveObjectCommand implements Command {
  private removedObject?: EditorObject;

  constructor(private objectId: string) {}

  execute(store: DocumentStoreService): void {
    const doc = store.getSnapshot();
    this.removedObject = doc.objects.find((obj) => obj.id === this.objectId);

    if (!this.removedObject) {
      throw new Error(`Object not found: ${this.objectId}`);
    }

    store.update((doc) => ({
      ...doc,
      objects: doc.objects.filter((obj) => obj.id !== this.objectId),
    }));
  }

  undo(store: DocumentStoreService): void {
    if (!this.removedObject) {
      throw new Error('Cannot undo: object was not removed');
    }

    store.update((doc) => ({
      ...doc,
      objects: [...doc.objects, this.removedObject!],
    }));
  }

  describe(): string {
    return `Remove object`;
  }
}

/**
 * Command to transform an object (move, scale, rotate)
 */
export class TransformObjectCommand implements Command {
  constructor(
    private objectId: string,
    private beforeTransform: {
      x: number;
      y: number;
      scaleX: number;
      scaleY: number;
      angle: number;
      opacity?: number;
    },
    private afterTransform: {
      x: number;
      y: number;
      scaleX: number;
      scaleY: number;
      angle: number;
      opacity?: number;
    }
  ) {}

  execute(store: DocumentStoreService): void {
    this.applyTransform(store, this.afterTransform);
  }

  undo(store: DocumentStoreService): void {
    this.applyTransform(store, this.beforeTransform);
  }

  private applyTransform(
    store: DocumentStoreService,
    transform: {
      x: number;
      y: number;
      scaleX: number;
      scaleY: number;
      angle: number;
      opacity?: number;
    }
  ): void {
    store.update((doc) => ({
      ...doc,
      objects: doc.objects.map((obj) =>
        obj.id === this.objectId
          ? {
              ...obj,
              x: transform.x,
              y: transform.y,
              scaleX: transform.scaleX,
              scaleY: transform.scaleY,
              angle: transform.angle,
              opacity: transform.opacity ?? obj.opacity,
            }
          : obj
      ),
    }));
  }

  describe(): string {
    return `Transform object`;
  }
}

/**
 * Command to update an image asset (e.g., after applying a filter)
 */
export class UpdateImageAssetCommand implements Command {
  constructor(
    private objectId: string,
    private beforeAssetId: string,
    private afterAssetId: string,
    private beforeMeta?: Record<string, any>,
    private afterMeta?: Record<string, any>
  ) {}

  execute(store: DocumentStoreService): void {
    this.applyAsset(store, this.afterAssetId, this.afterMeta);
  }

  undo(store: DocumentStoreService): void {
    this.applyAsset(store, this.beforeAssetId, this.beforeMeta);
  }

  private applyAsset(
    store: DocumentStoreService,
    assetId: string,
    meta?: Record<string, any>
  ): void {
    store.update((doc) => ({
      ...doc,
      objects: doc.objects.map((obj) => {
        if (obj.id === this.objectId && obj.type === 'image') {
          return {
            ...obj,
            assetId,
            meta: meta ?? obj.meta,
          };
        }
        return obj;
      }),
    }));
  }

  describe(): string {
    return `Update image asset`;
  }
}

/**
 * Command to reorder objects (z-index)
 */
export class ReorderObjectCommand implements Command {
  private beforeOrder: Array<{ id: string; zIndex: number }> = [];

  constructor(
    private objectId: string,
    private direction: 'forward' | 'backward' | 'front' | 'back'
  ) {}

  execute(store: DocumentStoreService): void {
    const doc = store.getSnapshot();
    
    // Save current order for undo
    this.beforeOrder = doc.objects.map((obj) => ({
      id: obj.id,
      zIndex: obj.zIndex,
    }));

    const targetObj = doc.objects.find((obj) => obj.id === this.objectId);
    if (!targetObj) {
      throw new Error(`Object not found: ${this.objectId}`);
    }

    store.update((doc) => {
      const objects = [...doc.objects];
      const sortedByZ = objects.sort((a, b) => a.zIndex - b.zIndex);
      const targetIndex = sortedByZ.findIndex(
        (obj) => obj.id === this.objectId
      );

      let newIndex = targetIndex;
      switch (this.direction) {
        case 'forward':
          newIndex = Math.min(targetIndex + 1, sortedByZ.length - 1);
          break;
        case 'backward':
          newIndex = Math.max(targetIndex - 1, 0);
          break;
        case 'front':
          newIndex = sortedByZ.length - 1;
          break;
        case 'back':
          newIndex = 0;
          break;
      }

      // Swap z-indices
      if (newIndex !== targetIndex) {
        [sortedByZ[targetIndex], sortedByZ[newIndex]] = [
          sortedByZ[newIndex],
          sortedByZ[targetIndex],
        ];
      }

      // Reassign z-indices in order
      sortedByZ.forEach((obj, index) => {
        obj.zIndex = index;
      });

      return { ...doc, objects: sortedByZ };
    });
  }

  undo(store: DocumentStoreService): void {
    store.update((doc) => ({
      ...doc,
      objects: doc.objects.map((obj) => {
        const savedOrder = this.beforeOrder.find((o) => o.id === obj.id);
        return savedOrder ? { ...obj, zIndex: savedOrder.zIndex } : obj;
      }),
    }));
  }

  describe(): string {
    return `Reorder object ${this.direction}`;
  }
}

/**
 * Command to flip an object (horizontal or vertical)
 */
export class FlipObjectCommand implements Command {
  constructor(
    private objectId: string,
    private beforeFlip: { flipX: boolean; flipY: boolean },
    private afterFlip: { flipX: boolean; flipY: boolean }
  ) {}

  execute(store: DocumentStoreService): void {
    this.applyFlip(store, this.afterFlip);
  }

  undo(store: DocumentStoreService): void {
    this.applyFlip(store, this.beforeFlip);
  }

  private applyFlip(
    store: DocumentStoreService,
    flip: { flipX: boolean; flipY: boolean }
  ): void {
    store.update((doc) => ({
      ...doc,
      objects: doc.objects.map((obj) =>
        obj.id === this.objectId && obj.type === 'image'
          ? {
              ...obj,
              flipX: flip.flipX,
              flipY: flip.flipY,
            }
          : obj
      ),
    }));
  }

  describe(): string {
    return `Flip object`;
  }
}

/**
 * Command to update text properties
 */
export class UpdateTextCommand implements Command {
  private beforeText?: TextObject;

  constructor(
    private objectId: string,
    private afterText: TextObject
  ) {}

  execute(store: DocumentStoreService): void {
    const doc = store.getSnapshot();
    this.beforeText = doc.objects.find(
      (obj) => obj.id === this.objectId && obj.type === 'text'
    ) as TextObject;

    if (!this.beforeText) {
      throw new Error(`Text object not found: ${this.objectId}`);
    }

    store.update((doc) => ({
      ...doc,
      objects: doc.objects.map((obj) =>
        obj.id === this.objectId ? this.afterText : obj
      ),
    }));
  }

  undo(store: DocumentStoreService): void {
    if (!this.beforeText) {
      throw new Error('Cannot undo: text was not updated');
    }

    store.update((doc) => ({
      ...doc,
      objects: doc.objects.map((obj) =>
        obj.id === this.objectId ? this.beforeText! : obj
      ),
    }));
  }

  describe(): string {
    return `Update text properties`;
  }
}
