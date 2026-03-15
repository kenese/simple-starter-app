import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasElementType, DesignElement } from "@starter/shared";
import { getDocument, saveDocumentVersion } from "../api/documents";
import { useAppStore } from "../store/appStore";
import "./Editor.css";

const TOOL_ITEMS: Array<{ type: CanvasElementType; label: string }> = [
    { type: "rectangle", label: "Rectangle" },
    { type: "circle", label: "Circle" },
    { type: "text", label: "Text Input" },
];

const DATA_TRANSFER_KEY = "application/x-canvas-tool";
const MIN_ELEMENT_WIDTH = 40;
const MIN_ELEMENT_HEIGHT = 24;
const RESIZE_CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

type InteractionMode = "move" | "resize";
type ResizeCorner = (typeof RESIZE_CORNERS)[number];

interface ActiveInteraction {
    id: string;
    mode: InteractionMode;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    resizeCorner?: ResizeCorner;
}

interface EditorProps {
    documentId: string;
}

export const Editor: React.FC<EditorProps> = ({ documentId }) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const textEditStartValuesRef = useRef<Record<string, string>>({});
    const elements = useAppStore((state) => state.elements);
    const addElement = useAppStore((state) => state.addElement);
    const updateTextElement = useAppStore((state) => state.updateTextElement);
    const updateElementFrame = useAppStore((state) => state.updateElementFrame);
    const setElements = useAppStore((state) => state.setElements);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
    const [editingTextElementId, setEditingTextElementId] = useState<string | null>(null);

    const enqueueSave = useCallback(
        (elementsToSave: DesignElement[]) => {
            saveQueueRef.current = saveQueueRef.current.then(async () => {
                setIsSaving(true);
                setErrorMessage(null);

                try {
                    const document = await saveDocumentVersion(documentId, elementsToSave);
                    setSaveMessage(
                        `Saved version ${document.latestVersion} (${document.versions.length}/10 retained)`
                    );
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to save document";
                    setErrorMessage(message);
                } finally {
                    setIsSaving(false);
                }
            });
        },
        [documentId]
    );

    useEffect(() => {
        let cancelled = false;
        saveQueueRef.current = Promise.resolve();
        textEditStartValuesRef.current = {};
        setEditingTextElementId(null);

        const loadDocument = async () => {
            setIsLoading(true);
            setErrorMessage(null);
            setSaveMessage(null);

            try {
                const document = await getDocument(documentId);
                if (cancelled) return;

                if (!document) {
                    setElements([]);
                    setSaveMessage("New document");
                    return;
                }

                const latestSnapshot = document.versions.at(-1)?.snapshot;
                setElements(latestSnapshot?.elements ?? []);
                setSaveMessage(`Loaded version ${document.latestVersion}`);
            } catch (error) {
                if (!cancelled) {
                    const message =
                        error instanceof Error ? error.message : "Failed to load document";
                    setErrorMessage(message);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadDocument();

        return () => {
            cancelled = true;
        };
    }, [documentId, setElements]);

    const handleSave = () => {
        enqueueSave(useAppStore.getState().elements);
    };

    const createFromDrop = (event: React.DragEvent<HTMLDivElement>) => {
        const type = event.dataTransfer.getData(DATA_TRANSFER_KEY) as CanvasElementType;
        if (!type || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = Number.isFinite(event.clientX) ? event.clientX : rect.left + 80;
        const clientY = Number.isFinite(event.clientY) ? event.clientY : rect.top + 28;
        const x = Math.max(8, clientX - rect.left - 80);
        const y = Math.max(8, clientY - rect.top - 28);
        addElement(type, { x, y });
    };

    useEffect(() => {
        if (!activeInteraction) return;

        const handlePointerMove = (event: PointerEvent) => {
            if (!canvasRef.current) return;

            const canvasWidth = canvasRef.current.clientWidth;
            const canvasHeight = canvasRef.current.clientHeight;
            const deltaX = event.clientX - activeInteraction.startPointerX;
            const deltaY = event.clientY - activeInteraction.startPointerY;

            if (activeInteraction.mode === "move") {
                const nextX = Math.max(
                    0,
                    Math.min(
                        activeInteraction.startX + deltaX,
                        Math.max(0, canvasWidth - activeInteraction.startWidth)
                    )
                );
                const nextY = Math.max(
                    0,
                    Math.min(
                        activeInteraction.startY + deltaY,
                        Math.max(0, canvasHeight - activeInteraction.startHeight)
                    )
                );

                updateElementFrame(activeInteraction.id, { x: nextX, y: nextY });
                return;
            }

            const corner = activeInteraction.resizeCorner ?? "bottom-right";
            let nextX = activeInteraction.startX;
            let nextY = activeInteraction.startY;
            let nextWidth = activeInteraction.startWidth;
            let nextHeight = activeInteraction.startHeight;

            if (corner === "top-left" || corner === "bottom-left") {
                const maxLeft = activeInteraction.startX + activeInteraction.startWidth - MIN_ELEMENT_WIDTH;
                nextX = Math.max(0, Math.min(activeInteraction.startX + deltaX, maxLeft));
                nextWidth = activeInteraction.startX + activeInteraction.startWidth - nextX;
            } else {
                nextWidth = Math.max(
                    MIN_ELEMENT_WIDTH,
                    Math.min(activeInteraction.startWidth + deltaX, canvasWidth - activeInteraction.startX)
                );
            }

            if (corner === "top-left" || corner === "top-right") {
                const maxTop = activeInteraction.startY + activeInteraction.startHeight - MIN_ELEMENT_HEIGHT;
                nextY = Math.max(0, Math.min(activeInteraction.startY + deltaY, maxTop));
                nextHeight = activeInteraction.startY + activeInteraction.startHeight - nextY;
            } else {
                nextHeight = Math.max(
                    MIN_ELEMENT_HEIGHT,
                    Math.min(activeInteraction.startHeight + deltaY, canvasHeight - activeInteraction.startY)
                );
            }

            updateElementFrame(activeInteraction.id, {
                x: nextX,
                y: nextY,
                width: nextWidth,
                height: nextHeight,
            });
        };

        const handlePointerUp = () => {
            const latestElements = useAppStore.getState().elements;
            const updatedElement = latestElements.find((element) => element.id === activeInteraction.id);
            const changed =
                !!updatedElement &&
                (updatedElement.x !== activeInteraction.startX ||
                    updatedElement.y !== activeInteraction.startY ||
                    updatedElement.width !== activeInteraction.startWidth ||
                    updatedElement.height !== activeInteraction.startHeight);

            if (changed) {
                enqueueSave(latestElements);
            }

            setActiveInteraction(null);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [activeInteraction, enqueueSave, updateElementFrame]);

    const beginMoveInteraction = (
        event: React.PointerEvent<HTMLDivElement>,
        element: DesignElement
    ) => {
        if (event.button !== 0) return;

        if ((event.target as HTMLElement).closest(".canvas-text-input")) {
            return;
        }

        event.preventDefault();
        setActiveInteraction({
            id: element.id,
            mode: "move",
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: element.x,
            startY: element.y,
            startWidth: element.width,
            startHeight: element.height,
        });
    };

    const beginResizeInteraction = (
        event: React.PointerEvent<HTMLButtonElement>,
        element: DesignElement,
        resizeCorner: ResizeCorner
    ) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();
        setActiveInteraction({
            id: element.id,
            mode: "resize",
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: element.x,
            startY: element.y,
            startWidth: element.width,
            startHeight: element.height,
            resizeCorner,
        });
    };

    return (
        <div className="editor">
            <aside className="editor-sidebar">
                <div className="editor-sidebar-title">Elements</div>
                <button
                    type="button"
                    className="editor-save-button"
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                >
                    {isSaving ? "Saving..." : "Save design"}
                </button>
                <div className="editor-status-text">{saveMessage ?? "Not saved yet"}</div>
                {errorMessage ? <div className="editor-error-text">{errorMessage}</div> : null}
                {TOOL_ITEMS.map((item) => (
                    <button
                        key={item.type}
                        type="button"
                        className="editor-tool"
                        draggable
                        onClick={() => addElement(item.type)}
                        disabled={isLoading}
                        onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "copy";
                            event.dataTransfer.setData(DATA_TRANSFER_KEY, item.type);
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </aside>

            <section className="editor-canvas-shell">
                <div
                    ref={canvasRef}
                    className="editor-canvas"
                    onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        createFromDrop(event);
                    }}
                >
                    {isLoading ? <div className="editor-loading-label">Loading document...</div> : null}
                    {elements.map((element) => (
                        <div
                            key={element.id}
                            className={`canvas-element canvas-element--${element.type}`}
                            onPointerDown={(event) => beginMoveInteraction(event, element)}
                            style={{
                                left: element.x,
                                top: element.y,
                                width: element.width,
                                height: element.height,
                                cursor:
                                    activeInteraction?.id === element.id &&
                                    activeInteraction.mode === "move"
                                        ? "grabbing"
                                        : "grab",
                            }}
                        >
                            {element.type === "text" ? (
                                editingTextElementId === element.id ? (
                                    <input
                                        className="canvas-text-input"
                                        value={element.text ?? ""}
                                        autoFocus
                                        onChange={(event) =>
                                            updateTextElement(element.id, event.target.value)
                                        }
                                        onFocus={(event) => {
                                            textEditStartValuesRef.current[element.id] = event.target.value;
                                        }}
                                        onBlur={(event) => {
                                            const startingText = textEditStartValuesRef.current[element.id];
                                            delete textEditStartValuesRef.current[element.id];
                                            setEditingTextElementId(null);
                                            if (startingText === event.target.value) return;

                                            enqueueSave(useAppStore.getState().elements);
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="canvas-text-preview"
                                        onDoubleClick={() => {
                                            setEditingTextElementId(element.id);
                                        }}
                                    >
                                        {element.text ?? ""}
                                    </div>
                                )
                            ) : null}
                            {RESIZE_CORNERS.map((corner) => (
                                <button
                                    key={corner}
                                    type="button"
                                    className={`canvas-resize-handle canvas-resize-handle--${corner}`}
                                    aria-label={`Resize ${element.type} element from ${corner}`}
                                    onPointerDown={(event) =>
                                        beginResizeInteraction(event, element, corner)
                                    }
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};
