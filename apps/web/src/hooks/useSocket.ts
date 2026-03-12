import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  SocketClientEvents,
  SocketServerEvents,
  CanvasDocument,
  CanvasElement,
} from "@starter/shared";
import { useCanvasStore, type SpatialTarget } from "../store/appStore";

const SOCKET_URL = "http://localhost:3001";

type TypedSocket = Socket<SocketServerEvents, SocketClientEvents>;

interface BufferedEvent {
  type: "elements-updated" | "document-saved";
  seq: number;
  data: unknown;
}

export function useSocket(documentId: string | null) {
  const socketRef = useRef<TypedSocket | null>(null);
  const bufferRef = useRef<BufferedEvent[]>([]);
  const restSeqRef = useRef<number | null>(null);

  const userId = useCanvasStore((s) => s.userId);

  useEffect(() => {
    if (!documentId) return;

    const socket: TypedSocket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
    socketRef.current = socket;
    bufferRef.current = [];
    restSeqRef.current = null;

    socket.on("connect", () => {
      socket.emit("join-document", { documentId, userId });
    });

    socket.on("elements-updated", (data) => {
      if (restSeqRef.current === null) {
        bufferRef.current.push({ type: "elements-updated", seq: data.seq, data });
        return;
      }

      if (data.seq <= restSeqRef.current) return;

      const store = useCanvasStore.getState();
      if (data.seq <= store.seq) return;

      applyLiveUpdate(data.elements, data.seq, data.userId, store.userId);
    });

    socket.on("document-saved", (data) => {
      if (restSeqRef.current === null) {
        bufferRef.current.push({ type: "document-saved", seq: data.seq, data });
        return;
      }

      if (data.seq <= restSeqRef.current) return;

      const store = useCanvasStore.getState();
      if (data.seq <= store.seq) return;

      applySaveUpdate(data.document, data.seq, store.userId);
    });

    socket.on("element-locked", ({ elementId, userId: lockUserId }) => {
      useCanvasStore.getState().setLock(elementId, lockUserId);
    });

    socket.on("element-unlocked", ({ elementId }) => {
      useCanvasStore.getState().removeLock(elementId);
    });

    socket.on("save-error", ({ error }) => {
      console.error("Save error:", error);
    });

    return () => {
      socket.emit("leave-document", { documentId, userId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, userId]);

  const onRestDocumentLoaded = useCallback(
    (doc: CanvasDocument, seq: number) => {
      restSeqRef.current = seq;

      const buffered = bufferRef.current
        .filter((b) => b.seq > seq)
        .sort((a, b) => a.seq - b.seq);
      bufferRef.current = [];

      const localUserId = useCanvasStore.getState().userId;
      for (const event of buffered) {
        if (event.type === "elements-updated") {
          const d = event.data as { elements: CanvasElement[]; seq: number; userId: string };
          applyLiveUpdate(d.elements, d.seq, d.userId, localUserId);
        } else {
          const d = event.data as { document: CanvasDocument; seq: number };
          applySaveUpdate(d.document, d.seq, localUserId);
        }
      }

      useCanvasStore.getState().setDocumentReady(true);
    },
    []
  );

  const updateElementsViaSocket = useCallback(
    (elements: CanvasElement[]) => {
      if (!socketRef.current || !documentId) return;
      socketRef.current.emit("update-elements", {
        documentId,
        userId,
        elements,
      });
    },
    [documentId, userId]
  );

  const saveViaSocket = useCallback(
    (elements: CanvasElement[], name?: string) => {
      if (!socketRef.current || !documentId) return;
      socketRef.current.emit("save-document", {
        documentId,
        userId,
        elements,
        name,
      });
    },
    [documentId, userId]
  );

  const lockElement = useCallback(
    (elementId: string) => {
      if (!socketRef.current || !documentId) return;
      useCanvasStore.getState().setLock(elementId, userId);
      socketRef.current.emit("lock-element", { documentId, elementId, userId });
    },
    [documentId, userId]
  );

  const unlockElement = useCallback(
    (elementId: string) => {
      if (!socketRef.current || !documentId) return;
      useCanvasStore.getState().removeLock(elementId);
      socketRef.current.emit("unlock-element", {
        documentId,
        elementId,
        userId,
      });
    },
    [documentId, userId]
  );

  return {
    socketRef,
    onRestDocumentLoaded,
    updateElementsViaSocket,
    saveViaSocket,
    lockElement,
    unlockElement,
  };
}

function applyLiveUpdate(
  elements: CanvasElement[],
  seq: number,
  fromUserId: string,
  localUserId: string
) {
  const store = useCanvasStore.getState();

  const selectedId = store.selectedId;
  const isSelectedLockedByMe = selectedId
    ? store.locks.find(
        (l) => l.elementId === selectedId && l.userId === localUserId
      )
    : false;

  let merged = elements;
  if (isSelectedLockedByMe && selectedId) {
    const localElement = store.elements.find((e) => e.id === selectedId);
    if (localElement) {
      merged = merged.map((e) => (e.id === selectedId ? localElement : e));
    }
  }

  const currentElements = store.elements;
  const newTargets: Record<string, SpatialTarget> = { ...store.elementTargets };

  const lerpedElements = merged.map((newEl) => {
    const curEl = currentElements.find((e) => e.id === newEl.id);
    if (!curEl) return newEl;

    const spatialChanged =
      curEl.x !== newEl.x ||
      curEl.y !== newEl.y ||
      curEl.width !== newEl.width ||
      curEl.height !== newEl.height ||
      curEl.rotation !== newEl.rotation;

    if (spatialChanged) {
      newTargets[newEl.id] = {
        x: newEl.x,
        y: newEl.y,
        width: newEl.width,
        height: newEl.height,
        rotation: newEl.rotation,
      };
      return {
        ...newEl,
        x: curEl.x,
        y: curEl.y,
        width: curEl.width,
        height: curEl.height,
        rotation: curEl.rotation,
      } as CanvasElement;
    }

    return newEl;
  });

  useCanvasStore.setState({
    elements: lerpedElements,
    seq,
    elementTargets: newTargets,
  });
}

function applySaveUpdate(
  doc: CanvasDocument,
  seq: number,
  localUserId: string
) {
  const store = useCanvasStore.getState();

  const selectedId = store.selectedId;
  const isSelectedLockedByMe = selectedId
    ? store.locks.find(
        (l) => l.elementId === selectedId && l.userId === localUserId
      )
    : false;

  let elements = doc.elements;
  if (isSelectedLockedByMe && selectedId) {
    const localElement = store.elements.find((e) => e.id === selectedId);
    if (localElement) {
      elements = elements.map((e) =>
        e.id === selectedId ? localElement : e
      );
    }
  }

  useCanvasStore.setState({
    elements,
    version: doc.version,
    seq,
    docName: doc.name,
    isDirty: false,
    elementTargets: {},
  });
}
