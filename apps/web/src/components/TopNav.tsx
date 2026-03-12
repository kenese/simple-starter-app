import React, { useState, useRef, useEffect } from "react";
import "./TopNav.css";

interface TopNavProps {
  docName?: string;
  onRename?: (name: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  version?: number;
  nameError?: string | null;
}

export const TopNav: React.FC<TopNavProps> = ({
  docName,
  onRename,
  onSave,
  isSaving,
  isDirty,
  version,
  nameError,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(docName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(docName ?? "");
  }, [docName]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commitName = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== docName && onRename) {
      onRename(trimmed);
    } else {
      setDraft(docName ?? "");
    }
  };

  return (
    <header className="topnav">
      <div className="topnav-brand">Design Studio</div>

      {docName !== undefined && (
        <div className="topnav-doc-name-wrapper">
          {editing ? (
            <input
              ref={inputRef}
              className="topnav-doc-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setDraft(docName);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <button
              className="topnav-doc-name"
              onClick={() => setEditing(true)}
              title="Click to rename"
            >
              {docName}
            </button>
          )}
          {nameError && <span className="topnav-name-error">{nameError}</span>}
        </div>
      )}

      <div className="topnav-spacer" />
      <div className="topnav-actions">
        {version !== undefined && version > 0 && (
          <span className="topnav-version">v{version}</span>
        )}
        {onSave && (
          <button
            className={`topnav-save ${isDirty ? "topnav-save--dirty" : ""}`}
            onClick={onSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </header>
  );
};
