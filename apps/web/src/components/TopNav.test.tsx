import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TopNav } from "./TopNav";

describe("TopNav Component", () => {
  it("renders the brand name", () => {
    render(<TopNav />);
    expect(screen.getByText("Design Studio")).toBeInTheDocument();
  });

  it("renders save button when onSave is provided", () => {
    render(<TopNav onSave={() => {}} isDirty={true} />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("disables save button when not dirty", () => {
    render(<TopNav onSave={() => {}} isDirty={false} />);
    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("shows version badge when version > 0", () => {
    render(<TopNav version={3} />);
    expect(screen.getByText("v3")).toBeInTheDocument();
  });

  it("shows Saving... text when isSaving", () => {
    render(<TopNav onSave={() => {}} isSaving={true} isDirty={true} />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("shows document name when provided", () => {
    render(<TopNav docName="My Doc" />);
    expect(screen.getByText("My Doc")).toBeInTheDocument();
  });

  it("shows name error when provided", () => {
    render(<TopNav docName="Taken" nameError="Name already taken" />);
    expect(screen.getByText("Name already taken")).toBeInTheDocument();
  });
});
