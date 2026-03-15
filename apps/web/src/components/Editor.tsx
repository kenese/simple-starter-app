import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasElementType, DesignElement } from "@starter/shared";
import { getDocument, saveDocumentVersion } from "../api/documents";
import { getOrderedElements, useAppStore } from "../store/appStore";
import { Sidebar } from "./Sidebar";
import { EditorCanvas } from "./EditorCanvas";
import { CanvasElement, type ResizeCorner } from "./CanvasElement";
import "./Editor.css";

const DATA_TRANSFER_KEY = "application/x-canvas-tool";
const MIN_ELEMENT_WIDTH = 40;
const MIN_ELEMENT_HEIGHT = 24;

type InteractionMode = "move" | "resize";

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
    const activeElementNodeRef = useRef<HTMLDivElement | null>(null);
    const movePreviewPositionRef = useRef<{ x: number; y: number } | null>(null);
    const resizePreviewFrameRef = useRef<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const pendingPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
    const interactionSnapshotRef = useRef<ActiveInteraction | null>(null);
    const elementIds = useAppStore((state) => state.elementIds);
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
    const getElementsSnapshot = useCallback(() => {
        const state = useAppStore.getState();
        return getOrderedElements(state.elementIds, state.elementsById);
    }, []);

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
        enqueueSave(getElementsSnapshot());
    };

    const handleAddElement = (type: CanvasElementType) => {
        addElement(type);
    };

    const handleCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };

    const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
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

        interactionSnapshotRef.current = activeInteraction;

        const applyPendingToDOM = () => {
            const interaction = interactionSnapshotRef.current;
            const pending = pendingPointerRef.current;
            const canvas = canvasRef.current;
            const activeNode = activeElementNodeRef.current;
            if (!interaction || !pending || !canvas || !activeNode) return;

            const canvasWidth = canvas.clientWidth;
            const canvasHeight = canvas.clientHeight;
            const deltaX = pending.clientX - interaction.startPointerX;
            const deltaY = pending.clientY - interaction.startPointerY;

            if (interaction.mode === "move") {
                const nextX = Math.max(
                    0,
                    Math.min(
                        interaction.startX + deltaX,
                        Math.max(0, canvasWidth - interaction.startWidth)
                    )
                );
                const nextY = Math.max(
                    0,
                    Math.min(
                        interaction.startY + deltaY,
                        Math.max(0, canvasHeight - interaction.startHeight)
                    )
                );

                movePreviewPositionRef.current = { x: nextX, y: nextY };
                activeNode.style.willChange = "transform";
                activeNode.style.transform = `translate(${nextX - interaction.startX}px, ${nextY - interaction.startY}px)`;
            } else {
                const corner = interaction.resizeCorner ?? "bottom-right";
                let nextX = interaction.startX;
                let nextY = interaction.startY;
                let nextWidth = interaction.startWidth;
                let nextHeight = interaction.startHeight;

                if (corner === "top-left" || corner === "bottom-left") {
                    const maxLeft = interaction.startX + interaction.startWidth - MIN_ELEMENT_WIDTH;
                    nextX = Math.max(0, Math.min(interaction.startX + deltaX, maxLeft));
                    nextWidth = interaction.startX + interaction.startWidth - nextX;
                } else {
                    nextWidth = Math.max(
                        MIN_ELEMENT_WIDTH,
                        Math.min(interaction.startWidth + deltaX, canvasWidth - interaction.startX)
                    );
                }

                if (corner === "top-left" || corner === "top-right") {
                    const maxTop = interaction.startY + interaction.startHeight - MIN_ELEMENT_HEIGHT;
                    nextY = Math.max(0, Math.min(interaction.startY + deltaY, maxTop));
                    nextHeight = interaction.startY + interaction.startHeight - nextY;
                } else {
                    nextHeight = Math.max(
                        MIN_ELEMENT_HEIGHT,
                        Math.min(interaction.startHeight + deltaY, canvasHeight - interaction.startY)
                    );
                }

                resizePreviewFrameRef.current = {
                    x: nextX,
                    y: nextY,
                    width: nextWidth,
                    height: nextHeight,
                };
                activeNode.style.willChange = "left, top, width, height";
                activeNode.style.left = `${nextX}px`;
                activeNode.style.top = `${nextY}px`;
                activeNode.style.width = `${nextWidth}px`;
                activeNode.style.height = `${nextHeight}px`;
            }
        };

        const applyPendingPointer = () => {
            if (rafIdRef.current === null) return;
            applyPendingToDOM();
            rafIdRef.current = null;
        };

        const handlePointerMove = (event: PointerEvent) => {
            pendingPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
            if (rafIdRef.current === null) {
                rafIdRef.current = requestAnimationFrame(applyPendingPointer);
            }
        };

        const handlePointerUp = () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            applyPendingToDOM();
            pendingPointerRef.current = null;
            interactionSnapshotRef.current = null;

            if (activeInteraction.mode === "move") {
                const activeNode = activeElementNodeRef.current;
                if (activeNode) {
                    activeNode.style.transform = "";
                    activeNode.style.willChange = "";
                }

                const finalPosition = movePreviewPositionRef.current;
                const changed =
                    !!finalPosition &&
                    (finalPosition.x !== activeInteraction.startX ||
                        finalPosition.y !== activeInteraction.startY);

                if (changed && finalPosition) {
                    updateElementFrame(activeInteraction.id, {
                        x: finalPosition.x,
                        y: finalPosition.y,
                    });
                    enqueueSave(getElementsSnapshot());
                }
            } else {
                const activeNode = activeElementNodeRef.current;
                if (activeNode) {
                    activeNode.style.willChange = "";
                }
                const finalFrame = resizePreviewFrameRef.current;
                const changed =
                    !!finalFrame &&
                    (finalFrame.x !== activeInteraction.startX ||
                        finalFrame.y !== activeInteraction.startY ||
                        finalFrame.width !== activeInteraction.startWidth ||
                        finalFrame.height !== activeInteraction.startHeight);

                if (changed && finalFrame) {
                    updateElementFrame(activeInteraction.id, finalFrame);
                    enqueueSave(getElementsSnapshot());
                }
            }

            movePreviewPositionRef.current = null;
            resizePreviewFrameRef.current = null;
            activeElementNodeRef.current = null;
            setActiveInteraction(null);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            pendingPointerRef.current = null;
            interactionSnapshotRef.current = null;
            const activeNode = activeElementNodeRef.current;
            if (activeInteraction.mode === "move") {
                if (activeNode) {
                    activeNode.style.transform = "";
                    activeNode.style.willChange = "";
                }
                movePreviewPositionRef.current = null;
            } else {
                if (activeNode) {
                    activeNode.style.willChange = "";
                }
                resizePreviewFrameRef.current = null;
            }
            activeElementNodeRef.current = null;
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [activeInteraction, enqueueSave, getElementsSnapshot, updateElementFrame]);

    const beginMoveInteraction = useCallback(
        (event: React.PointerEvent<HTMLDivElement>, element: DesignElement) => {
            if (event.button !== 0) return;

            if ((event.target as HTMLElement).closest(".canvas-text-input")) {
                return;
            }

            event.preventDefault();
            activeElementNodeRef.current = event.currentTarget;
            movePreviewPositionRef.current = { x: element.x, y: element.y };
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
        },
        []
    );

    const beginResizeInteraction = useCallback(
        (
            event: React.PointerEvent<HTMLButtonElement>,
            element: DesignElement,
            resizeCorner: ResizeCorner
        ) => {
            if (event.button !== 0) return;

            const node = event.currentTarget.closest(".canvas-element");
            if (!(node instanceof HTMLDivElement)) return;

            event.preventDefault();
            event.stopPropagation();
            activeElementNodeRef.current = node;
            resizePreviewFrameRef.current = {
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
            };
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
        },
        []
    );

    const handleTextFocus = useCallback((id: string, currentValue: string) => {
        textEditStartValuesRef.current[id] = currentValue;
    }, []);

    const handleTextBlur = useCallback(
        (id: string, currentValue: string) => {
            const startingText = textEditStartValuesRef.current[id];
            delete textEditStartValuesRef.current[id];
            setEditingTextElementId(null);
            if (startingText === currentValue) return;

            enqueueSave(getElementsSnapshot());
        },
        [enqueueSave, getElementsSnapshot]
    );

    return (
        <div className="editor">
            <Sidebar
                onSave={handleSave}
                onAddElement={handleAddElement}
                isSaving={isSaving}
                isLoading={isLoading}
                saveMessage={saveMessage}
                errorMessage={errorMessage}
            />

            <EditorCanvas
                canvasRef={canvasRef}
                isLoading={isLoading}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
            >
                {elementIds.map((id) => (
                    <CanvasElement
                        key={id}
                        elementId={id}
                        isMoving={activeInteraction?.id === id && activeInteraction.mode === "move"}
                        isEditingText={editingTextElementId === id}
                        onPointerDown={beginMoveInteraction}
                        onResizePointerDown={beginResizeInteraction}
                        onStartEditing={setEditingTextElementId}
                        onTextChange={updateTextElement}
                        onTextFocus={handleTextFocus}
                        onTextBlur={handleTextBlur}
                    />
                ))}
            </EditorCanvas>
        </div>
    );
};
