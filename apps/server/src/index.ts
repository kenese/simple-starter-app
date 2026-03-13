import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import type {
    CanvasDocument,
    DocumentMeta,
    SaveDocumentRequest,
    SaveDocumentResponse,
    CreateDocumentRequest,
    RenameDocumentRequest,
    User,
    SaveDocumentSocketPayload,
    SaveDocumentAck,
} from "@starter/shared";

const app: express.Express = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

// ─── In-Memory Document Store ───────────────────────────────────

const MAX_VERSIONS = 10;
const documents = new Map<string, CanvasDocument>();

function nextUntitledName(excludeId?: string): string {
    const existing = new Set<string>();
    for (const [id, doc] of documents) {
        if (id !== excludeId) existing.add(doc.name);
    }
    if (!existing.has("Untitled")) return "Untitled";
    let n = 2;
    while (existing.has(`Untitled (${n})`)) n++;
    return `Untitled (${n})`;
}

function isNameTaken(name: string, excludeId?: string): boolean {
    for (const [id, doc] of documents) {
        if (id !== excludeId && doc.name === name) return true;
    }
    return false;
}

// ─── REST API ───────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.get("/api/documents", (_req, res) => {
    const metas: DocumentMeta[] = Array.from(documents.values()).map((d) => ({
        id: d.id,
        name: d.name,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
    }));
    res.json(metas);
});

app.post("/api/documents", (req, res) => {
    const { name } = (req.body ?? {}) as CreateDocumentRequest;
    const docName = name && !isNameTaken(name) ? name : nextUntitledName();
    const now = new Date().toISOString();
    const doc: CanvasDocument = {
        id: uuidv4(),
        name: docName,
        versions: [
            {
                versionId: uuidv4(),
                elements: [],
                savedAt: now,
            },
        ],
        createdAt: now,
        updatedAt: now,
    };
    documents.set(doc.id, doc);
    res.status(201).json(doc);
});

app.get("/api/documents/:id", (req, res) => {
    const doc = documents.get(req.params.id);
    if (!doc) {
        res.status(404).json({ error: "Document not found" });
        return;
    }
    res.json(doc);
});

app.get("/api/documents/:id/versions/:versionId", (req, res) => {
    const doc = documents.get(req.params.id);
    if (!doc) {
        res.status(404).json({ error: "Document not found" });
        return;
    }
    const version = doc.versions.find(
        (v) => v.versionId === req.params.versionId
    );
    if (!version) {
        res.status(404).json({ error: "Version not found" });
        return;
    }
    res.json(version);
});

app.put("/api/documents/:id", (req, res) => {
    const doc = documents.get(req.params.id);
    if (!doc) {
        res.status(404).json({ error: "Document not found" });
        return;
    }

    const { elements, afterVersionId } = req.body as SaveDocumentRequest;
    const now = new Date().toISOString();
    const versionId = uuidv4();

    if (afterVersionId) {
        const idx = doc.versions.findIndex(
            (v) => v.versionId === afterVersionId
        );
        if (idx !== -1) {
            doc.versions = doc.versions.slice(0, idx + 1);
        }
    }

    doc.versions.push({ versionId, elements, savedAt: now });
    if (doc.versions.length > MAX_VERSIONS) {
        doc.versions = doc.versions.slice(-MAX_VERSIONS);
    }
    doc.updatedAt = now;

    const response: SaveDocumentResponse = { id: doc.id, versionId };
    res.json(response);
});

app.patch("/api/documents/:id", (req, res) => {
    const doc = documents.get(req.params.id);
    if (!doc) {
        res.status(404).json({ error: "Document not found" });
        return;
    }
    const { name } = req.body as RenameDocumentRequest;
    if (!name || !name.trim()) {
        res.status(400).json({ error: "Name is required" });
        return;
    }
    const trimmed = name.trim();
    if (isNameTaken(trimmed, doc.id)) {
        res.status(409).json({ error: "Name already in use" });
        return;
    }
    doc.name = trimmed;
    doc.updatedAt = new Date().toISOString();
    res.json({ id: doc.id, name: doc.name });
});

app.delete("/api/documents/:id", (req, res) => {
    if (!documents.has(req.params.id)) {
        res.status(404).json({ error: "Document not found" });
        return;
    }
    documents.delete(req.params.id);
    res.status(204).send();
});

// ─── Socket.IO ──────────────────────────────────────────────────

const io = new SocketServer(httpServer, {
    cors: { origin: "*" },
});

const USER_COLORS = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
    "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

interface ConnectedUser extends User {
    socketId: string;
    documentId: string | null;
}

const connectedUsers = new Map<string, ConnectedUser>();
let colorIndex = 0;
let userCounter = 0;

function getUsersInRoom(documentId: string): User[] {
    const users: User[] = [];
    for (const user of connectedUsers.values()) {
        if (user.documentId === documentId) {
            users.push({ id: user.id, displayName: user.displayName, color: user.color });
        }
    }
    return users;
}

io.on("connection", (socket) => {
    const userId = uuidv4();
    userCounter++;
    const color = USER_COLORS[colorIndex % USER_COLORS.length];
    colorIndex++;
    const displayName = `User ${userCounter}`;

    const user: ConnectedUser = {
        id: userId,
        displayName,
        color,
        socketId: socket.id,
        documentId: null,
    };
    connectedUsers.set(socket.id, user);

    socket.emit("user-identity", { id: userId, displayName, color });

    socket.on("join-document", ({ documentId }: { documentId: string }) => {
        if (user.documentId) {
            const oldDocId = user.documentId;
            socket.leave(`doc:${oldDocId}`);
            user.documentId = null;
            io.to(`doc:${oldDocId}`).emit("users-updated", {
                documentId: oldDocId,
                users: getUsersInRoom(oldDocId),
            });
        }

        user.documentId = documentId;
        socket.join(`doc:${documentId}`);

        io.to(`doc:${documentId}`).emit("users-updated", {
            documentId,
            users: getUsersInRoom(documentId),
        });
    });

    socket.on("save-document", (payload: SaveDocumentSocketPayload, callback?: (ack: SaveDocumentAck) => void) => {
        const doc = documents.get(payload.documentId);
        if (!doc) {
            callback?.({ error: "Document not found" });
            return;
        }

        const now = new Date().toISOString();
        const versionId = uuidv4();

        if (payload.afterVersionId) {
            const idx = doc.versions.findIndex((v) => v.versionId === payload.afterVersionId);
            if (idx !== -1) {
                doc.versions = doc.versions.slice(0, idx + 1);
            }
        }

        doc.versions.push({ versionId, elements: payload.elements, savedAt: now });
        if (doc.versions.length > MAX_VERSIONS) {
            doc.versions = doc.versions.slice(-MAX_VERSIONS);
        }
        doc.updatedAt = now;

        callback?.({ versionId, savedAt: now });

        socket.to(`doc:${payload.documentId}`).emit("elements-updated", {
            documentId: payload.documentId,
            elements: payload.elements,
            userId,
            versionId,
            savedAt: now,
        });
    });

    socket.on("leave-document", () => {
        if (user.documentId) {
            const oldDocId = user.documentId;
            socket.leave(`doc:${oldDocId}`);
            user.documentId = null;
            io.to(`doc:${oldDocId}`).emit("users-updated", {
                documentId: oldDocId,
                users: getUsersInRoom(oldDocId),
            });
        }
    });

    socket.on("disconnect", () => {
        const oldDocId = user.documentId;
        connectedUsers.delete(socket.id);
        if (oldDocId) {
            io.to(`doc:${oldDocId}`).emit("users-updated", {
                documentId: oldDocId,
                users: getUsersInRoom(oldDocId),
            });
        }
    });
});

// ─── Start ──────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test") {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

export { app, documents, io };

