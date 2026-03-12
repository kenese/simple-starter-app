import React, { useRef, useEffect, useCallback } from "react";
import { Stage, Layer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCanvasStore } from "../store/appStore";
import { createShapeElement, type ShapeType } from "./Sidebar";
import { CanvasShape } from "./CanvasShape";
import { RemoteCursors } from "./RemoteCursors";
import "./DesignCanvas.css";

const CANVAS_BG = "#2a2a3e";

interface DesignCanvasProps {
  onLockElement?: (elementId: string) => void;
  onUnlockElement?: (elementId: string) => void;
  onCursorMove?: (x: number, y: number) => void;
}

export const DesignCanvas: React.FC<DesignCanvasProps> = ({
  onLockElement,
  onUnlockElement,
  onCursorMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { elements, selectedId, updateElement, setSelectedId, addElement } =
    useCanvasStore();
  const isLockedByOther = useCanvasStore((s) => s.isLockedByOther);
  const remoteCursors = useCanvasStore((s) => s.remoteCursors);
  const [stageSize, setStageSize] = React.useState({ width: 800, height: 600 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
    },
    [setSelectedId]
  );

  const handleDeselect = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      handleSelect(null);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const el = elements.find((el) => el.id === selectedId);
        if (el?.type === "text") return;
        if (isLockedByOther(selectedId)) return;
        useCanvasStore.getState().removeElement(selectedId);
        handleSelect(null);
      }
    },
    [selectedId, elements, isLockedByOther, handleSelect]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/shape-type")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onCursorMove) return;

    const handleNativeMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      onCursorMove(e.clientX - rect.left, e.clientY - rect.top);
    };

    container.addEventListener("mousemove", handleNativeMouseMove);
    return () =>
      container.removeEventListener("mousemove", handleNativeMouseMove);
  }, [onCursorMove]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const shapeType = e.dataTransfer.getData(
      "application/shape-type"
    ) as ShapeType;
    if (!shapeType || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    addElement(createShapeElement(shapeType, x, y));
  };

  return (
    <div
      className="design-canvas"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        style={{ background: CANVAS_BG }}
        onMouseDown={handleDeselect}
        onTouchStart={handleDeselect}
      >
        <Layer>
          {elements.map((el) => (
            <CanvasShape
              key={el.id}
              element={el}
              isSelected={el.id === selectedId}
              isLockedByOther={isLockedByOther(el.id)}
              onSelect={() => handleSelect(el.id)}
              onChange={(updates) => updateElement(el.id, updates)}
              onLock={() => onLockElement?.(el.id)}
              onUnlock={() => onUnlockElement?.(el.id)}
            />
          ))}
        </Layer>
      </Stage>
      <RemoteCursors cursors={remoteCursors} />
    </div>
  );
};
