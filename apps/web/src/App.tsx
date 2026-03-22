import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { EditorSidebar } from "./components/EditorSidebar";
import { EditorCanvas } from "./components/EditorCanvas";
import "./index.css";

const Route2Page: React.FC = () => {
    return (
        <div className="page-centered">
            <h2>Route 2</h2>
            <p className="page-placeholder">This page is a placeholder.</p>
        </div>
    );
};

const EditorPage: React.FC = () => {
    return (
        <div className="page-with-sidebar">
            <EditorSidebar />
            <EditorCanvas />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <div className="app">
                <TopNav />
                <div className="app-body">
                    <Routes>
                        <Route path="/" element={<EditorPage />} />
                        <Route path="/route2" element={<Route2Page />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
};

export default App;
