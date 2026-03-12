import React from "react";
import { v4 as uuidv4 } from "uuid";
import type { CanvasElement } from "@starter/shared";
import { useCanvasStore } from "../store/appStore";
import { useDocumentList } from "../hooks/useDocument";
import "./Sidebar.css";

export const SHAPE_DEFAULTS = {
  rect: {
    type: "rect" as const,
    width: 120,
    height: 80,
    fill: "#6366f1",
    rotation: 0,
  },
  ellipse: {
    type: "ellipse" as const,
    width: 100,
    height: 100,
    fill: "#f472b6",
    rotation: 0,
  },
  text: {
    type: "text" as const,
    width: 200,
    height: 30,
    fill: "#e2e8f0",
    rotation: 0,
    text: "Double-click to edit",
    fontSize: 20,
  },
};

export type ShapeType = keyof typeof SHAPE_DEFAULTS;

export function createShapeElement(shapeType: ShapeType, x: number, y: number): CanvasElement {
  const defaults = SHAPE_DEFAULTS[shapeType];
  return {
    ...defaults,
    id: uuidv4(),
    x,
    y,
  } as CanvasElement;
}

interface SidebarProps {
  currentDocId: string | null;
  onSwitchDoc: (id: string) => void;
  onNewDoc: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDocId,
  onSwitchDoc,
  onNewDoc,
}) => {
  const addElement = useCanvasStore((s) => s.addElement);
  const { documents } = useDocumentList();

  const handleAdd = (shapeType: ShapeType) => {
    addElement(createShapeElement(shapeType, 100 + Math.random() * 200, 100 + Math.random() * 200));
  };

  const handleDragStart = (e: React.DragEvent, shapeType: ShapeType) => {
    e.dataTransfer.setData("application/shape-type", shapeType);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">Document</h3>
        <div className="sidebar-doc-controls">
          <select
            className="sidebar-doc-select"
            value={currentDocId ?? ""}
            onChange={(e) => onSwitchDoc(e.target.value)}
          >
            {currentDocId && !documents.find((d) => d.id === currentDocId) && (
              <option value={currentDocId}>
                Untitled (new)
              </option>
            )}
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} (v{doc.version})
              </option>
            ))}
          </select>
          <button className="sidebar-new-btn" onClick={onNewDoc}>
            + New
          </button>
        </div>
      </div>

      <div className="sidebar-divider" />

      <h3 className="sidebar-title">Shapes</h3>
      <div className="sidebar-shapes">
        <button
          className="sidebar-btn"
          draggable
          onClick={() => handleAdd("rect")}
          onDragStart={(e) => handleDragStart(e, "rect")}
        >
          <div className="shape-preview shape-preview--rect" />
          <span>Rectangle</span>
        </button>
        <button
          className="sidebar-btn"
          draggable
          onClick={() => handleAdd("ellipse")}
          onDragStart={(e) => handleDragStart(e, "ellipse")}
        >
          <div className="shape-preview shape-preview--ellipse" />
          <span>Ellipse</span>
        </button>
        <button
          className="sidebar-btn"
          draggable
          onClick={() => handleAdd("text")}
          onDragStart={(e) => handleDragStart(e, "text")}
        >
          <div className="shape-preview shape-preview--text">T</div>
          <span>Text</span>
        </button>
      </div>
    </aside>
  );
};
