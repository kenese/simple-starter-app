import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { DocumentMeta } from "@starter/shared";
import { useCanvasStore } from "../store/canvasStore";
import { listDocuments } from "../api/documents";
import "./TopNav.css";

const AUTO_SAVE_INTERVAL = 2 * 60 * 1000;

export const TopNav: React.FC = () => {
    const navigate = useNavigate();
    const documentId = useCanvasStore((s) => s.documentId);
    const documentName = useCanvasStore((s) => s.documentName);
    const isDirty = useCanvasStore((s) => s.isDirty);
    const isSaving = useCanvasStore((s) => s.isSaving);
    const saveDocument = useCanvasStore((s) => s.saveDocument);
    const createDocument = useCanvasStore((s) => s.createDocument);
    const renameDocument = useCanvasStore((s) => s.renameDocument);
    const undo = useCanvasStore((s) => s.undo);
    const redo = useCanvasStore((s) => s.redo);
    const canUndo = useCanvasStore((s) => s.canUndo);
    const canRedo = useCanvasStore((s) => s.canRedo);
    const isUndoRedoLoading = useCanvasStore((s) => s.isUndoRedoLoading);

    const [docs, setDocs] = useState<DocumentMeta[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState("");
    const [titleError, setTitleError] = useState<string | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    const fetchDocs = useCallback(async () => {
        try {
            const list = await listDocuments();
            setDocs(list);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (dropdownOpen) fetchDocs();
    }, [dropdownOpen, fetchDocs]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const state = useCanvasStore.getState();
            if (state.isDirty && state.documentId && !state.isSaving) {
                state.saveDocument();
            }
        }, AUTO_SAVE_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod || e.key.toLowerCase() !== "z") return;
            const tag = (document.activeElement as HTMLElement)?.tagName;
            if (tag === "TEXTAREA" || tag === "INPUT") return;

            e.preventDefault();
            const state = useCanvasStore.getState();
            if (e.shiftKey) {
                if (state.canRedo()) state.redo();
            } else {
                if (state.canUndo()) state.undo();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleNewDoc = async () => {
        setDropdownOpen(false);
        const id = await createDocument();
        navigate(`/${id}`);
    };

    const handleSelectDoc = (id: string) => {
        setDropdownOpen(false);
        if (id !== documentId) {
            navigate(`/${id}`);
        }
    };

    const startEditingTitle = () => {
        setTitleDraft(documentName ?? "");
        setTitleError(null);
        setEditingTitle(true);
        requestAnimationFrame(() => titleInputRef.current?.select());
    };

    const commitTitle = async () => {
        const trimmed = titleDraft.trim();
        if (!trimmed || trimmed === documentName) {
            setEditingTitle(false);
            setTitleError(null);
            return;
        }
        try {
            await renameDocument(trimmed);
            setEditingTitle(false);
            setTitleError(null);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Rename failed";
            setTitleError(msg);
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
        }
        if (e.key === "Escape") {
            setEditingTitle(false);
            setTitleError(null);
        }
    };

    const connectedUsers = useCanvasStore((s) => s.connectedUsers);
    const currentUser = useCanvasStore((s) => s.currentUser);

    const saveLabel = isSaving
        ? "Saving…"
        : isDirty
          ? "Save"
          : "Saved";

    return (
        <header className="topnav">
            <div className="topnav-brand">Canva Clone</div>

            <div className="topnav-title-area">
                {editingTitle ? (
                    <div className="topnav-title-edit-wrapper">
                        <input
                            ref={titleInputRef}
                            className={`topnav-title-input${titleError ? " topnav-title-input--error" : ""}`}
                            value={titleDraft}
                            onChange={(e) => {
                                setTitleDraft(e.target.value);
                                setTitleError(null);
                            }}
                            onBlur={commitTitle}
                            onKeyDown={handleTitleKeyDown}
                            autoFocus
                        />
                        {titleError && (
                            <div className="topnav-title-error">
                                {titleError}
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        className="topnav-title-btn"
                        onClick={startEditingTitle}
                        title="Click to rename"
                    >
                        {documentName ?? "Untitled"}
                    </button>
                )}
            </div>

            <div className="topnav-undo-redo">
                <button
                    className="topnav-undo-btn"
                    onClick={undo}
                    disabled={!canUndo() || isUndoRedoLoading}
                    title="Undo (⌘Z)"
                    aria-label="Undo"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3.5 5.5L1 8l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1.5 8H10a4 4 0 010 8H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </button>
                <button
                    className="topnav-redo-btn"
                    onClick={redo}
                    disabled={!canRedo() || isUndoRedoLoading}
                    title="Redo (⌘⇧Z)"
                    aria-label="Redo"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M12.5 5.5L15 8l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.5 8H6a4 4 0 000 8h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>

            <div className="topnav-doc-picker" ref={dropdownRef}>
                <button
                    className="topnav-doc-btn"
                    onClick={() => setDropdownOpen((o) => !o)}
                >
                    Documents ▾
                </button>

                {dropdownOpen && (
                    <div className="topnav-dropdown">
                        <button
                            className="topnav-dropdown-item topnav-dropdown-new"
                            onClick={handleNewDoc}
                        >
                            + New Document
                        </button>
                        {docs.length > 0 && (
                            <div className="topnav-dropdown-divider" />
                        )}
                        {docs.map((doc) => (
                            <button
                                key={doc.id}
                                className={`topnav-dropdown-item${doc.id === documentId ? " topnav-dropdown-item--active" : ""}`}
                                onClick={() => handleSelectDoc(doc.id)}
                            >
                                {doc.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {connectedUsers.length > 0 && (
                <div className="topnav-users">
                    {connectedUsers.map((user) => (
                        <div
                            key={user.id}
                            className={`topnav-user-avatar${currentUser?.id === user.id ? " topnav-user-avatar--you" : ""}`}
                            style={{ backgroundColor: user.color }}
                            title={currentUser?.id === user.id ? `${user.displayName} (you)` : user.displayName}
                        >
                            {user.displayName.charAt(user.displayName.length - 1)}
                        </div>
                    ))}
                </div>
            )}

            <button
                className={`topnav-save-btn${isDirty ? " topnav-save-btn--dirty" : ""}`}
                onClick={saveDocument}
                disabled={isSaving || !isDirty}
            >
                {saveLabel}
            </button>
        </header>
    );
};
