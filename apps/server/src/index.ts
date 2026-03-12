import express from "express";
import { createServer } from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import type {
  CanvasDocument,
  SaveDocumentRequest,
  SocketClientEvents,
  SocketServerEvents,
} from "@starter/shared";

const app: express.Express = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new SocketIOServer<SocketClientEvents, SocketServerEvents>(
  httpServer,
  { cors: { origin: "*" } }
);

// ─── In-memory document storage ─────────────────────────────────

const MAX_VERSIONS = 10;

interface StoredDocument {
  current: CanvasDocument;
  history: CanvasDocument[];
  seq: number;
}

const documents = new Map<string, StoredDocument>();
const elementLocks = new Map<string, Map<string, string>>();

export function getDocuments() {
  return documents;
}

export function getElementLocks() {
  return elementLocks;
}

// ─── Helpers ────────────────────────────────────────────────────

function generateUniqueName(excludeDocId?: string): string {
  const existingNames = new Set(
    Array.from(documents.values())
      .filter((s) => s.current.id !== excludeDocId)
      .map((s) => s.current.name)
  );

  if (!existingNames.has("Untitled")) return "Untitled";

  let i = 2;
  while (existingNames.has(`Untitled ${i}`)) i++;
  return `Untitled ${i}`;
}

function isNameTaken(name: string, excludeDocId?: string): boolean {
  return Array.from(documents.values()).some(
    (s) => s.current.name === name && s.current.id !== excludeDocId
  );
}

function getOrCreateDoc(docId: string): StoredDocument {
  let stored = documents.get(docId);
  if (!stored) {
    stored = {
      current: {
        id: docId,
        name: generateUniqueName(),
        elements: [],
        version: 0,
      },
      history: [],
      seq: 0,
    };
    documents.set(docId, stored);
  }
  return stored;
}

function saveDocumentToStore(
  docId: string,
  elements: CanvasDocument["elements"],
  name?: string
): { document: CanvasDocument; seq: number } | { error: string } {
  if (name !== undefined && isNameTaken(name, docId)) {
    return { error: "Document name must be unique" };
  }

  const stored = getOrCreateDoc(docId);

  if (stored.current.version > 0) {
    const history = [...stored.history, { ...stored.current }];
    if (history.length > MAX_VERSIONS) {
      history.splice(0, history.length - MAX_VERSIONS);
    }
    stored.history = history;
  }

  stored.current = {
    ...stored.current,
    elements,
    version: stored.current.version + 1,
    ...(name !== undefined && { name }),
  };
  stored.seq++;

  return { document: stored.current, seq: stored.seq };
}

// ─── REST API ───────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/documents", (_req, res) => {
  const list = Array.from(documents.values()).map((stored) => ({
    id: stored.current.id,
    name: stored.current.name,
    version: stored.current.version,
  }));
  res.json({ documents: list });
});

app.get("/api/documents/:id", (req, res) => {
  const stored = getOrCreateDoc(req.params.id);
  res.json({ document: stored.current, seq: stored.seq });
});

app.post("/api/documents/:id", (req, res) => {
  const { elements, name } = req.body as SaveDocumentRequest;
  const result = saveDocumentToStore(req.params.id, elements, name);

  if ("error" in result) {
    return res.status(409).json({ error: result.error });
  }

  res.json(result);
});

// ─── Socket.IO ──────────────────────────────────────────────────

io.on("connection", (socket) => {
  let currentRoom: string | null = null;
  let currentUserId: string | null = null;

  socket.on("join-document", ({ documentId, userId }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      unlockAllForUser(currentRoom, userId);
      socket.to(currentRoom).emit("user-left", { userId });
    }

    currentRoom = documentId;
    currentUserId = userId;
    socket.join(documentId);
    socket.to(documentId).emit("user-joined", { userId });

    const locks = elementLocks.get(documentId);
    if (locks) {
      for (const [elementId, lockUserId] of locks) {
        socket.emit("element-locked", { elementId, userId: lockUserId });
      }
    }
  });

  socket.on("leave-document", ({ documentId, userId }) => {
    socket.leave(documentId);
    unlockAllForUser(documentId, userId);
    socket.to(documentId).emit("user-left", { userId });
    if (currentRoom === documentId) {
      currentRoom = null;
      currentUserId = null;
    }
  });

  socket.on("update-elements", ({ documentId, elements, userId }) => {
    const stored = getOrCreateDoc(documentId);
    stored.current = { ...stored.current, elements };
    stored.seq++;

    socket.to(documentId).emit("elements-updated", {
      elements,
      seq: stored.seq,
      userId,
    });
  });

  socket.on("save-document", ({ documentId, elements, name }) => {
    const result = saveDocumentToStore(documentId, elements, name);

    if ("error" in result) {
      socket.emit("save-error", { error: result.error });
      return;
    }

    io.to(documentId).emit("document-saved", result);
  });

  socket.on("lock-element", ({ documentId, elementId, userId }) => {
    if (!elementLocks.has(documentId)) {
      elementLocks.set(documentId, new Map());
    }
    const locks = elementLocks.get(documentId)!;

    if (locks.has(elementId) && locks.get(elementId) !== userId) {
      return;
    }

    locks.set(elementId, userId);
    socket.to(documentId).emit("element-locked", { elementId, userId });
  });

  socket.on("unlock-element", ({ documentId, elementId, userId }) => {
    const locks = elementLocks.get(documentId);
    if (locks && locks.get(elementId) === userId) {
      locks.delete(elementId);
      socket.to(documentId).emit("element-unlocked", { elementId, userId });
    }
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentUserId) {
      unlockAllForUser(currentRoom, currentUserId);
      socket.to(currentRoom).emit("user-left", { userId: currentUserId });
    }
  });
});

function unlockAllForUser(documentId: string, userId: string) {
  const locks = elementLocks.get(documentId);
  if (!locks) return;

  for (const [elementId, lockUserId] of locks) {
    if (lockUserId === userId) {
      locks.delete(elementId);
      io.to(documentId).emit("element-unlocked", { elementId, userId });
    }
  }
}

// ─── Start ──────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export { app, httpServer, io };
