import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { io as ioc, Socket as ClientSocket } from "socket.io-client";
import { httpServer, io, getDocuments, getElementLocks, getUserSockets } from "./index";
import type { SocketServerEvents } from "@starter/shared";

let port: number;

function connect(): ClientSocket<SocketServerEvents> {
  return ioc(`http://localhost:${port}`, {
    transports: ["websocket"],
    forceNew: true,
  }) as ClientSocket<SocketServerEvents>;
}

function waitFor<T>(
  socket: ClientSocket<SocketServerEvents>,
  event: keyof SocketServerEvents,
  timeout = 2000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${String(event)}"`)),
      timeout
    );
    (socket as any).once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("Socket.IO Handlers", () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
    const addr = httpServer.address();
    port = typeof addr === "object" && addr ? addr.port : 0;
  });

  afterAll(async () => {
    io.close();
  });

  beforeEach(() => {
    getDocuments().clear();
    getElementLocks().clear();
    getUserSockets().clear();
  });

  // ─── Join / Leave ───────────────────────────────────────────

  it("broadcasts user-joined when a user joins a document", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    await delay(50);

    const joinedPromise = waitFor<{ userId: string }>(clientA, "user-joined");
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });

    const data = await joinedPromise;
    expect(data.userId).toBe("userB");

    clientA.disconnect();
    clientB.disconnect();
  });

  it("broadcasts user-left when a user leaves", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    const leftPromise = waitFor<{ userId: string }>(clientA, "user-left");
    clientB.emit("leave-document", { documentId: "doc-1", userId: "userB" });

    const data = await leftPromise;
    expect(data.userId).toBe("userB");

    clientA.disconnect();
    clientB.disconnect();
  });

  // ─── Update Elements ───────────────────────────────────────

  it("broadcasts elements-updated to other users in the room", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    const elements = [
      {
        id: "e1",
        type: "rect" as const,
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        rotation: 0,
        fill: "#6366f1",
      },
    ];

    const updatePromise = waitFor<{
      elements: typeof elements;
      seq: number;
      userId: string;
    }>(clientB, "elements-updated");

    clientA.emit("update-elements", {
      documentId: "doc-1",
      userId: "userA",
      elements,
    });

    const data = await updatePromise;
    expect(data.elements).toHaveLength(1);
    expect(data.elements[0].id).toBe("e1");
    expect(data.userId).toBe("userA");
    expect(data.seq).toBeGreaterThan(0);

    clientA.disconnect();
    clientB.disconnect();
  });

  it("does not echo elements-updated back to sender", async () => {
    const clientA = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    await delay(50);

    let received = false;
    (clientA as any).on("elements-updated", () => {
      received = true;
    });

    clientA.emit("update-elements", {
      documentId: "doc-1",
      userId: "userA",
      elements: [],
    });

    await delay(200);
    expect(received).toBe(false);

    clientA.disconnect();
  });

  // ─── Save Document ─────────────────────────────────────────

  it("broadcasts document-saved to all users in the room", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    const savedA = waitFor<{ document: any; seq: number }>(
      clientA,
      "document-saved"
    );
    const savedB = waitFor<{ document: any; seq: number }>(
      clientB,
      "document-saved"
    );

    clientA.emit("save-document", {
      documentId: "doc-1",
      userId: "userA",
      elements: [],
      name: "My Doc",
    });

    const [dataA, dataB] = await Promise.all([savedA, savedB]);
    expect(dataA.document.name).toBe("My Doc");
    expect(dataA.document.version).toBe(1);
    expect(dataB.document.name).toBe("My Doc");
    expect(dataB.document.version).toBe(1);

    clientA.disconnect();
    clientB.disconnect();
  });

  it("emits save-error for duplicate document names", async () => {
    const clientA = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    await delay(50);

    const saved = waitFor(clientA, "document-saved");
    clientA.emit("save-document", {
      documentId: "doc-1",
      userId: "userA",
      elements: [],
      name: "Taken Name",
    });
    await saved;

    const clientB = connect();
    await delay(50);
    clientB.emit("join-document", { documentId: "doc-2", userId: "userB" });
    await delay(50);

    const errorPromise = waitFor<{ error: string }>(clientB, "save-error");
    clientB.emit("save-document", {
      documentId: "doc-2",
      userId: "userB",
      elements: [],
      name: "Taken Name",
    });

    const errorData = await errorPromise;
    expect(errorData.error).toBe("Document name must be unique");

    clientA.disconnect();
    clientB.disconnect();
  });

  // ─── Locking ───────────────────────────────────────────────

  it("broadcasts element-locked to other users", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    const lockPromise = waitFor<{ elementId: string; userId: string }>(
      clientB,
      "element-locked"
    );

    clientA.emit("lock-element", {
      documentId: "doc-1",
      elementId: "e1",
      userId: "userA",
    });

    const data = await lockPromise;
    expect(data.elementId).toBe("e1");
    expect(data.userId).toBe("userA");

    clientA.disconnect();
    clientB.disconnect();
  });

  it("broadcasts element-unlocked to other users", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    clientA.emit("lock-element", {
      documentId: "doc-1",
      elementId: "e1",
      userId: "userA",
    });
    await waitFor(clientB, "element-locked");

    const unlockPromise = waitFor<{ elementId: string; userId: string }>(
      clientB,
      "element-unlocked"
    );

    clientA.emit("unlock-element", {
      documentId: "doc-1",
      elementId: "e1",
      userId: "userA",
    });

    const data = await unlockPromise;
    expect(data.elementId).toBe("e1");

    clientA.disconnect();
    clientB.disconnect();
  });

  it("rejects lock if element is already locked by another user", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    clientA.emit("lock-element", {
      documentId: "doc-1",
      elementId: "e1",
      userId: "userA",
    });
    await waitFor(clientB, "element-locked");

    let lockedAgain = false;
    (clientA as any).on("element-locked", () => {
      lockedAgain = true;
    });

    clientB.emit("lock-element", {
      documentId: "doc-1",
      elementId: "e1",
      userId: "userB",
    });

    await delay(200);
    expect(lockedAgain).toBe(false);

    const locks = getElementLocks().get("doc-1");
    expect(locks?.get("e1")).toBe("userA");

    clientA.disconnect();
    clientB.disconnect();
  });

  it("sends existing locks to newly joined user", async () => {
    const clientA = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    await delay(50);
    clientA.emit("lock-element", {
      documentId: "doc-1",
      elementId: "e1",
      userId: "userA",
    });
    await delay(50);

    const clientB = connect();
    const lockPromise = waitFor<{ elementId: string; userId: string }>(
      clientB,
      "element-locked"
    );
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });

    const data = await lockPromise;
    expect(data.elementId).toBe("e1");
    expect(data.userId).toBe("userA");

    clientA.disconnect();
    clientB.disconnect();
  });

  // ─── WebRTC Signaling Relay ────────────────────────────────

  it("relays webrtc-offer to the target user", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    const offerPromise = waitFor<{ fromUserId: string; offer: any }>(
      clientB,
      "webrtc-offer" as any
    );

    (clientA as any).emit("webrtc-offer", {
      targetUserId: "userB",
      offer: { type: "offer", sdp: "fake-sdp" },
    });

    const data = await offerPromise;
    expect(data.fromUserId).toBe("userA");
    expect(data.offer.type).toBe("offer");
    expect(data.offer.sdp).toBe("fake-sdp");

    clientA.disconnect();
    clientB.disconnect();
  });

  it("relays webrtc-answer to the target user", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    const answerPromise = waitFor<{ fromUserId: string; answer: any }>(
      clientA,
      "webrtc-answer" as any
    );

    (clientB as any).emit("webrtc-answer", {
      targetUserId: "userA",
      answer: { type: "answer", sdp: "fake-answer-sdp" },
    });

    const data = await answerPromise;
    expect(data.fromUserId).toBe("userB");
    expect(data.answer.type).toBe("answer");

    clientA.disconnect();
    clientB.disconnect();
  });

  it("relays webrtc-ice-candidate to the target user", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    const icePromise = waitFor<{ fromUserId: string; candidate: any }>(
      clientB,
      "webrtc-ice-candidate" as any
    );

    (clientA as any).emit("webrtc-ice-candidate", {
      targetUserId: "userB",
      candidate: { candidate: "fake-candidate", sdpMid: "0" },
    });

    const data = await icePromise;
    expect(data.fromUserId).toBe("userA");
    expect(data.candidate.candidate).toBe("fake-candidate");

    clientA.disconnect();
    clientB.disconnect();
  });

  it("cleans up userSockets on disconnect", async () => {
    const clientA = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    await delay(50);
    expect(getUserSockets().has("userA")).toBe(true);

    clientA.disconnect();
    await delay(200);
    expect(getUserSockets().has("userA")).toBe(false);
  });

  // ─── Disconnect ────────────────────────────────────────────

  it("unlocks all elements and broadcasts user-left on disconnect", async () => {
    const clientA = connect();
    const clientB = connect();

    await delay(50);
    clientA.emit("join-document", { documentId: "doc-1", userId: "userA" });
    clientB.emit("join-document", { documentId: "doc-1", userId: "userB" });
    await delay(50);

    clientA.emit("lock-element", {
      documentId: "doc-1",
      elementId: "e1",
      userId: "userA",
    });
    clientA.emit("lock-element", {
      documentId: "doc-1",
      elementId: "e2",
      userId: "userA",
    });
    await delay(100);

    const leftPromise = waitFor<{ userId: string }>(clientB, "user-left");

    clientA.disconnect();

    const leftData = await leftPromise;
    expect(leftData.userId).toBe("userA");

    await delay(100);
    const locks = getElementLocks().get("doc-1");
    const remaining = locks ? Array.from(locks.entries()) : [];
    expect(remaining).toHaveLength(0);

    clientB.disconnect();
  });
});
