/**
 * Document Model - Source of Truth
 * Represents the complete state of the editor document
 */

export interface DocumentModel {
  id: string;
  width: number;
  height: number;
  background: {
    color?: string;
    transparent?: boolean;
  };
  objects: EditorObject[];
  version: number;
}

/**
 * Base interface for all editor objects
 */
export interface EditorObject {
  id: string;
  type: 'image' | 'path' | 'text';
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  visible: boolean;
  zIndex: number;
  meta?: Record<string, any>;
}

/**
 * Image object with asset reference
 */
export interface ImageObject extends EditorObject {
  type: 'image';
  assetId: string;
  originalAssetId?: string; // Asset ID of the original unfiltered image
  mimeType: string;
  width: number; // intrinsic width
  height: number; // intrinsic height
  flipX?: boolean;
  flipY?: boolean;
  globalCompositeOperation?: string;
  appliedEdits?: Array<{
    kind: string;
    params: any;
    at: number;
  }>;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  clipPath?: any;
  locked?: boolean;
  lockMovementX?: boolean;
  lockMovementY?: boolean;
  lockScalingX?: boolean;
  lockScalingY?: boolean;
  lockRotation?: boolean;
  selectable?: boolean;
}

/**
 * Path object for drawing
 */
export interface PathObject extends EditorObject {
  type: 'path';
  path: any; // Fabric path data or SVG path string
  stroke: string;
  strokeWidth: number;
  fill?: string;
  pointsSimplified?: boolean;
  locked?: boolean;
  lockMovementX?: boolean;
  lockMovementY?: boolean;
  lockScalingX?: boolean;
  lockScalingY?: boolean;
  lockRotation?: boolean;
  selectable?: boolean;
}

/**
 * Text object
 */
export interface TextObject extends EditorObject {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  underline?: boolean;
  lineHeight?: number;
  charSpacing?: number;
  fill: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  locked?: boolean;
  lockMovementX?: boolean;
  lockMovementY?: boolean;
  lockScalingX?: boolean;
  lockScalingY?: boolean;
  lockRotation?: boolean;
  selectable?: boolean;
}

/**
 * Transform snapshot for undo/redo
 */
export interface TransformSnapshot {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity?: number;
}

/**
 * Factory functions for creating default objects
 */
export class EditorObjectFactory {
  static createImageObject(
    assetId: string,
    mimeType: string,
    width: number,
    height: number,
    x: number,
    y: number
  ): ImageObject {
    return {
      id: crypto.randomUUID(),
      type: 'image',
      assetId,
      originalAssetId: assetId, // Set originalAssetId to initial assetId
      mimeType,
      width,
      height,
      x,
      y,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      visible: true,
      zIndex: 0,
    };
  }

  static createPathObject(
    path: any,
    stroke: string,
    strokeWidth: number,
    x: number,
    y: number
  ): PathObject {
    return {
      id: crypto.randomUUID(),
      type: 'path',
      path,
      stroke,
      strokeWidth,
      x,
      y,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      visible: true,
      zIndex: 0,
    };
  }

  static createTextObject(
    text: string,
    x: number,
    y: number,
    fontSize: number = 16,
    fontFamily: string = 'Arial',
    fill: string = '#000000'
  ): TextObject {
    return {
      id: crypto.randomUUID(),
      type: 'text',
      text,
      fontFamily,
      fontSize,
      fill,
      x,
      y,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      visible: true,
      zIndex: 0,
    };
  }
}

/**
 * Factory for creating default documents
 */
export class DocumentFactory {
  static createDocument(
    width: number = 800,
    height: number = 600
  ): DocumentModel {
    return {
      id: crypto.randomUUID(),
      width,
      height,
      background: {
        color: '#ffffff',
        transparent: false,
      },
      objects: [],
      version: 0,
    };
  }
}
