import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCanvasStore } from "../store/canvasStore";

export function useDocumentLoader(): void {
    const { documentId } = useParams<{ documentId?: string }>();
    const navigate = useNavigate();
    const loadDocument = useCanvasStore((s) => s.loadDocument);
    const createDocument = useCanvasStore((s) => s.createDocument);
    const currentDocId = useCanvasStore((s) => s.documentId);
    const loadedIdRef = useRef<string | null>(null);
    const creatingDocRef = useRef(false);

    useEffect(() => {
        if (!documentId) {
            if (creatingDocRef.current) return;
            creatingDocRef.current = true;
            createDocument().then((id) => {
                creatingDocRef.current = false;
                loadedIdRef.current = id;
                navigate(`/${id}`, { replace: true });
            });
            return;
        }

        if (documentId === loadedIdRef.current) return;

        if (documentId !== currentDocId) {
            loadedIdRef.current = documentId;
            loadDocument(documentId).catch(() => {
                if (creatingDocRef.current) return;
                creatingDocRef.current = true;
                createDocument().then((id) => {
                    creatingDocRef.current = false;
                    loadedIdRef.current = id;
                    navigate(`/${id}`, { replace: true });
                });
            });
        } else {
            loadedIdRef.current = documentId;
        }
    }, [documentId, currentDocId, loadDocument, createDocument, navigate]);
}
