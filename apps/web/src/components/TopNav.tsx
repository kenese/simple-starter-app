import React from "react";
import "./TopNav.css";

interface TopNavProps {
    documentId: string;
}

export const TopNav: React.FC<TopNavProps> = ({ documentId }) => {
    const shortDocumentId = documentId.slice(0, 8);

    return (
        <header className="topnav">
            <div className="topnav-brand">Canva Clone</div>
            <div className="topnav-spacer" />
            <div className="topnav-context">Doc {shortDocumentId}</div>
        </header>
    );
};
