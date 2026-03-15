import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./index";
import { randomUUID } from "node:crypto";

describe("Express REST API", () => {
    it("should return ok for GET /api/health", async () => {
        const response = await request(app).get("/api/health");
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });

    it("returns 404 for an unknown document", async () => {
        const response = await request(app).get(`/api/documents/${randomUUID()}`);
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: "Document not found" });
    });

    it("creates and retrieves document versions", async () => {
        const documentId = randomUUID();

        const saveResponse = await request(app)
            .post(`/api/documents/${documentId}/versions`)
            .send({
                snapshot: {
                    elements: [
                        {
                            id: "el-1",
                            type: "rectangle",
                            x: 16,
                            y: 24,
                            width: 160,
                            height: 96,
                        },
                    ],
                },
            });

        expect(saveResponse.status).toBe(201);
        expect(saveResponse.body.document.documentId).toBe(documentId);
        expect(saveResponse.body.document.latestVersion).toBe(1);
        expect(saveResponse.body.document.versions).toHaveLength(1);

        const getResponse = await request(app).get(`/api/documents/${documentId}`);
        expect(getResponse.status).toBe(200);
        expect(getResponse.body.document.documentId).toBe(documentId);
        expect(getResponse.body.document.latestVersion).toBe(1);
        expect(getResponse.body.document.versions[0].snapshot.elements[0]).toMatchObject({
            type: "rectangle",
            x: 16,
            y: 24,
        });
    });

    it("retains only the latest 10 versions", async () => {
        const documentId = randomUUID();

        for (let version = 1; version <= 11; version += 1) {
            const response = await request(app)
                .post(`/api/documents/${documentId}/versions`)
                .send({
                    snapshot: {
                        elements: [
                            {
                                id: `el-${version}`,
                                type: "text",
                                x: version,
                                y: version,
                                width: 220,
                                height: 44,
                                text: `v${version}`,
                            },
                        ],
                    },
                });

            expect(response.status).toBe(201);
        }

        const getResponse = await request(app).get(`/api/documents/${documentId}`);
        expect(getResponse.status).toBe(200);
        expect(getResponse.body.document.latestVersion).toBe(11);
        expect(getResponse.body.document.versions).toHaveLength(10);
        expect(getResponse.body.document.versions[0].version).toBe(2);
        expect(getResponse.body.document.versions[9].version).toBe(11);
    });
});
