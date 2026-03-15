import type { Meta, StoryObj } from '@storybook/react';
import { TopNav } from './TopNav';

const meta = {
    title: 'Components/TopNav',
    component: TopNav,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof TopNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        documentId: "f5facc06-f951-4b26-8ef4-35781876e862",
    },
};
