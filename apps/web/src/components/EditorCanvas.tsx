import React, { useRef, useCallback, useState, useEffect } from "react";
import type { CanvasElementKind } from "@starter/shared";
import { useCanvasStore } from "../store/canvasStore";
import { CANVAS_ELEMENT_DATA_KIND } from "./EditorSidebar";
import "./EditorCanvas.css";

const MIN_SIZE = 20;

type ResizeHandle = "nw" | "ne" | "se" | "sw";

interface DragState {
    elementId: string;
    startCanvasX: number;
    startCanvasY: number;
    startElX: number;
    startElY: number;
}

interface ResizeState {
    elementId: string;
    handle: ResizeHandle;
    startCanvasX: number;
    startCanvasY: number;
    startElX: number;
    startElY: number;
    startWidth: number;
    startHeight: number;
}

function getCanvasCoords(
    canvasEl: HTMLDivElement | null,
    clientX: number,
    clientY: number
): { x: number; y: number } | null {
    if (!canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    return {
        x: clientX - rect.left,
        y: clientY - rect.top,
    };
}

export const EditorCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const {
        elementIds,
        selectedTool,
        selectedElementId,
        hydrated,
        addElement,
        setSelectedTool,
        setSelectedElement,
        updateElement,
    } = useCanvasStore();

    const dragStateRef = useRef<DragState | null>(null);
    const resizeStateRef = useRef<ResizeState | null>(null);

    const [editingElementId, setEditingElementId] = useState<string | null>(null);

    useEffect(() => {
        const onPointerMove = (e: PointerEvent) => {
            const coords = getCanvasCoords(canvasRef.current, e.clientX, e.clientY);
            if (!coords) return;

            const drag = dragStateRef.current;
            if (drag) {
                const dx = coords.x - drag.startCanvasX;
                const dy = coords.y - drag.startCanvasY;
                useCanvasStore.getState().updateElement(drag.elementId, {
                    x: drag.startElX + dx,
                    y: drag.startElY + dy,
                });
                return;
            }

            const resize = resizeStateRef.current;
            if (resize) {
                const { handle, startElX, startElY, startWidth, startHeight, startCanvasX, startCanvasY } =
                    resize;
                const dx = coords.x - startCanvasX;
                const dy = coords.y - startCanvasY;

                let newWidth = startWidth;
                let newHeight = startHeight;
                let newX = startElX;
                let newY = startElY;

                if (handle === "se") {
                    newWidth = Math.max(MIN_SIZE, startWidth + dx);
                    newHeight = Math.max(MIN_SIZE, startHeight + dy);
                    newX = startElX + (newWidth - startWidth) / 2;
                    newY = startElY + (newHeight - startHeight) / 2;
                } else if (handle === "sw") {
                    newWidth = Math.max(MIN_SIZE, startWidth - dx);
                    newHeight = Math.max(MIN_SIZE, startHeight + dy);
                    newX = startElX - (newWidth - startWidth) / 2;
                    newY = startElY + (newHeight - startHeight) / 2;
                } else if (handle === "ne") {
                    newWidth = Math.max(MIN_SIZE, startWidth + dx);
                    newHeight = Math.max(MIN_SIZE, startHeight - dy);
                    newX = startElX + (newWidth - startWidth) / 2;
                    newY = startElY - (newHeight - startHeight) / 2;
                } else {
                    newWidth = Math.max(MIN_SIZE, startWidth - dx);
                    newHeight = Math.max(MIN_SIZE, startHeight - dy);
                    newX = startElX - (newWidth - startWidth) / 2;
                    newY = startElY - (newHeight - startHeight) / 2;
                }

                useCanvasStore.getState().updateElement(resize.elementId, {
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight,
                });
            }
        };

        const onPointerUp = () => {
            dragStateRef.current = null;
            resizeStateRef.current = null;
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const kind = e.dataTransfer.getData(CANVAS_ELEMENT_DATA_KIND) as CanvasElementKind | "";
            if (kind !== "circle" && kind !== "square" && kind !== "text") return;
            const coords = getCanvasCoords(canvasRef.current, e.clientX, e.clientY);
            if (coords) addElement(kind, coords.x, coords.y);
        },
        [addElement]
    );

    const handleCanvasClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target !== canvasRef.current) return;
            setSelectedElement(null);
            setEditingElementId(null);
            if (!selectedTool) return;
            const coords = getCanvasCoords(canvasRef.current, e.clientX, e.clientY);
            if (coords) {
                addElement(selectedTool, coords.x, coords.y);
                setSelectedTool(null);
            }
        },
        [selectedTool, addElement, setSelectedTool, setSelectedElement]
    );

    const handleSelect = useCallback(
        (id: string, e: React.PointerEvent | React.MouseEvent) => {
            e.stopPropagation();
            setSelectedElement(id);
        },
        [setSelectedElement]
    );

    const handleMoveStart = useCallback(
        (id: string, e: React.PointerEvent) => {
            debugger;
            e.stopPropagation();
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            if (resizeStateRef.current || dragStateRef.current) return;
            const el = useCanvasStore.getState().elementsById[id];
            if (!el) return;
            const coords = getCanvasCoords(canvasRef.current, e.clientX, e.clientY);
            if (!coords) return;
            setSelectedElement(id);
            dragStateRef.current = {
                elementId: id,
                startCanvasX: coords.x,
                startCanvasY: coords.y,
                startElX: el.x,
                startElY: el.y,
            };
        },
        [setSelectedElement]
    );

    const handleResizeStart = useCallback(
        (id: string, handle: ResizeHandle, e: React.PointerEvent) => {
            e.stopPropagation();
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            if (resizeStateRef.current || dragStateRef.current) return;
            const el = useCanvasStore.getState().elementsById[id];
            if (!el) return;
            const coords = getCanvasCoords(canvasRef.current, e.clientX, e.clientY);
            if (!coords) return;
            const w = el.width ?? 80;
            const h = el.height ?? 80;
            resizeStateRef.current = {
                elementId: id,
                handle,
                startCanvasX: coords.x,
                startCanvasY: coords.y,
                startElX: el.x,
                startElY: el.y,
                startWidth: w,
                startHeight: h,
            };
        },
        []
    );

    const handleStartEditText = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingElementId(id);
    }, []);

    const handleCommitEditText = useCallback(
        (id: string, text: string) => {
            updateElement(id, { text: text || "Text" });
            setEditingElementId(null);
        },
        [updateElement]
    );

    if (!hydrated) {
        return (
            <div className="editor-canvas" data-testid="editor-canvas" role="application" aria-label="Loading canvas…" />
        );
    }

    return (
        <div
            ref={canvasRef}
            className="editor-canvas"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleCanvasClick}
            data-testid="editor-canvas"
            role="application"
            aria-label="Editor canvas. Drop or click to add elements."
        >
            {elementIds.map((id) => (
                <CanvasElementNode
                    key={id}
                    id={id}
                    canvasRef={canvasRef}
                    isSelected={selectedElementId === id}
                    isEditing={editingElementId === id}
                    onSelect={handleSelect}
                    onMoveStart={handleMoveStart}
                    onResizeStart={handleResizeStart}
                    onStartEditText={handleStartEditText}
                    onCommitEditText={handleCommitEditText}
                />
            ))}
        </div>
    );
};

interface CanvasElementNodeProps {
    id: string;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    isSelected: boolean;
    isEditing: boolean;
    onSelect: (id: string, e: React.PointerEvent | React.MouseEvent) => void;
    onMoveStart: (id: string, e: React.PointerEvent) => void;
    onResizeStart: (id: string, handle: ResizeHandle, e: React.PointerEvent) => void;
    onStartEditText: (id: string, e: React.MouseEvent) => void;
    onCommitEditText: (id: string, text: string) => void;
}

const RESIZE_HANDLES: ResizeHandle[] = ["nw", "ne", "se", "sw"];

const CanvasElementNode: React.FC<CanvasElementNodeProps> = ({
    id,
    canvasRef,
    isSelected,
    isEditing,
    onSelect,
    onMoveStart,
    onResizeStart,
    onStartEditText,
    onCommitEditText,
}) => {
    const element = useCanvasStore((state) => state.elementsById[id]);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    if (!element) return null;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.currentTarget.blur();
        }
    };

    const wrapperStyle: React.CSSProperties = {
        left: element.x,
        top: element.y,
        width: element.width ?? 80,
        height: element.height ?? 80,
    };

    const content =
        element.kind === "circle" ? (
            <div
                className="editor-canvas-element editor-canvas-element--circle"
                data-element-id={element.id}
                data-testid={`canvas-${element.kind}-${element.id}`}
            />
        ) : element.kind === "square" ? (
            <div
                className="editor-canvas-element editor-canvas-element--square"
                data-element-id={element.id}
                data-testid={`canvas-${element.kind}-${element.id}`}
            />
        ) : isEditing ? (
            <div className="editor-canvas-element editor-canvas-element--text editor-canvas-element--editing">
                <input
                    ref={inputRef}
                    type="text"
                    className="editor-canvas-text-input"
                    defaultValue={element.text ?? "Text"}
                    onBlur={(e) => onCommitEditText(id, e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`canvas-text-input-${element.id}`}
                />
            </div>
        ) : (
            <div
                className="editor-canvas-element editor-canvas-element--text"
                data-element-id={element.id}
                data-testid={`canvas-${element.kind}-${element.id}`}
                onDoubleClick={(e) => onStartEditText(id, e)}
            >
                {element.text ?? "Text"}
            </div>
        );

    return (
        <div
            className={`editor-canvas-element-wrapper ${isSelected ? "editor-canvas-element-wrapper--selected" : ""}`}
            style={wrapperStyle}
            data-kind={element.kind}
            onClick={(e) => onSelect(id, e)}
            onPointerDown={(e) => {
                if (element.kind === "text" && isEditing) return;
                const target = e.target as HTMLElement;
                if (target.closest(".editor-canvas-resize-handle")) return;
                onMoveStart(id, e);
            }}
            data-element-id={element.id}
        >
            {content}
            {isSelected && !isEditing && (
                <>
                    <div className="editor-canvas-selection-ring" aria-hidden />
                    {RESIZE_HANDLES.map((handle) => (
                        <div
                            key={handle}
                            className={`editor-canvas-resize-handle editor-canvas-resize-handle--${handle}`}
                            onPointerDown={(e) => onResizeStart(id, handle, e)}
                            data-handle={handle}
                            data-testid={`resize-handle-${handle}-${id}`}
                            aria-label={`Resize ${handle}`}
                        />
                    ))}
                </>
            )}
        </div>
    );
};
