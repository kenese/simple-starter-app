import React from "react";
import type { DesignElement } from "@starter/shared";
import { useAppStore } from "../store/appStore";
import { RectangleElement } from "./RectangleElement";
import { CircleElement } from "./CircleElement";
import { TextElement } from "./TextElement";

const RESIZE_CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

export type ResizeCorner = (typeof RESIZE_CORNERS)[number];

interface CanvasElementProps {
    elementId: string;
    isMoving: boolean;
    isEditingText: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>, element: DesignElement) => void;
    onResizePointerDown: (
        event: React.PointerEvent<HTMLButtonElement>,
        element: DesignElement,
        corner: ResizeCorner
    ) => void;
    onStartEditing: (id: string) => void;
    onTextChange: (id: string, text: string) => void;
    onTextFocus: (id: string, value: string) => void;
    onTextBlur: (id: string, value: string) => void;
}

export const CanvasElement = React.memo<CanvasElementProps>(function CanvasElement({
    elementId,
    isMoving,
    isEditingText,
    onPointerDown,
    onResizePointerDown,
    onStartEditing,
    onTextChange,
    onTextFocus,
    onTextBlur,
}) {
    const element = useAppStore((state) => state.elementsById[elementId]);
    if (!element) {
        return null;
    }

    return (
        <div
            role="group"
            aria-label={`${element.type} element`}
            aria-grabbed={isMoving}
            tabIndex={0}
            className={`canvas-element canvas-element--${element.type}`}
            onPointerDown={(event) => onPointerDown(event, element)}
            style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                cursor: isMoving ? "grabbing" : "grab",
            }}
        >
            {element.type === "rectangle" && <RectangleElement />}
            {element.type === "circle" && <CircleElement />}
            {element.type === "text" && (
                <TextElement
                    element={element}
                    isEditing={isEditingText}
                    onStartEditing={onStartEditing}
                    onTextChange={onTextChange}
                    onFocus={onTextFocus}
                    onBlur={onTextBlur}
                />
            )}
            {RESIZE_CORNERS.map((corner) => (
                <button
                    key={corner}
                    type="button"
                    className={`canvas-resize-handle canvas-resize-handle--${corner}`}
                    aria-label={`Resize ${element.type} element from ${corner}`}
                    onPointerDown={(event) => onResizePointerDown(event, element, corner)}
                />
            ))}
        </div>
    );
});
