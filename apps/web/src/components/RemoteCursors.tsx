import React from "react";
import type { CursorPosition } from "@starter/shared";

const CURSOR_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function getCursorColor(userId: string): string {
  let hash = 0;
  for (const ch of userId) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

interface RemoteCursorsProps {
  cursors: CursorPosition[];
}

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({ cursors }) => {
  if (cursors.length === 0) return null;

  return (
    <div className="remote-cursors-overlay">
      {cursors.map((cursor) => {
        const color = getCursorColor(cursor.userId);
        const label = cursor.userId.slice(0, 6);
        return (
          <div
            key={cursor.userId}
            className="remote-cursor"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            }}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0 0L16 12H6L2 20L0 0Z" fill={color} />
            </svg>
            <span
              className="remote-cursor-label"
              style={{ background: color }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
