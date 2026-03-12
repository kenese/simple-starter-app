import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RedirectToNewDoc } from "./components/RedirectToNewDoc";
import { EditorPage } from "./components/EditorPage";
import "./index.css";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<RedirectToNewDoc />} />
          <Route path="/:documentId" element={<EditorPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
