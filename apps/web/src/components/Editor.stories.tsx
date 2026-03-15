import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { DesignElement } from "@starter/shared";
import { Editor } from "./Editor";
import { useAppStore } from "../store/appStore";

const SeededEditor = ({ elements }: { elements: DesignElement[] }) => {
    useEffect(() => {
        useAppStore.setState({ theme: "dark", elements });
    }, [elements]);

    return <Editor documentId="story-document-id" />;
};

const meta = {
    title: "Components/Editor",
    component: SeededEditor,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
} satisfies Meta<typeof SeededEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyCanvas: Story = {
    args: {
        elements: [],
    },
};

export const WithElements: Story = {
    args: {
        elements: [
            {
                id: "story-rect",
                type: "rectangle",
                x: 64,
                y: 56,
                width: 160,
                height: 96,
            },
            {
                id: "story-circle",
                type: "circle",
                x: 280,
                y: 72,
                width: 100,
                height: 100,
            },
            {
                id: "story-text",
                type: "text",
                x: 180,
                y: 220,
                width: 220,
                height: 44,
                text: "Hero heading",
            },
        ],
    },
};
