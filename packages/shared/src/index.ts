// ─── Canvas Types ───────────────────────────────────────────────

export type ElementType = "rectangle" | "circle" | "text";

export interface CanvasElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    content?: string;
}

export const DEFAULT_ELEMENT_SIZES: Record<
    ElementType,
    { width: number; height: number }
> = {
    rectangle: { width: 150, height: 100 },
    circle: { width: 120, height: 120 },
    text: { width: 200, height: 40 },
};

// ─── Document Types ─────────────────────────────────────────────

export interface DocumentVersion {
    versionId: string;
    elements: CanvasElement[];
    savedAt: string;
}

export interface CanvasDocument {
    id: string;
    name: string;
    versions: DocumentVersion[];
    createdAt: string;
    updatedAt: string;
}

export interface DocumentMeta {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export interface VersionMeta {
    versionId: string;
    savedAt: string;
}

export interface SaveDocumentRequest {
    elements: CanvasElement[];
    afterVersionId?: string;
}

export interface SaveDocumentResponse {
    id: string;
    versionId: string;
}

export interface CreateDocumentRequest {
    name?: string;
}

export interface RenameDocumentRequest {
    name: string;
}

// ─── User & Socket Types ────────────────────────────────────────

export interface User {
    id: string;
    displayName: string;
    color: string;
}

export interface JoinDocumentPayload {
    documentId: string;
}

export interface SaveDocumentSocketPayload {
    documentId: string;
    elements: CanvasElement[];
    afterVersionId?: string;
}

export interface SaveDocumentAck {
    versionId?: string;
    savedAt?: string;
    error?: string;
}

export interface ElementsUpdatedPayload {
    documentId: string;
    elements: CanvasElement[];
    userId: string;
    versionId: string;
    savedAt: string;
}

export interface UsersUpdatedPayload {
    documentId: string;
    users: User[];
}

