import type { Meta, StoryObj } from "@storybook/react";
import { EditorSidebar } from "./EditorSidebar";

const meta = {
    title: "Components/EditorSidebar",
    component: EditorSidebar,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
} satisfies Meta<typeof EditorSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
