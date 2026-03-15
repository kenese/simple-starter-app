import React from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { Editor } from "./components/Editor";
import "./index.css";

const createDocumentId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `doc-${Math.random().toString(36).slice(2, 11)}`;
};

const NewDocumentRedirect: React.FC = () => {
    const documentId = React.useMemo(() => createDocumentId(), []);
    return <Navigate to={`/${documentId}`} replace />;
};

const DocumentEditorPage: React.FC = () => {
    const params = useParams<{ documentId: string }>();
    const documentId = params.documentId;

    if (!documentId) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="app">
            <TopNav documentId={documentId} />
            <div className="app-body">
                <Editor documentId={documentId} />
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<NewDocumentRedirect />} />
            <Route path="/:documentId" element={<DocumentEditorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
