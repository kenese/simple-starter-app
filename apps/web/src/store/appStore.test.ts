import { beforeEach, describe, it, expect } from "vitest";
import { useAppStore } from "./appStore";

describe("App Store (Zustand)", () => {
    beforeEach(() => {
        useAppStore.setState({ theme: "dark", elements: [] });
    });

    it("should initialize with dark theme and empty elements", () => {
        const state = useAppStore.getState();
        expect(state.theme).toBe("dark");
        expect(state.elements).toHaveLength(0);
    });

    it("should toggle the theme", () => {
        const { toggleTheme } = useAppStore.getState();
        
        // Toggle once to light
        toggleTheme();
        expect(useAppStore.getState().theme).toBe("light");

        // Toggle back to dark
        toggleTheme();
        expect(useAppStore.getState().theme).toBe("dark");
    });

    it("adds elements with expected defaults", () => {
        const { addElement } = useAppStore.getState();

        addElement("rectangle");
        addElement("circle", { x: 120, y: 180 });
        addElement("text");

        const elements = useAppStore.getState().elements;
        expect(elements).toHaveLength(3);
        expect(elements[0]).toMatchObject({
            type: "rectangle",
            width: 160,
            height: 96,
        });
        expect(elements[1]).toMatchObject({
            type: "circle",
            x: 120,
            y: 180,
            width: 100,
            height: 100,
        });
        expect(elements[2]).toMatchObject({
            type: "text",
            text: "Text input",
            width: 220,
            height: 44,
        });
    });

    it("updates text content only for text elements", () => {
        const { addElement, updateTextElement } = useAppStore.getState();
        addElement("text");
        addElement("rectangle");
        const [textElement, rectangleElement] = useAppStore.getState().elements;

        updateTextElement(textElement.id, "Heading");
        updateTextElement(rectangleElement.id, "Ignored");

        const [updatedText, rectangle] = useAppStore.getState().elements;
        expect(updatedText.text).toBe("Heading");
        expect(rectangle.type).toBe("rectangle");
        expect(rectangle.text).toBeUndefined();
    });
});
