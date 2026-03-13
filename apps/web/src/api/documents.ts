import type {
    CanvasDocument,
    DocumentMeta,
    DocumentVersion,
    SaveDocumentResponse,
    CanvasElement,
} from "@starter/shared";

const BASE = "/api/documents";

export async function listDocuments(): Promise<DocumentMeta[]> {
    const res = await fetch(BASE);
    if (!res.ok) throw new Error("Failed to list documents");
    return res.json();
}

export async function createDocument(
    name?: string
): Promise<CanvasDocument> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create document");
    return res.json();
}

export async function getDocument(id: string): Promise<CanvasDocument> {
    const res = await fetch(`${BASE}/${id}`);
    if (!res.ok) throw new Error("Failed to get document");
    return res.json();
}

export async function getVersion(
    docId: string,
    versionId: string
): Promise<DocumentVersion> {
    const res = await fetch(`${BASE}/${docId}/versions/${versionId}`);
    if (!res.ok) throw new Error("Failed to get version");
    return res.json();
}

export async function saveDocument(
    id: string,
    elements: CanvasElement[],
    afterVersionId?: string
): Promise<SaveDocumentResponse> {
    const res = await fetch(`${BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements, afterVersionId }),
    });
    if (!res.ok) throw new Error("Failed to save document");
    return res.json();
}

export async function renameDocument(
    id: string,
    name: string
): Promise<{ id: string; name: string }> {
    const res = await fetch(`${BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to rename document");
    }
    return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete document");
}
