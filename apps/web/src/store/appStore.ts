import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { CanvasElement, ElementLock } from "@starter/shared";

const SESSION_USER_ID = uuidv4();

interface CanvasStore {
  userId: string;
  documentId: string | null;
  docName: string;
  elements: CanvasElement[];
  selectedId: string | null;
  version: number;
  seq: number;
  isDirty: boolean;
  localMutationCount: number;
  locks: ElementLock[];
  documentReady: boolean;

  setDocumentId: (id: string) => void;
  setDocName: (name: string) => void;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setElements: (elements: CanvasElement[]) => void;
  setVersion: (version: number) => void;
  setSeq: (seq: number) => void;
  markClean: () => void;
  setLock: (elementId: string, userId: string) => void;
  removeLock: (elementId: string) => void;
  clearLocks: () => void;
  setDocumentReady: (ready: boolean) => void;
  isLockedByOther: (elementId: string) => boolean;
  getLockOwner: (elementId: string) => string | null;
  resetForNewDocument: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  userId: SESSION_USER_ID,
  documentId: null,
  docName: "Untitled",
  elements: [],
  selectedId: null,
  version: 0,
  seq: 0,
  isDirty: false,
  localMutationCount: 0,
  locks: [],
  documentReady: false,

  setDocumentId: (id) => set({ documentId: id }),

  setDocName: (name) => set({ docName: name, isDirty: true }),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      isDirty: true,
      localMutationCount: state.localMutationCount + 1,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as CanvasElement) : el
      ),
      isDirty: true,
      localMutationCount: state.localMutationCount + 1,
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      isDirty: true,
      localMutationCount: state.localMutationCount + 1,
    })),

  setSelectedId: (id) => set({ selectedId: id }),

  setElements: (elements) => set({ elements }),

  setVersion: (version) => set({ version }),

  setSeq: (seq) => set({ seq }),

  markClean: () => set({ isDirty: false }),

  setLock: (elementId, userId) =>
    set((state) => ({
      locks: [
        ...state.locks.filter((l) => l.elementId !== elementId),
        { elementId, userId },
      ],
    })),

  removeLock: (elementId) =>
    set((state) => ({
      locks: state.locks.filter((l) => l.elementId !== elementId),
    })),

  clearLocks: () => set({ locks: [] }),

  setDocumentReady: (ready) => set({ documentReady: ready }),

  isLockedByOther: (elementId) => {
    const { locks, userId } = get();
    const lock = locks.find((l) => l.elementId === elementId);
    return !!lock && lock.userId !== userId;
  },

  getLockOwner: (elementId) => {
    const { locks } = get();
    return locks.find((l) => l.elementId === elementId)?.userId ?? null;
  },

  resetForNewDocument: () =>
    set({
      elements: [],
      selectedId: null,
      version: 0,
      seq: 0,
      isDirty: false,
      localMutationCount: 0,
      locks: [],
      documentReady: false,
      docName: "Untitled",
    }),
}));
