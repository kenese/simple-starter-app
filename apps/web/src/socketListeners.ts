import { getSocket } from "./socket";
import { useCanvasStore } from "./store/canvasStore";
import type {
    User,
    ElementsUpdatedPayload,
    UsersUpdatedPayload,
} from "@starter/shared";

export function initSocketListeners(): void {
    const socket = getSocket();

    socket.on("user-identity", (user: User) => {
        useCanvasStore.setState({ currentUser: user });
    });

    socket.on("elements-updated", (payload: ElementsUpdatedPayload) => {
        const state = useCanvasStore.getState();
        if (state.documentId !== payload.documentId) return;

        const newMeta = {
            versionId: payload.versionId,
            savedAt: payload.savedAt,
        };
        const newHistory = [...state.versionHistory, newMeta];

        useCanvasStore.setState({
            elements: payload.elements,
            versionId: payload.versionId,
            lastSavedAt: payload.savedAt,
            isDirty: false,
            versionHistory: newHistory,
            currentVersionIndex: newHistory.length - 1,
        });
    });

    socket.on("users-updated", (payload: UsersUpdatedPayload) => {
        const state = useCanvasStore.getState();
        if (state.documentId !== payload.documentId) return;
        useCanvasStore.setState({ connectedUsers: payload.users });
    });
}
