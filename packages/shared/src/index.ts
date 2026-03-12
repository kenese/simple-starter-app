// ─── Canvas Element Types ───────────────────────────────────────

export type ElementType = "rect" | "ellipse" | "text";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
}

export interface RectElement extends BaseElement {
  type: "rect";
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
}

export type CanvasElement = RectElement | EllipseElement | TextElement;

// ─── Document Types ─────────────────────────────────────────────

export interface CanvasDocument {
  id: string;
  name: string;
  elements: CanvasElement[];
  version: number;
}

// ─── API Types ──────────────────────────────────────────────────

export interface SaveDocumentRequest {
  name?: string;
  elements: CanvasElement[];
}

export interface SaveDocumentResponse {
  document: CanvasDocument;
}

export interface GetDocumentResponse {
  document: CanvasDocument;
}

export interface ListDocumentsResponse {
  documents: Array<{ id: string; name: string; version: number }>;
}

// ─── Socket Event Types ─────────────────────────────────────────

export interface SocketClientEvents {
  "join-document": (data: { documentId: string; userId: string }) => void;
  "leave-document": (data: { documentId: string; userId: string }) => void;
  "save-document": (data: {
    documentId: string;
    userId: string;
    elements: CanvasElement[];
    name?: string;
  }) => void;
  "update-elements": (data: {
    documentId: string;
    userId: string;
    elements: CanvasElement[];
  }) => void;
  "lock-element": (data: {
    documentId: string;
    elementId: string;
    userId: string;
  }) => void;
  "unlock-element": (data: {
    documentId: string;
    elementId: string;
    userId: string;
  }) => void;
}

export interface SocketServerEvents {
  "document-saved": (data: { document: CanvasDocument; seq: number }) => void;
  "elements-updated": (data: {
    elements: CanvasElement[];
    seq: number;
    userId: string;
  }) => void;
  "element-locked": (data: { elementId: string; userId: string }) => void;
  "element-unlocked": (data: { elementId: string; userId: string }) => void;
  "user-joined": (data: { userId: string }) => void;
  "user-left": (data: { userId: string }) => void;
  "save-error": (data: { error: string }) => void;
}

// ─── Lock Types ─────────────────────────────────────────────────

export interface ElementLock {
  elementId: string;
  userId: string;
}
