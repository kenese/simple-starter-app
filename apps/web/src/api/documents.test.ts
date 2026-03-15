import { afterEach, describe, expect, it, vi } from "vitest";
import { getDocument, saveDocumentVersion } from "./documents";

describe("documents api client", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns null for not-found document", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ message: "Document not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            })
        );

        const document = await getDocument("missing-doc");
        expect(document).toBeNull();
    });

    it("returns document payload on success", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(
                JSON.stringify({
                    document: {
                        documentId: "doc-1",
                        latestVersion: 2,
                        versions: [
                            {
                                version: 1,
                                savedAt: "2026-01-01T00:00:00.000Z",
                                snapshot: { elements: [] },
                            },
                            {
                                version: 2,
                                savedAt: "2026-01-01T00:00:01.000Z",
                                snapshot: { elements: [] },
                            },
                        ],
                    },
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            )
        );

        const document = await getDocument("doc-1");
        expect(document?.documentId).toBe("doc-1");
        expect(document?.latestVersion).toBe(2);
    });

    it("posts document snapshot and returns saved document", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(
                JSON.stringify({
                    document: {
                        documentId: "doc-2",
                        latestVersion: 1,
                        versions: [
                            {
                                version: 1,
                                savedAt: "2026-01-01T00:00:00.000Z",
                                snapshot: {
                                    elements: [
                                        {
                                            id: "el-1",
                                            type: "rectangle",
                                            x: 10,
                                            y: 10,
                                            width: 160,
                                            height: 96,
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                }),
                {
                    status: 201,
                    headers: { "Content-Type": "application/json" },
                }
            )
        );

        const result = await saveDocumentVersion("doc-2", [
            {
                id: "el-1",
                type: "rectangle",
                x: 10,
                y: 10,
                width: 160,
                height: 96,
            },
        ]);

        expect(result.latestVersion).toBe(1);
        expect(fetchSpy).toHaveBeenCalledWith(
            "/api/documents/doc-2/versions",
            expect.objectContaining({
                method: "POST",
            })
        );
    });
});
