import React from "react";

interface EditorCanvasProps {
    canvasRef: React.RefObject<HTMLDivElement | null>;
    isLoading: boolean;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    children: React.ReactNode;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    canvasRef,
    isLoading,
    onDragOver,
    onDrop,
    children,
}) => (
    <section className="editor-canvas-shell">
        <div
            ref={canvasRef}
            className="editor-canvas"
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {isLoading ? <div className="editor-loading-label">Loading document...</div> : null}
            {children}
        </div>
    </section>
);
