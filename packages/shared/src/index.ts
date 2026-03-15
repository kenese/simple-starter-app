export type CanvasElementType = "rectangle" | "circle" | "text";

export interface DesignElement {
    id: string;
    type: CanvasElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
}

export interface DesignSnapshot {
    elements: DesignElement[];
}

export interface DocumentVersion {
    version: number;
    savedAt: string;
    snapshot: DesignSnapshot;
}

export interface DesignDocument {
    documentId: string;
    latestVersion: number;
    versions: DocumentVersion[];
}

export interface GetDocumentResponse {
    document: DesignDocument;
}

export interface SaveDocumentVersionRequest {
    snapshot: DesignSnapshot;
}

export interface SaveDocumentVersionResponse {
    document: DesignDocument;
}

