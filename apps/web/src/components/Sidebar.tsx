import React from "react";
import type { ElementType } from "@starter/shared";
import { useCanvasStore } from "../store/canvasStore";
import "./Sidebar.css";

const ELEMENT_OPTIONS: {
    type: ElementType;
    label: string;
    icon: React.ReactNode;
}[] = [
    {
        type: "rectangle",
        label: "Rectangle",
        icon: <div className="sidebar-icon sidebar-icon--rect" />,
    },
    {
        type: "circle",
        label: "Circle",
        icon: <div className="sidebar-icon sidebar-icon--circle" />,
    },
    {
        type: "text",
        label: "Text",
        icon: <div className="sidebar-icon sidebar-icon--text">T</div>,
    },
];

export const Sidebar: React.FC = () => {
    const addElement = useCanvasStore((s) => s.addElement);

    const handleDragStart = (e: React.DragEvent, type: ElementType) => {
        e.dataTransfer.setData("element-type", type);
        e.dataTransfer.effectAllowed = "copy";
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-section-title">Elements</div>
            <div className="sidebar-elements">
                {ELEMENT_OPTIONS.map(({ type, label, icon }) => (
                    <button
                        key={type}
                        className="sidebar-element-btn"
                        onClick={() => addElement(type)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, type)}
                        title={`Add ${label}`}
                    >
                        {icon}
                        <span>{label}</span>
                    </button>
                ))}
            </div>
        </aside>
    );
};
