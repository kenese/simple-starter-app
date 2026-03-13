import React from "react";
import { Routes, Route } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { Canvas } from "./components/Canvas";
import { useDocumentLoader } from "./hooks/useDocumentLoader";
import "./index.css";

const EditorPage: React.FC = () => {
    useDocumentLoader();
    return (
        <div className="app">
            <TopNav />
            <div className="app-body">
                <Sidebar />
                <Canvas />
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<EditorPage />} />
            <Route path="/:documentId" element={<EditorPage />} />
        </Routes>
    );
};

export default App;
