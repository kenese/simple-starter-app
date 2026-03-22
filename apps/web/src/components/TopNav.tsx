import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useCanvasStore } from "../store/canvasStore";
import "./TopNav.css";

const NAV_ITEMS = [
    { label: "Editor", path: "/" },
    { label: "Route 2", path: "/route2" },
];

export const TopNav: React.FC = () => {
    const location = useLocation();
    const saveVersion = useCanvasStore((state) => state.saveVersion);
    const isEditor = location.pathname === "/";

    return (
        <header className="topnav">
            <div className="topnav-brand">Starter App</div>
            <nav className="topnav-links">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `topnav-link ${isActive ? "topnav-link--active" : ""}`
                        }
                        end={item.path === "/"}
                    >
                        {item.label}
                    </NavLink>
                ))}
                {isEditor && (
                    <button
                        type="button"
                        className="topnav-save"
                        onClick={() => saveVersion()}
                        data-testid="topnav-save"
                    >
                        Save
                    </button>
                )}
            </nav>
        </header>
    );
};
