import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, documents } from "./index";

beforeEach(() => {
    documents.clear();
});

describe("GET /api/health", () => {
    it("returns ok", async () => {
        const res = await request(app).get("/api/health");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "ok" });
    });
});

describe("POST /api/documents", () => {
    it("creates a document with default name Untitled", async () => {
        const res = await request(app).post("/api/documents").send({});
        expect(res.status).toBe(201);
        expect(res.body.name).toBe("Untitled");
        expect(res.body.id).toBeDefined();
        expect(res.body.versions).toHaveLength(1);
        expect(res.body.versions[0].elements).toEqual([]);
    });

    it("creates a document with a custom name", async () => {
        const res = await request(app)
            .post("/api/documents")
            .send({ name: "My Design" });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe("My Design");
    });

    it("auto-increments Untitled names", async () => {
        const r1 = await request(app).post("/api/documents").send({});
        const r2 = await request(app).post("/api/documents").send({});
        const r3 = await request(app).post("/api/documents").send({});
        expect(r1.body.name).toBe("Untitled");
        expect(r2.body.name).toBe("Untitled (2)");
        expect(r3.body.name).toBe("Untitled (3)");
    });

    it("falls back to Untitled naming when custom name is taken", async () => {
        await request(app)
            .post("/api/documents")
            .send({ name: "My Design" });
        const r2 = await request(app)
            .post("/api/documents")
            .send({ name: "My Design" });
        expect(r2.body.name).toBe("Untitled");
    });
});

describe("GET /api/documents", () => {
    it("returns empty array when no documents exist", async () => {
        const res = await request(app).get("/api/documents");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it("returns metadata for all documents", async () => {
        await request(app).post("/api/documents").send({});
        await request(app).post("/api/documents").send({});
        const res = await request(app).get("/api/documents");
        expect(res.body).toHaveLength(2);
        expect(res.body[0]).toHaveProperty("id");
        expect(res.body[0]).toHaveProperty("name");
        expect(res.body[0]).not.toHaveProperty("versions");
    });
});

describe("GET /api/documents/:id", () => {
    it("returns the full document with versions", async () => {
        const created = await request(app).post("/api/documents").send({});
        const res = await request(app).get(
            `/api/documents/${created.body.id}`
        );
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(created.body.id);
        expect(res.body.versions).toHaveLength(1);
    });

    it("returns 404 for unknown id", async () => {
        const res = await request(app).get("/api/documents/nonexistent");
        expect(res.status).toBe(404);
    });
});

describe("PUT /api/documents/:id", () => {
    it("saves elements as a new version", async () => {
        const created = await request(app).post("/api/documents").send({});
        const elements = [
            {
                id: "e1",
                type: "rectangle",
                x: 10,
                y: 20,
                width: 100,
                height: 50,
            },
        ];
        const res = await request(app)
            .put(`/api/documents/${created.body.id}`)
            .send({ elements });
        expect(res.status).toBe(200);
        expect(res.body.versionId).toBeDefined();

        const doc = await request(app).get(
            `/api/documents/${created.body.id}`
        );
        expect(doc.body.versions).toHaveLength(2);
        expect(doc.body.versions[1].elements).toEqual(elements);
    });

    it("caps versions at 10", async () => {
        const created = await request(app).post("/api/documents").send({});
        for (let i = 0; i < 12; i++) {
            await request(app)
                .put(`/api/documents/${created.body.id}`)
                .send({ elements: [{ id: `e${i}`, type: "rectangle", x: i, y: i, width: 50, height: 50 }] });
        }
        const doc = await request(app).get(
            `/api/documents/${created.body.id}`
        );
        expect(doc.body.versions).toHaveLength(10);
    });

    it("returns 404 for unknown id", async () => {
        const res = await request(app)
            .put("/api/documents/nonexistent")
            .send({ elements: [] });
        expect(res.status).toBe(404);
    });
});

describe("GET /api/documents/:id/versions/:versionId", () => {
    it("returns a specific version by id", async () => {
        const created = await request(app).post("/api/documents").send({});
        const docId = created.body.id;
        const v1Id = created.body.versions[0].versionId;

        await request(app)
            .put(`/api/documents/${docId}`)
            .send({ elements: [{ id: "e1", type: "rectangle", x: 0, y: 0, width: 50, height: 50 }] });

        const res = await request(app).get(`/api/documents/${docId}/versions/${v1Id}`);
        expect(res.status).toBe(200);
        expect(res.body.versionId).toBe(v1Id);
        expect(res.body.elements).toEqual([]);
    });

    it("returns 404 for unknown document", async () => {
        const res = await request(app).get("/api/documents/nonexistent/versions/v1");
        expect(res.status).toBe(404);
    });

    it("returns 404 for unknown version", async () => {
        const created = await request(app).post("/api/documents").send({});
        const res = await request(app).get(`/api/documents/${created.body.id}/versions/nonexistent`);
        expect(res.status).toBe(404);
    });
});

describe("PUT /api/documents/:id (afterVersionId truncation)", () => {
    it("truncates versions after afterVersionId before appending", async () => {
        const created = await request(app).post("/api/documents").send({});
        const docId = created.body.id;

        const r1 = await request(app).put(`/api/documents/${docId}`).send({ elements: [{ id: "e1", type: "rectangle", x: 1, y: 1, width: 50, height: 50 }] });
        const r2 = await request(app).put(`/api/documents/${docId}`).send({ elements: [{ id: "e2", type: "circle", x: 2, y: 2, width: 80, height: 80 }] });

        const afterId = r1.body.versionId;
        const res = await request(app)
            .put(`/api/documents/${docId}`)
            .send({
                elements: [{ id: "e3", type: "text", x: 3, y: 3, width: 200, height: 40, content: "new" }],
                afterVersionId: afterId,
            });
        expect(res.status).toBe(200);

        const doc = await request(app).get(`/api/documents/${docId}`);
        expect(doc.body.versions).toHaveLength(3);
        expect(doc.body.versions[1].versionId).toBe(afterId);
        expect(doc.body.versions[2].versionId).toBe(res.body.versionId);
        const removedIds = doc.body.versions.map((v: { versionId: string }) => v.versionId);
        expect(removedIds).not.toContain(r2.body.versionId);
    });

    it("works normally without afterVersionId (backward compatible)", async () => {
        const created = await request(app).post("/api/documents").send({});
        const docId = created.body.id;

        await request(app).put(`/api/documents/${docId}`).send({ elements: [] });
        await request(app).put(`/api/documents/${docId}`).send({ elements: [] });

        const doc = await request(app).get(`/api/documents/${docId}`);
        expect(doc.body.versions).toHaveLength(3);
    });

    it("ignores afterVersionId that does not exist", async () => {
        const created = await request(app).post("/api/documents").send({});
        const docId = created.body.id;

        await request(app).put(`/api/documents/${docId}`).send({ elements: [] });

        const res = await request(app)
            .put(`/api/documents/${docId}`)
            .send({ elements: [], afterVersionId: "nonexistent" });
        expect(res.status).toBe(200);

        const doc = await request(app).get(`/api/documents/${docId}`);
        expect(doc.body.versions).toHaveLength(3);
    });
});

describe("PATCH /api/documents/:id (rename)", () => {
    it("renames a document", async () => {
        const created = await request(app).post("/api/documents").send({});
        const res = await request(app)
            .patch(`/api/documents/${created.body.id}`)
            .send({ name: "New Name" });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("New Name");
    });

    it("rejects empty name", async () => {
        const created = await request(app).post("/api/documents").send({});
        const res = await request(app)
            .patch(`/api/documents/${created.body.id}`)
            .send({ name: "   " });
        expect(res.status).toBe(400);
    });

    it("rejects duplicate name with 409", async () => {
        await request(app)
            .post("/api/documents")
            .send({ name: "Taken" });
        const second = await request(app).post("/api/documents").send({});
        const res = await request(app)
            .patch(`/api/documents/${second.body.id}`)
            .send({ name: "Taken" });
        expect(res.status).toBe(409);
    });

    it("allows renaming to the same name (no-op)", async () => {
        const created = await request(app)
            .post("/api/documents")
            .send({ name: "Keep" });
        const res = await request(app)
            .patch(`/api/documents/${created.body.id}`)
            .send({ name: "Keep" });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Keep");
    });

    it("returns 404 for unknown id", async () => {
        const res = await request(app)
            .patch("/api/documents/nonexistent")
            .send({ name: "X" });
        expect(res.status).toBe(404);
    });
});

describe("DELETE /api/documents/:id", () => {
    it("deletes a document", async () => {
        const created = await request(app).post("/api/documents").send({});
        const res = await request(app).delete(
            `/api/documents/${created.body.id}`
        );
        expect(res.status).toBe(204);

        const get = await request(app).get(
            `/api/documents/${created.body.id}`
        );
        expect(get.status).toBe(404);
    });

    it("returns 404 for unknown id", async () => {
        const res = await request(app).delete("/api/documents/nonexistent");
        expect(res.status).toBe(404);
    });
});
