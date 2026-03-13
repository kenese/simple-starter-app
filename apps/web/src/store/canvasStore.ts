import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { CanvasElement, ElementType, VersionMeta, User } from "@starter/shared";
import { DEFAULT_ELEMENT_SIZES } from "@starter/shared";
import * as api from "../api/documents";
import { joinDocument, leaveDocument, emitSaveDocument } from "../socket";

interface CanvasState {
    documentId: string | null;
    documentName: string | null;
    versionId: string | null;
    elements: CanvasElement[];
    activeElementId: string | null;
    isDirty: boolean;
    isSaving: boolean;
    lastSavedAt: string | null;

    versionHistory: VersionMeta[];
    currentVersionIndex: number;
    isUndoRedoLoading: boolean;

    currentUser: User | null;
    connectedUsers: User[];

    addElement: (type: ElementType, x?: number, y?: number) => void;
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    activateElement: (id: string | null) => void;
    deleteElement: (id: string) => void;
    markDirty: () => void;

    loadDocument: (id: string) => Promise<void>;
    saveDocument: () => Promise<void>;
    createDocument: (name?: string) => Promise<string>;
    renameDocument: (name: string) => Promise<void>;
    resetCanvas: () => void;

    undo: () => Promise<void>;
    redo: () => Promise<void>;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    documentId: null,
    documentName: null,
    versionId: null,
    elements: [],
    activeElementId: null,
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,

    versionHistory: [],
    currentVersionIndex: -1,
    isUndoRedoLoading: false,

    currentUser: null,
    connectedUsers: [],

    addElement: (type, x, y) => {
        const size = DEFAULT_ELEMENT_SIZES[type];
        const cx = x ?? 400 + Math.random() * 60 - 30;
        const cy = y ?? 300 + Math.random() * 60 - 30;

        const element: CanvasElement = {
            id: uuidv4(),
            type,
            x: cx - size.width / 2,
            y: cy - size.height / 2,
            width: size.width,
            height: size.height,
            ...(type === "text" ? { content: "Text" } : {}),
        };

        set((state) => ({
            elements: [...state.elements, element],
            activeElementId: element.id,
            isDirty: true,
        }));
        get().saveDocument();
    },

    updateElement: (id, updates) =>
        set((state) => ({
            elements: state.elements.map((el) =>
                el.id === id ? { ...el, ...updates } : el
            ),
        })),

    activateElement: (id) => set({ activeElementId: id }),

    deleteElement: (id) => {
        set((state) => ({
            elements: state.elements.filter((el) => el.id !== id),
            activeElementId:
                state.activeElementId === id ? null : state.activeElementId,
            isDirty: true,
        }));
        get().saveDocument();
    },

    markDirty: () => set({ isDirty: true }),

    loadDocument: async (id: string) => {
        const prevDocId = get().documentId;
        if (prevDocId) leaveDocument();

        const doc = await api.getDocument(id);
        const latest = doc.versions[doc.versions.length - 1];
        const history: VersionMeta[] = doc.versions.map((v) => ({
            versionId: v.versionId,
            savedAt: v.savedAt,
        }));
        set({
            documentId: doc.id,
            documentName: doc.name,
            versionId: latest?.versionId ?? null,
            elements: latest?.elements ?? [],
            activeElementId: null,
            isDirty: false,
            lastSavedAt: latest?.savedAt ?? null,
            versionHistory: history,
            currentVersionIndex: history.length - 1,
            connectedUsers: [],
        });

        joinDocument(doc.id);
    },

    saveDocument: async () => {
        const {
            documentId,
            elements,
            isSaving,
            isDirty,
            versionHistory,
            currentVersionIndex,
        } = get();
        if (!documentId || isSaving || !isDirty) return;

        set({ isSaving: true });
        try {
            const isUndone =
                currentVersionIndex >= 0 &&
                currentVersionIndex < versionHistory.length - 1;
            const afterVersionId = isUndone
                ? versionHistory[currentVersionIndex].versionId
                : undefined;

            const result = await emitSaveDocument(
                documentId,
                elements,
                afterVersionId
            );

            const newMeta: VersionMeta = {
                versionId: result.versionId,
                savedAt: result.savedAt,
            };

            const baseHistory = isUndone
                ? versionHistory.slice(0, currentVersionIndex + 1)
                : versionHistory;
            const newHistory = [...baseHistory, newMeta];

            set({
                versionId: result.versionId,
                isDirty: false,
                isSaving: false,
                lastSavedAt: result.savedAt,
                versionHistory: newHistory,
                currentVersionIndex: newHistory.length - 1,
            });
        } catch {
            set({ isSaving: false });
        }
    },

    createDocument: async (name?: string) => {
        const prevDocId = get().documentId;
        if (prevDocId) leaveDocument();

        const doc = await api.createDocument(name);
        const history: VersionMeta[] = doc.versions.map((v) => ({
            versionId: v.versionId,
            savedAt: v.savedAt,
        }));
        set({
            documentId: doc.id,
            documentName: doc.name,
            versionId: doc.versions[0]?.versionId ?? null,
            elements: doc.versions[0]?.elements ?? [],
            activeElementId: null,
            isDirty: false,
            lastSavedAt: doc.createdAt,
            versionHistory: history,
            currentVersionIndex: history.length - 1,
            connectedUsers: [],
        });

        joinDocument(doc.id);
        return doc.id;
    },

    renameDocument: async (name: string) => {
        const { documentId } = get();
        if (!documentId) return;
        const result = await api.renameDocument(documentId, name);
        set({ documentName: result.name });
    },

    resetCanvas: () => {
        const prevDocId = get().documentId;
        if (prevDocId) leaveDocument();
        set({
            documentId: null,
            documentName: null,
            versionId: null,
            elements: [],
            activeElementId: null,
            isDirty: false,
            isSaving: false,
            lastSavedAt: null,
            versionHistory: [],
            currentVersionIndex: -1,
            isUndoRedoLoading: false,
            connectedUsers: [],
        });
    },

    canUndo: () => {
        const { currentVersionIndex, isDirty } = get();
        return currentVersionIndex > 0 || isDirty;
    },

    canRedo: () => {
        const { currentVersionIndex, versionHistory, isDirty } = get();
        return !isDirty && currentVersionIndex < versionHistory.length - 1;
    },

    undo: async () => {
        const {
            documentId,
            currentVersionIndex,
            versionHistory,
            isUndoRedoLoading,
            isDirty,
        } = get();
        if (!documentId || isUndoRedoLoading) return;

        if (isDirty) {
            if (currentVersionIndex < 0) {
                set({ isDirty: false, elements: [], activeElementId: null });
                return;
            }
            set({ isUndoRedoLoading: true });
            try {
                const version = await api.getVersion(
                    documentId,
                    versionHistory[currentVersionIndex].versionId
                );
                set({
                    elements: version.elements,
                    versionId: version.versionId,
                    activeElementId: null,
                    isDirty: false,
                    isUndoRedoLoading: false,
                });
            } catch {
                set({ isUndoRedoLoading: false });
            }
            return;
        }

        if (currentVersionIndex <= 0) return;

        const targetIndex = currentVersionIndex - 1;
        set({ isUndoRedoLoading: true });
        try {
            const version = await api.getVersion(
                documentId,
                versionHistory[targetIndex].versionId
            );
            set({
                currentVersionIndex: targetIndex,
                elements: version.elements,
                versionId: version.versionId,
                activeElementId: null,
                isDirty: false,
                isUndoRedoLoading: false,
                lastSavedAt: version.savedAt,
            });
        } catch {
            set({ isUndoRedoLoading: false });
        }
    },

    redo: async () => {
        const {
            documentId,
            currentVersionIndex,
            versionHistory,
            isUndoRedoLoading,
            isDirty,
        } = get();
        if (
            !documentId ||
            isUndoRedoLoading ||
            isDirty ||
            currentVersionIndex >= versionHistory.length - 1
        )
            return;

        const targetIndex = currentVersionIndex + 1;
        set({ isUndoRedoLoading: true });
        try {
            const version = await api.getVersion(
                documentId,
                versionHistory[targetIndex].versionId
            );
            set({
                currentVersionIndex: targetIndex,
                elements: version.elements,
                versionId: version.versionId,
                activeElementId: null,
                isDirty: false,
                isUndoRedoLoading: false,
                lastSavedAt: version.savedAt,
            });
        } catch {
            set({ isUndoRedoLoading: false });
        }
    },
}));
