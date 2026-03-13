import type { Meta, StoryObj } from "@storybook/react";
import { TopNav } from "./TopNav";
import { useCanvasStore } from "../store/canvasStore";
import { BrowserRouter } from "react-router-dom";

const meta = {
    title: "Components/TopNav",
    component: TopNav,
    parameters: {
        layout: "fullscreen",
    },
    decorators: [
        (Story) => (
            <BrowserRouter>
                <Story />
            </BrowserRouter>
        ),
    ],
    tags: ["autodocs"],
} satisfies Meta<typeof TopNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDirtyState: Story = {
    decorators: [
        (Story) => {
            useCanvasStore.setState({ isDirty: true, documentName: "My Design" });
            return <Story />;
        },
    ],
};

export const Saving: Story = {
    decorators: [
        (Story) => {
            useCanvasStore.setState({
                isSaving: true,
                isDirty: true,
                documentName: "Saving Doc",
            });
            return <Story />;
        },
    ],
};

export const WithUndoAvailable: Story = {
    decorators: [
        (Story) => {
            useCanvasStore.setState({
                documentId: "doc-1",
                documentName: "Undo Ready",
                versionHistory: [
                    { versionId: "v1", savedAt: "2026-01-01" },
                    { versionId: "v2", savedAt: "2026-01-02" },
                    { versionId: "v3", savedAt: "2026-01-03" },
                ],
                currentVersionIndex: 2,
                isDirty: false,
            });
            return <Story />;
        },
    ],
};

export const WithRedoAvailable: Story = {
    decorators: [
        (Story) => {
            useCanvasStore.setState({
                documentId: "doc-1",
                documentName: "Redo Ready",
                versionHistory: [
                    { versionId: "v1", savedAt: "2026-01-01" },
                    { versionId: "v2", savedAt: "2026-01-02" },
                    { versionId: "v3", savedAt: "2026-01-03" },
                ],
                currentVersionIndex: 0,
                isDirty: false,
            });
            return <Story />;
        },
    ],
};

export const UndoRedoDisabled: Story = {
    decorators: [
        (Story) => {
            useCanvasStore.setState({
                documentId: "doc-1",
                documentName: "No History",
                versionHistory: [{ versionId: "v1", savedAt: "2026-01-01" }],
                currentVersionIndex: 0,
                isDirty: false,
            });
            return <Story />;
        },
    ],
};

export const WithConnectedUsers: Story = {
    decorators: [
        (Story) => {
            useCanvasStore.setState({
                documentId: "doc-1",
                documentName: "Shared Design",
                isDirty: false,
                currentUser: { id: "u1", displayName: "User 1", color: "#6366f1" },
                connectedUsers: [
                    { id: "u1", displayName: "User 1", color: "#6366f1" },
                    { id: "u2", displayName: "User 2", color: "#ec4899" },
                    { id: "u3", displayName: "User 3", color: "#10b981" },
                ],
            });
            return <Story />;
        },
    ],
};

export const SingleUser: Story = {
    decorators: [
        (Story) => {
            useCanvasStore.setState({
                documentId: "doc-1",
                documentName: "Solo Design",
                isDirty: false,
                currentUser: { id: "u1", displayName: "User 1", color: "#6366f1" },
                connectedUsers: [
                    { id: "u1", displayName: "User 1", color: "#6366f1" },
                ],
            });
            return <Story />;
        },
    ],
};
