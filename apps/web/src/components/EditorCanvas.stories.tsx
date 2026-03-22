import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";
import { EditorCanvas } from "./EditorCanvas";
import { useCanvasStore } from "../store/canvasStore";

const meta = {
    title: "Components/EditorCanvas",
    component: EditorCanvas,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div style={{ width: "100%", height: "400px" }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof EditorCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    decorators: [
        (Story) => {
            useEffect(() => {
                useCanvasStore.setState({
                    elementIds: [],
                    elementsById: {},
                    selectedTool: null,
                });
            }, []);
            return <Story />;
        },
    ],
};

const SAMPLE_ELEMENTS = {
    elementIds: ["a", "b", "c"],
    elementsById: {
        a: { id: "a", kind: "circle" as const, x: 120, y: 100, width: 80, height: 80 },
        b: { id: "b", kind: "square" as const, x: 280, y: 100, width: 80, height: 80 },
        c: { id: "c", kind: "text" as const, x: 200, y: 220, width: 120, height: 32, text: "Hello" },
    },
    selectedTool: null,
    selectedElementId: null,
};

export const WithElements: Story = {
    decorators: [
        (Story) => {
            useEffect(() => {
                useCanvasStore.setState(SAMPLE_ELEMENTS);
            }, []);
            return <Story />;
        },
    ],
};

export const SelectedElement: Story = {
    decorators: [
        (Story) => {
            useEffect(() => {
                useCanvasStore.setState({
                    ...SAMPLE_ELEMENTS,
                    selectedElementId: "b",
                });
            }, []);
            return <Story />;
        },
    ],
};

export const SelectedCircle: Story = {
    decorators: [
        (Story) => {
            useEffect(() => {
                useCanvasStore.setState({
                    ...SAMPLE_ELEMENTS,
                    selectedElementId: "a",
                });
            }, []);
            return <Story />;
        },
    ],
};
