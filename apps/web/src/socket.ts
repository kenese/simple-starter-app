import { io, Socket } from "socket.io-client";
import type { CanvasElement, SaveDocumentAck } from "@starter/shared";

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io({ autoConnect: true });
    }
    return socket;
}

export function joinDocument(documentId: string): void {
    getSocket().emit("join-document", { documentId });
}

export function leaveDocument(): void {
    getSocket().emit("leave-document");
}

export function emitSaveDocument(
    documentId: string,
    elements: CanvasElement[],
    afterVersionId?: string
): Promise<{ versionId: string; savedAt: string }> {
    return new Promise((resolve, reject) => {
        getSocket().emit(
            "save-document",
            { documentId, elements, afterVersionId },
            (response: SaveDocumentAck) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve({
                        versionId: response.versionId!,
                        savedAt: response.savedAt!,
                    });
                }
            }
        );
    });
}
