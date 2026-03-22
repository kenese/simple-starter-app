// ─── App State ──────────────────────────────────────────────────

export interface AppState {
    counter: number;
}

// ─── Defaults ───────────────────────────────────────────────────

export const INITIAL_APP_STATE: AppState = {
    counter: 0,
};

// ─── Canvas (editor) ─────────────────────────────────────────────

export type CanvasElementKind = "circle" | "square" | "text";

export interface CanvasElement {
    id: string;
    kind: CanvasElementKind;
    x: number;
    y: number;
    width?: number;
    height?: number;
    text?: string;
}

