import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { app, documents, io } from "./index";

const PORT = 0; // auto-assign
let httpServer: ReturnType<typeof createServer>;
let serverAddress: string;

function createClient(): ClientSocket {
    return ioClient(serverAddress, {
        transports: ["websocket"],
        forceNew: true,
    });
}

function waitForEvent<T>(socket: ClientSocket, event: string): Promise<T> {
    return new Promise((resolve) => {
        socket.once(event, (data: T) => resolve(data));
    });
}

beforeAll(
    () =>
        new Promise<void>((resolve) => {
            httpServer = app.listen(0, () => {
                const addr = httpServer.address();
                const port = typeof addr === "object" && addr ? addr.port : 0;
                serverAddress = `http://localhost:${port}`;
                io.attach(httpServer);
                resolve();
            });
        })
);

afterAll(
    () =>
        new Promise<void>((resolve) => {
            io.close();
            httpServer.close(() => resolve());
        })
);

beforeEach(() => {
    documents.clear();
});

describe("Socket.IO — connection", () => {
    it("assigns user-identity on connect", async () => {
        const client = createClient();
        const identity = await waitForEvent<{
            id: string;
            displayName: string;
            color: string;
        }>(client, "user-identity");

        expect(identity.id).toBeDefined();
        expect(identity.displayName).toMatch(/^User \d+$/);
        expect(identity.color).toMatch(/^#[0-9a-f]{6}$/);
        client.disconnect();
    });
});

describe("Socket.IO — join-document", () => {
    it("broadcasts users-updated when a user joins a document room", async () => {
        const docId = "test-doc-join";
        documents.set(docId, {
            id: docId,
            name: "Test",
            versions: [{ versionId: "v0", elements: [], savedAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const client = createClient();
        await waitForEvent(client, "user-identity");

        const usersPromise = waitForEvent<{
            documentId: string;
            users: Array<{ id: string; displayName: string; color: string }>;
        }>(client, "users-updated");

        client.emit("join-document", { documentId: docId });
        const payload = await usersPromise;

        expect(payload.documentId).toBe(docId);
        expect(payload.users).toHaveLength(1);
        expect(payload.users[0].id).toBeDefined();
        client.disconnect();
    });

    it("shows both users when two clients join the same document", async () => {
        const docId = "test-doc-multi";
        documents.set(docId, {
            id: docId,
            name: "Multi",
            versions: [{ versionId: "v0", elements: [], savedAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const client1 = createClient();
        const client2 = createClient();
        await waitForEvent(client1, "user-identity");
        await waitForEvent(client2, "user-identity");

        client1.emit("join-document", { documentId: docId });
        await waitForEvent(client1, "users-updated");

        const users2Promise = waitForEvent<{
            documentId: string;
            users: Array<{ id: string }>;
        }>(client2, "users-updated");

        client2.emit("join-document", { documentId: docId });
        const payload = await users2Promise;

        expect(payload.users).toHaveLength(2);
        client1.disconnect();
        client2.disconnect();
    });
});

describe("Socket.IO — save-document", () => {
    it("persists document and acks with versionId", async () => {
        const docId = "test-doc-save";
        documents.set(docId, {
            id: docId,
            name: "Save Test",
            versions: [{ versionId: "v0", elements: [], savedAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const client = createClient();
        await waitForEvent(client, "user-identity");
        client.emit("join-document", { documentId: docId });
        await waitForEvent(client, "users-updated");

        const elements = [{ id: "e1", type: "rectangle", x: 10, y: 20, width: 100, height: 50 }];
        const ack = await new Promise<{ versionId: string; savedAt: string }>((resolve) => {
            client.emit("save-document", { documentId: docId, elements }, resolve);
        });

        expect(ack.versionId).toBeDefined();
        expect(ack.savedAt).toBeDefined();
        expect(documents.get(docId)!.versions).toHaveLength(2);
        expect(documents.get(docId)!.versions[1].elements).toEqual(elements);
        client.disconnect();
    });

    it("broadcasts elements-updated to other clients in the room", async () => {
        const docId = "test-doc-broadcast";
        documents.set(docId, {
            id: docId,
            name: "Broadcast Test",
            versions: [{ versionId: "v0", elements: [], savedAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const client1 = createClient();
        const client2 = createClient();
        await waitForEvent(client1, "user-identity");
        await waitForEvent(client2, "user-identity");

        client1.emit("join-document", { documentId: docId });
        await waitForEvent(client1, "users-updated");

        const c1JoinNotify = waitForEvent(client1, "users-updated");
        const c2JoinNotify = waitForEvent(client2, "users-updated");
        client2.emit("join-document", { documentId: docId });
        await c1JoinNotify;
        await c2JoinNotify;

        const elementsPromise = waitForEvent<{
            documentId: string;
            elements: Array<{ id: string }>;
            versionId: string;
            savedAt: string;
        }>(client2, "elements-updated");

        const elements = [{ id: "e1", type: "rectangle", x: 0, y: 0, width: 50, height: 50 }];
        client1.emit("save-document", { documentId: docId, elements }, () => {});

        const payload = await elementsPromise;
        expect(payload.documentId).toBe(docId);
        expect(payload.elements).toEqual(elements);
        expect(payload.versionId).toBeDefined();

        client1.disconnect();
        client2.disconnect();
    });

    it("returns error for non-existent document", async () => {
        const client = createClient();
        await waitForEvent(client, "user-identity");

        const ack = await new Promise<{ error?: string }>((resolve) => {
            client.emit("save-document", { documentId: "nonexistent", elements: [] }, resolve);
        });

        expect(ack.error).toBe("Document not found");
        client.disconnect();
    });
});

describe("Socket.IO — leave-document / disconnect", () => {
    it("updates user list when a client leaves", async () => {
        const docId = "test-doc-leave";
        documents.set(docId, {
            id: docId,
            name: "Leave Test",
            versions: [{ versionId: "v0", elements: [], savedAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const client1 = createClient();
        const client2 = createClient();
        await waitForEvent(client1, "user-identity");
        await waitForEvent(client2, "user-identity");

        client1.emit("join-document", { documentId: docId });
        await waitForEvent(client1, "users-updated");
        client2.emit("join-document", { documentId: docId });
        await waitForEvent(client2, "users-updated");

        const leavePromise = waitForEvent<{
            users: Array<{ id: string }>;
        }>(client1, "users-updated");

        client2.emit("leave-document");
        const payload = await leavePromise;

        expect(payload.users).toHaveLength(1);
        client1.disconnect();
        client2.disconnect();
    });

    it("updates user list when a client disconnects", async () => {
        const docId = "test-doc-disconnect";
        documents.set(docId, {
            id: docId,
            name: "Disconnect Test",
            versions: [{ versionId: "v0", elements: [], savedAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const client1 = createClient();
        const client2 = createClient();
        await waitForEvent(client1, "user-identity");
        await waitForEvent(client2, "user-identity");

        client1.emit("join-document", { documentId: docId });
        await waitForEvent(client1, "users-updated");

        const c1JoinNotify = waitForEvent(client1, "users-updated");
        const c2JoinNotify = waitForEvent(client2, "users-updated");
        client2.emit("join-document", { documentId: docId });
        await c1JoinNotify;
        await c2JoinNotify;

        const disconnectPromise = waitForEvent<{
            users: Array<{ id: string }>;
        }>(client1, "users-updated");

        client2.disconnect();
        const payload = await disconnectPromise;

        expect(payload.users).toHaveLength(1);
        client1.disconnect();
    });
});
