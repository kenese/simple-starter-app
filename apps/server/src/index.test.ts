import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, getDocuments, getElementLocks } from "./index";

describe("Express REST API", () => {
  beforeEach(() => {
    getDocuments().clear();
    getElementLocks().clear();
  });

  it("should return ok for GET /api/health", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  describe("Documents API", () => {
    it("GET /api/documents returns empty list initially", async () => {
      const res = await request(app).get("/api/documents");
      expect(res.status).toBe(200);
      expect(res.body.documents).toEqual([]);
    });

    it("GET /api/documents/:id creates a new empty doc if not found", async () => {
      const res = await request(app).get("/api/documents/doc-1");
      expect(res.status).toBe(200);
      expect(res.body.document).toMatchObject({
        id: "doc-1",
        name: "Untitled",
        elements: [],
        version: 0,
      });
    });

    it("POST /api/documents/:id saves elements and increments version", async () => {
      await request(app).get("/api/documents/doc-1");

      const res = await request(app)
        .post("/api/documents/doc-1")
        .send({
          elements: [
            {
              id: "e1",
              type: "rect",
              x: 10,
              y: 20,
              width: 100,
              height: 80,
              rotation: 0,
              fill: "#6366f1",
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.document.version).toBe(1);
      expect(res.body.document.elements).toHaveLength(1);
    });

    it("POST increments version each time", async () => {
      await request(app).get("/api/documents/doc-2");

      await request(app)
        .post("/api/documents/doc-2")
        .send({ elements: [] });
      const res = await request(app)
        .post("/api/documents/doc-2")
        .send({ elements: [] });

      expect(res.body.document.version).toBe(2);
    });

    it("stores at most 10 previous versions", async () => {
      await request(app).get("/api/documents/doc-3");

      for (let i = 0; i < 12; i++) {
        await request(app)
          .post("/api/documents/doc-3")
          .send({ elements: [] });
      }

      const stored = getDocuments().get("doc-3");
      expect(stored!.history.length).toBeLessThanOrEqual(10);
    });

    it("GET /api/documents lists saved documents", async () => {
      await request(app)
        .post("/api/documents/doc-a")
        .send({ elements: [], name: "My Doc" });

      const res = await request(app).get("/api/documents");
      expect(res.body.documents).toHaveLength(1);
      expect(res.body.documents[0]).toMatchObject({
        id: "doc-a",
        name: "My Doc",
      });
    });

    it("auto-generates unique default names", async () => {
      const res1 = await request(app).get("/api/documents/doc-x");
      expect(res1.body.document.name).toBe("Untitled");

      const res2 = await request(app).get("/api/documents/doc-y");
      expect(res2.body.document.name).toBe("Untitled 2");

      const res3 = await request(app).get("/api/documents/doc-z");
      expect(res3.body.document.name).toBe("Untitled 3");
    });

    it("rejects duplicate names with 409", async () => {
      await request(app)
        .post("/api/documents/doc-a")
        .send({ elements: [], name: "Logo Design" });

      const res = await request(app)
        .post("/api/documents/doc-b")
        .send({ elements: [], name: "Logo Design" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Document name must be unique");
    });

    it("allows saving same name for the same document", async () => {
      await request(app)
        .post("/api/documents/doc-a")
        .send({ elements: [], name: "My Design" });

      const res = await request(app)
        .post("/api/documents/doc-a")
        .send({ elements: [], name: "My Design" });

      expect(res.status).toBe(200);
    });
  });
});
