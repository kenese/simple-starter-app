import React from "react";
import type { DesignElement } from "@starter/shared";

interface TextElementProps {
    element: DesignElement;
    isEditing: boolean;
    onStartEditing: (id: string) => void;
    onTextChange: (id: string, text: string) => void;
    onFocus: (id: string, currentValue: string) => void;
    onBlur: (id: string, currentValue: string) => void;
}

export const TextElement: React.FC<TextElementProps> = ({
    element,
    isEditing,
    onStartEditing,
    onTextChange,
    onFocus,
    onBlur,
}) => {
    if (isEditing) {
        return (
            <input
                className="canvas-text-input"
                value={element.text ?? ""}
                autoFocus
                onChange={(event) => onTextChange(element.id, event.target.value)}
                onFocus={(event) => onFocus(element.id, event.target.value)}
                onBlur={(event) => onBlur(element.id, event.target.value)}
            />
        );
    }

    return (
        <div
            className="canvas-text-preview"
            onDoubleClick={() => onStartEditing(element.id)}
        >
            {element.text ?? ""}
        </div>
    );
};
