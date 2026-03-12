import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { DesignCanvas } from "./DesignCanvas";
import { useDocument } from "../hooks/useDocument";
import { useSocket } from "../hooks/useSocket";
import { useWebRTC } from "../hooks/useWebRTC";
import { useLerpElements } from "../hooks/useLerpElements";
import { useCanvasStore } from "../store/appStore";

export const EditorPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const {
    docName,
    isDirty,
    version,
    setDocumentId,
    setDocName,
    setElements,
    setVersion,
    setSeq,
    markClean,
    resetForNewDocument,
  } = useCanvasStore();

  const [nameError, setNameError] = useState<string | null>(null);
  const prevDocId = useRef<string | null>(null);

  useEffect(() => {
    if (documentId && documentId !== prevDocId.current) {
      prevDocId.current = documentId;
      setDocumentId(documentId);
      resetForNewDocument();
      setNameError(null);
    }
  }, [documentId, setDocumentId, resetForNewDocument]);

  const {
    socketRef,
    saveViaSocket,
    updateElementsViaSocket,
    onRestDocumentLoaded,
    lockElement,
    unlockElement,
  } = useSocket(documentId ?? null);

  const { broadcastCursor } = useWebRTC(documentId ?? null, socketRef);
  useLerpElements();

  const { document: doc, rawResponse } = useDocument(documentId ?? null);

  const docLoaded = useRef<string | null>(null);

  useEffect(() => {
    if (doc && documentId && docLoaded.current !== documentId) {
      setElements(doc.elements);
      setVersion(doc.version);
      const seq = rawResponse?.seq ?? 0;
      setSeq(seq);
      useCanvasStore.setState({ docName: doc.name, isDirty: false });
      docLoaded.current = documentId;
      onRestDocumentLoaded(doc, seq);
    }
  }, [doc, documentId, rawResponse, setElements, setVersion, setSeq, onRestDocumentLoaded]);

  const localMutationCount = useCanvasStore((s) => s.localMutationCount);
  const prevMutationRef = useRef(localMutationCount);
  useEffect(() => {
    if (prevMutationRef.current === localMutationCount) return;
    prevMutationRef.current = localMutationCount;

    if (!useCanvasStore.getState().documentReady) return;

    updateElementsViaSocket(useCanvasStore.getState().elements);
  }, [localMutationCount, updateElementsViaSocket]);

  const handleSave = useCallback(() => {
    if (!documentId) return;
    setNameError(null);
    const currentElements = useCanvasStore.getState().elements;
    const currentName = useCanvasStore.getState().docName;
    saveViaSocket(currentElements, currentName);
    markClean();
  }, [documentId, saveViaSocket, markClean]);

  const handleRename = (name: string) => {
    setNameError(null);
    setDocName(name);
  };

  const handleSwitchDoc = (id: string) => {
    navigate(`/${id}`);
  };

  const handleNewDoc = () => {
    navigate(`/${uuidv4()}`);
  };

  return (
    <>
      <TopNav
        docName={docName}
        onRename={handleRename}
        onSave={handleSave}
        isSaving={false}
        isDirty={isDirty}
        version={version}
        nameError={nameError}
      />
      <div className="app-body">
        <div className="page-with-sidebar">
          <Sidebar
            currentDocId={documentId ?? null}
            onSwitchDoc={handleSwitchDoc}
            onNewDoc={handleNewDoc}
          />
          <DesignCanvas
            onLockElement={lockElement}
            onUnlockElement={unlockElement}
            onCursorMove={broadcastCursor}
          />
        </div>
      </div>
    </>
  );
};
