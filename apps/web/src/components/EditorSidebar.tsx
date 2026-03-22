import React from "react";
import type { CanvasElementKind } from "@starter/shared";
import { useCanvasStore } from "../store/canvasStore";
import "./EditorSidebar.css";

const ELEMENTS: { kind: CanvasElementKind; label: string }[] = [
    { kind: "circle", label: "Circle" },
    { kind: "square", label: "Square" },
    { kind: "text", label: "Text" },
];

const DATA_KIND = "application/x-canvas-element-kind";

function handleDragStart(e: React.DragEvent, kind: CanvasElementKind) {
    e.dataTransfer.setData(DATA_KIND, kind);
    e.dataTransfer.effectAllowed = "copy";
}

export const EditorSidebar: React.FC = () => {
    const addElement = useCanvasStore((state) => state.addElement);

    const handleClick = (kind: CanvasElementKind) => {
        addElement(kind, 200, 200);
    };

    return (
        <aside className="editor-sidebar" data-testid="editor-sidebar">
            <h2 className="editor-sidebar-title">Elements</h2>
            <ul className="editor-sidebar-list">
                {ELEMENTS.map(({ kind, label }) => (
                    <li key={kind} className="editor-sidebar-item">
                        <button
                            type="button"
                            className="editor-sidebar-element"
                            draggable
                            onDragStart={(e) => handleDragStart(e, kind)}
                            onClick={() => handleClick(kind)}
                            data-element-kind={kind}
                            data-testid={`sidebar-${kind}`}
                        >
                            {kind === "circle" && (
                                <span className="editor-sidebar-preview editor-sidebar-preview--circle" aria-hidden />
                            )}
                            {kind === "square" && (
                                <span className="editor-sidebar-preview editor-sidebar-preview--square" aria-hidden />
                            )}
                            {kind === "text" && (
                                <span className="editor-sidebar-preview editor-sidebar-preview--text">Aa</span>
                            )}
                            <span className="editor-sidebar-label">{label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
};

export const CANVAS_ELEMENT_DATA_KIND = DATA_KIND;
