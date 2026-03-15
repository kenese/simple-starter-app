import express from "express";
import { createServer } from "http";
import cors from "cors";
import type {
    DesignDocument,
    DesignSnapshot,
    GetDocumentResponse,
    SaveDocumentVersionRequest,
    SaveDocumentVersionResponse,
} from "@starter/shared";

const app: express.Express = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const MAX_DOCUMENT_VERSIONS = 10;

const documentStore = new Map<string, DesignDocument>();

const isDesignSnapshot = (value: unknown): value is DesignSnapshot => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const snapshot = value as Partial<DesignSnapshot>;
    return Array.isArray(snapshot.elements);
};

// ─── REST API ───────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.get("/api/documents/:documentId", (req, res) => {
    const { documentId } = req.params;
    const document = documentStore.get(documentId);

    if (!document) {
        return res.status(404).json({ message: "Document not found" });
    }

    const payload: GetDocumentResponse = { document };
    return res.json(payload);
});

app.post("/api/documents/:documentId/versions", (req, res) => {
    const { documentId } = req.params;
    const body = req.body as SaveDocumentVersionRequest;

    if (!isDesignSnapshot(body?.snapshot)) {
        return res.status(400).json({ message: "Invalid snapshot payload" });
    }

    const existing = documentStore.get(documentId);
    const previousLatestVersion = existing?.latestVersion ?? 0;
    const nextVersion = previousLatestVersion + 1;

    const nextVersions = [
        ...(existing?.versions ?? []),
        {
            version: nextVersion,
            savedAt: new Date().toISOString(),
            snapshot: body.snapshot,
        },
    ].slice(-MAX_DOCUMENT_VERSIONS);

    const nextDocument: DesignDocument = {
        documentId,
        latestVersion: nextVersion,
        versions: nextVersions,
    };

    documentStore.set(documentId, nextDocument);

    const payload: SaveDocumentVersionResponse = { document: nextDocument };
    return res.status(201).json(payload);
});

// ─── Start ──────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test") {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

export { app };

