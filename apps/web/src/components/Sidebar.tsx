import React from "react";
import type { CanvasElementType } from "@starter/shared";

const TOOL_ITEMS: Array<{ type: CanvasElementType; label: string }> = [
    { type: "rectangle", label: "Rectangle" },
    { type: "circle", label: "Circle" },
    { type: "text", label: "Text Input" },
];

const DATA_TRANSFER_KEY = "application/x-canvas-tool";

interface SidebarProps {
    onSave: () => void;
    onAddElement: (type: CanvasElementType) => void;
    isSaving: boolean;
    isLoading: boolean;
    saveMessage: string | null;
    errorMessage: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
    onSave,
    onAddElement,
    isSaving,
    isLoading,
    saveMessage,
    errorMessage,
}) => (
    <aside className="editor-sidebar">
        <div className="editor-sidebar-title">Elements</div>
        <button
            type="button"
            className="editor-save-button"
            onClick={onSave}
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
                onClick={() => onAddElement(item.type)}
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
);
