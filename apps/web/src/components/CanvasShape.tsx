import React, { useRef, useLayoutEffect } from "react";
import { Rect, Ellipse, Text, Transformer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { CanvasElement } from "@starter/shared";
import { useThrottledCallback } from "../hooks/useThrottledCallback";

const LOCK_STROKE = "#f59e0b";
const LOCK_STROKE_WIDTH = 2;
const LOCK_DASH = [6, 4];
const THROTTLE_MS = 50;

interface ShapeProps {
  element: CanvasElement;
  isSelected: boolean;
  isLockedByOther: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onLock: () => void;
  onUnlock: () => void;
}

export const CanvasShape: React.FC<ShapeProps> = ({
  element,
  isSelected,
  isLockedByOther,
  onSelect,
  onChange,
  onLock,
  onUnlock,
}) => {
  const shapeRef = useRef<Konva.Shape>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const textRef = useRef<Konva.Text>(null);

  useLayoutEffect(() => {
    if (isSelected && trRef.current) {
      const node = element.type === "text" ? textRef.current : shapeRef.current;
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
      }
    }
  }, [isSelected, element.type]);

  const throttledOnChange = useThrottledCallback(
    onChange as (...args: unknown[]) => void,
    THROTTLE_MS
  ) as (updates: Partial<CanvasElement>) => void;

  const handleDragStart = () => {
    onLock();
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (element.type === "ellipse") {
      throttledOnChange({
        x: e.target.x() - element.width / 2,
        y: e.target.y() - element.height / 2,
      });
    } else {
      throttledOnChange({ x: e.target.x(), y: e.target.y() });
    }
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onChange({ x: e.target.x(), y: e.target.y() });
    onUnlock();
  };

  const handleTransformStart = () => {
    onLock();
  };

  const handleTransform = () => {
    const node = element.type === "text" ? textRef.current : shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    if (element.type === "ellipse") {
      throttledOnChange({
        x: node.x() - (node.width() * scaleX) / 2,
        y: node.y() - (node.height() * scaleY) / 2,
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    } else {
      throttledOnChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    }
  };

  const handleTransformEnd = () => {
    const node = element.type === "text" ? textRef.current : shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
    onUnlock();
  };

  const handleTextDblClick = () => {
    if (element.type !== "text" || !textRef.current || isLockedByOther) return;

    const textNode = textRef.current;
    const stage = textNode.getStage();
    if (!stage) return;

    const stageContainer = stage.container();
    const textPosition = textNode.absolutePosition();
    const areaPosition = {
      x: stageContainer.offsetLeft + textPosition.x,
      y: stageContainer.offsetTop + textPosition.y,
    };

    const textarea = document.createElement("textarea");
    stageContainer.parentElement?.appendChild(textarea);

    textarea.value = element.text;
    Object.assign(textarea.style, {
      position: "absolute",
      top: `${areaPosition.y}px`,
      left: `${areaPosition.x}px`,
      width: `${textNode.width() * textNode.scaleX()}px`,
      height: `${textNode.height() * textNode.scaleY() + 4}px`,
      fontSize: `${element.fontSize}px`,
      border: "none",
      padding: "0px",
      margin: "0px",
      overflow: "hidden",
      background: "none",
      outline: "none",
      resize: "none",
      lineHeight: String(textNode.lineHeight()),
      fontFamily: textNode.fontFamily(),
      color: element.fill,
      transformOrigin: "left top",
      transform: `rotate(${textNode.rotation()}deg)`,
      zIndex: "1000",
    });

    textarea.focus();
    textNode.hide();
    trRef.current?.hide();
    onLock();

    const removeTextarea = () => {
      textarea.remove();
      textNode.show();
      trRef.current?.show();
      trRef.current?.forceUpdate();
      onUnlock();
    };

    textarea.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        onChange({ text: textarea.value } as Partial<CanvasElement>);
        removeTextarea();
      }
      if (e.key === "Escape") {
        removeTextarea();
      }
    });

    textarea.addEventListener("blur", () => {
      onChange({ text: textarea.value } as Partial<CanvasElement>);
      removeTextarea();
    });
  };

  const handleSelect = () => {
    if (!isLockedByOther) {
      onSelect();
    }
  };

  const draggable = !isLockedByOther;

  const lockStrokeProps = isLockedByOther
    ? { stroke: LOCK_STROKE, strokeWidth: LOCK_STROKE_WIDTH, dash: LOCK_DASH }
    : {};

  const commonProps = {
    draggable,
    onClick: handleSelect,
    onTap: handleSelect,
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onTransformStart: handleTransformStart,
    onTransform: handleTransform,
    onTransformEnd: handleTransformEnd,
  };

  const renderShape = () => {
    switch (element.type) {
      case "rect":
        return (
          <Rect
            ref={shapeRef as React.RefObject<Konva.Rect>}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            fill={element.fill}
            rotation={element.rotation}
            {...lockStrokeProps}
            {...commonProps}
          />
        );
      case "ellipse":
        return (
          <Ellipse
            ref={shapeRef as React.RefObject<Konva.Ellipse>}
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            radiusX={element.width / 2}
            radiusY={element.height / 2}
            fill={element.fill}
            rotation={element.rotation}
            {...lockStrokeProps}
            {...commonProps}
            onDragEnd={(e: KonvaEventObject<DragEvent>) => {
              onChange({
                x: e.target.x() - element.width / 2,
                y: e.target.y() - element.height / 2,
              });
              onUnlock();
            }}
            onTransformEnd={() => {
              const node = shapeRef.current;
              if (!node) return;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              onChange({
                x: node.x() - (node.width() * scaleX) / 2,
                y: node.y() - (node.height() * scaleY) / 2,
                width: Math.max(5, node.width() * scaleX),
                height: Math.max(5, node.height() * scaleY),
                rotation: node.rotation(),
              });
              onUnlock();
            }}
            onTransform={() => {
              const node = shapeRef.current;
              if (!node) return;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              throttledOnChange({
                x: node.x() - (node.width() * scaleX) / 2,
                y: node.y() - (node.height() * scaleY) / 2,
                width: Math.max(5, node.width() * scaleX),
                height: Math.max(5, node.height() * scaleY),
                rotation: node.rotation(),
              });
            }}
          />
        );
      case "text":
        return (
          <Text
            ref={textRef as React.RefObject<Konva.Text>}
            x={element.x}
            y={element.y}
            text={element.text}
            fontSize={element.fontSize}
            fill={element.fill}
            width={element.width}
            rotation={element.rotation}
            onDblClick={handleTextDblClick}
            onDblTap={handleTextDblClick}
            {...lockStrokeProps}
            {...commonProps}
          />
        );
    }
  };

  return (
    <>
      {renderShape()}
      {isSelected && !isLockedByOther && (
        <Transformer
          ref={trRef as React.RefObject<Konva.Transformer>}
          rotateEnabled
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          boundBoxFunc={(_oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return _oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};
