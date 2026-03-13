import React, { useRef, useEffect, useCallback, useState } from "react";
import type { ElementType } from "@starter/shared";
import { useCanvasStore } from "../store/canvasStore";
import {
    renderStaticCanvas,
    hitTest,
} from "../utils/canvasRenderer";
import "./Canvas.css";

const MIN_SIZE = 20;
const MOVE_THRESHOLD = 3;
const RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

interface DragState {
    action: "move" | "resize";
    elementId: string;
    startPointerX: number;
    startPointerY: number;
    startElX: number;
    startElY: number;
    startElW: number;
    startElH: number;
    handle?: string;
    hasMoved: boolean;
}

export const Canvas: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const staticCanvasRef = useRef<HTMLCanvasElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [editingElementId, setEditingElementId] = useState<string | null>(
        null
    );

    const elements = useCanvasStore((s) => s.elements);
    const activeElementId = useCanvasStore((s) => s.activeElementId);
    const addElement = useCanvasStore((s) => s.addElement);
    const updateElement = useCanvasStore((s) => s.updateElement);
    const activateElement = useCanvasStore((s) => s.activateElement);
    const deleteElement = useCanvasStore((s) => s.deleteElement);
    const markDirty = useCanvasStore((s) => s.markDirty);
    const saveDocument = useCanvasStore((s) => s.saveDocument);

    const activeElement =
        elements.find((el) => el.id === activeElementId) ?? null;

    // ── Redraw helper (reads directly from store to avoid stale closures) ──

    const redrawCanvas = useCallback(() => {
        const canvas = staticCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const state = useCanvasStore.getState();
        renderStaticCanvas(ctx, canvas, state.elements, state.activeElementId);
    }, []);

    // ── Size the <canvas> to match container ──

    useEffect(() => {
        const container = containerRef.current;
        const canvas = staticCanvasRef.current;
        if (!container || !canvas) return;

        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            redrawCanvas();
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, [redrawCanvas]);

    // ── Redraw static canvas when elements or active element changes ──

    useEffect(() => {
        redrawCanvas();
    }, [elements, activeElementId, redrawCanvas]);

    // ── Drag / resize logic (shared by static-canvas hit and active-element click) ──

    const startDrag = useCallback(
        (
            clientX: number,
            clientY: number,
            elementId: string,
            action: "move" | "resize",
            handle?: string
        ) => {
            const el = useCanvasStore
                .getState()
                .elements.find((e) => e.id === elementId);
            if (!el) return;

            dragRef.current = {
                action,
                elementId,
                startPointerX: clientX,
                startPointerY: clientY,
                startElX: el.x,
                startElY: el.y,
                startElW: el.width,
                startElH: el.height,
                handle,
                hasMoved: false,
            };

            const onPointerMove = (ev: PointerEvent) => {
                const drag = dragRef.current;
                if (!drag) return;

                const dx = ev.clientX - drag.startPointerX;
                const dy = ev.clientY - drag.startPointerY;

                if (
                    !drag.hasMoved &&
                    Math.abs(dx) < MOVE_THRESHOLD &&
                    Math.abs(dy) < MOVE_THRESHOLD
                ) {
                    return;
                }
                drag.hasMoved = true;

                const cw = containerRef.current?.clientWidth ?? Infinity;
                const ch = containerRef.current?.clientHeight ?? Infinity;

                if (drag.action === "move") {
                    const newX = Math.max(
                        0,
                        Math.min(drag.startElX + dx, cw - drag.startElW)
                    );
                    const newY = Math.max(
                        0,
                        Math.min(drag.startElY + dy, ch - drag.startElH)
                    );
                    updateElement(drag.elementId, { x: newX, y: newY });
                    return;
                }

                let newX = drag.startElX;
                let newY = drag.startElY;
                let newW = drag.startElW;
                let newH = drag.startElH;
                const h = drag.handle!;

                if (h.includes("e"))
                    newW = Math.max(
                        MIN_SIZE,
                        Math.min(drag.startElW + dx, cw - drag.startElX)
                    );
                if (h.includes("s"))
                    newH = Math.max(
                        MIN_SIZE,
                        Math.min(drag.startElH + dy, ch - drag.startElY)
                    );

                if (h.includes("w")) {
                    newW = Math.max(MIN_SIZE, drag.startElW - dx);
                    newX =
                        newW > MIN_SIZE
                            ? Math.max(0, drag.startElX + dx)
                            : drag.startElX + drag.startElW - MIN_SIZE;
                    newW = Math.min(newW, drag.startElX + drag.startElW);
                }
                if (h.includes("n")) {
                    newH = Math.max(MIN_SIZE, drag.startElH - dy);
                    newY =
                        newH > MIN_SIZE
                            ? Math.max(0, drag.startElY + dy)
                            : drag.startElY + drag.startElH - MIN_SIZE;
                    newH = Math.min(newH, drag.startElY + drag.startElH);
                }

                updateElement(drag.elementId, {
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH,
                });
            };

            const container = containerRef.current;

            const cleanup = () => {
                const drag = dragRef.current;
                dragRef.current = null;
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerup", cleanup);
                document.documentElement.removeEventListener(
                    "pointerleave",
                    cleanup
                );
                container?.removeEventListener("pointerleave", cleanup);

                if (drag?.hasMoved) {
                    activateElement(null);
                    markDirty();
                    saveDocument();
                }
            };

            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", cleanup);
            document.documentElement.addEventListener("pointerleave", cleanup);
            container?.addEventListener("pointerleave", cleanup);
        },
        [updateElement, activateElement, markDirty, saveDocument]
    );

    // ── Hit-test on static canvas ──

    const handleStaticCanvasPointerDown = useCallback(
        (e: React.PointerEvent) => {
            const canvas = staticCanvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const state = useCanvasStore.getState();
            const hit = hitTest(state.elements, x, y, state.activeElementId);

            if (hit) {
                activateElement(hit.id);
                startDrag(e.clientX, e.clientY, hit.id, "move");
            } else {
                activateElement(null);
                setEditingElementId(null);
            }
        },
        [activateElement, startDrag]
    );

    // ── Active element pointer down (already in DOM layer) ──

    const handleActiveElementPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!activeElementId) return;
            e.stopPropagation();
            e.preventDefault();
            startDrag(e.clientX, e.clientY, activeElementId, "move");
        },
        [activeElementId, startDrag]
    );

    // ── Resize handle pointer down ──

    const handleResizePointerDown = useCallback(
        (e: React.PointerEvent, handle: string) => {
            if (!activeElementId) return;
            e.stopPropagation();
            e.preventDefault();
            startDrag(e.clientX, e.clientY, activeElementId, "resize", handle);
        },
        [activeElementId, startDrag]
    );

    // ── Text editing ──

    const commitTextEdit = useCallback(
        (elementId: string, value: string) => {
            updateElement(elementId, { content: value || "Text" });
            setEditingElementId(null);
            activateElement(null);
            markDirty();
            saveDocument();
        },
        [updateElement, activateElement, markDirty, saveDocument]
    );

    // ── Drop from sidebar ──

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const type = e.dataTransfer.getData("element-type") as ElementType;
            if (!type || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            addElement(type, e.clientX - rect.left, e.clientY - rect.top);
        },
        [addElement]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }, []);

    // ── Keyboard (Delete / Escape) ──

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (document.activeElement as HTMLElement)?.tagName;
            if (tag === "TEXTAREA" || tag === "INPUT") return;

            const state = useCanvasStore.getState();

            if (e.key === "Escape" && state.activeElementId) {
                e.preventDefault();
                setEditingElementId(null);
                activateElement(null);
                return;
            }

            if (
                (e.key === "Delete" || e.key === "Backspace") &&
                state.activeElementId
            ) {
                e.preventDefault();
                deleteElement(state.activeElementId);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [deleteElement, activateElement]);

    // ── Render ──

    const isEditing =
        activeElement?.type === "text" &&
        editingElementId === activeElement?.id;

    return (
        <div
            ref={containerRef}
            className="canvas-container"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            tabIndex={0}
        >
            <canvas
                ref={staticCanvasRef}
                className="static-canvas"
                onPointerDown={handleStaticCanvasPointerDown}
            />

            <div className="active-layer">
                {activeElement && (
                    <div
                        className={`canvas-element canvas-element--${activeElement.type} canvas-element--selected${isEditing ? " canvas-element--editing" : ""}`}
                        style={{
                            left: activeElement.x,
                            top: activeElement.y,
                            width: activeElement.width,
                            height: activeElement.height,
                            pointerEvents: "auto",
                        }}
                        onPointerDown={(e) => {
                            if (isEditing) {
                                e.stopPropagation();
                                return;
                            }
                            handleActiveElementPointerDown(e);
                        }}
                        onDoubleClick={() => {
                            if (activeElement.type === "text") {
                                setEditingElementId(activeElement.id);
                            }
                        }}
                    >
                        {activeElement.type === "text" &&
                            (isEditing ? (
                                <textarea
                                    className="canvas-element-textarea"
                                    defaultValue={activeElement.content}
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                    onBlur={(e) =>
                                        commitTextEdit(
                                            activeElement.id,
                                            e.target.value
                                        )
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setEditingElementId(null);
                                            activateElement(null);
                                        }
                                        if (
                                            e.key === "Enter" &&
                                            !e.shiftKey
                                        ) {
                                            e.preventDefault();
                                            commitTextEdit(
                                                activeElement.id,
                                                e.currentTarget.value
                                            );
                                        }
                                        e.stopPropagation();
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="canvas-element-text">
                                    {activeElement.content}
                                </span>
                            ))}

                        {RESIZE_HANDLES.map((handle) => (
                            <div
                                key={handle}
                                className={`resize-handle resize-handle--${handle}`}
                                onPointerDown={(e) =>
                                    handleResizePointerDown(e, handle)
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
