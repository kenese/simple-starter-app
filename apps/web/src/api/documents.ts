import type {
    DesignDocument,
    DesignElement,
    GetDocumentResponse,
    SaveDocumentVersionResponse,
} from "@starter/shared";

const parseErrorMessage = async (response: Response, fallback: string) => {
    try {
        const payload = (await response.json()) as { message?: string };
        return payload.message ?? fallback;
    } catch {
        return fallback;
    }
};

export const getDocument = async (documentId: string): Promise<DesignDocument | null> => {
    const response = await fetch(`/api/documents/${documentId}`);

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to load document");
        throw new Error(message);
    }

    const payload = (await response.json()) as GetDocumentResponse;
    return payload.document;
};

export const saveDocumentVersion = async (
    documentId: string,
    elements: DesignElement[]
): Promise<DesignDocument> => {
    const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            snapshot: {
                elements,
            },
        }),
    });

    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to save document");
        throw new Error(message);
    }

    const payload = (await response.json()) as SaveDocumentVersionResponse;
    return payload.document;
};
