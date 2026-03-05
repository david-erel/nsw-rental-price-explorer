import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeDropdown } from "../components/ThemeDropdown";

describe("ThemeDropdown", () => {
  it("renders the current theme label", () => {
    render(<ThemeDropdown mode="light" onChange={() => {}} />);
    expect(screen.getByText("Light")).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    const user = userEvent.setup();
    render(<ThemeDropdown mode="light" onChange={() => {}} />);

    await user.click(screen.getByText("Light"));
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("calls onChange with selected theme", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ThemeDropdown mode="light" onChange={onChange} />);

    await user.click(screen.getByText("Light"));
    await user.click(screen.getByText("Dark"));
    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("closes dropdown after selection", async () => {
    const user = userEvent.setup();
    render(<ThemeDropdown mode="light" onChange={() => {}} />);

    await user.click(screen.getByText("Light"));
    expect(screen.getAllByText("Light")).toHaveLength(2);

    await user.click(screen.getByText("Dark"));
    expect(screen.getAllByText("Light")).toHaveLength(1);
  });

  it("highlights the active theme option", async () => {
    const user = userEvent.setup();
    render(<ThemeDropdown mode="dark" onChange={() => {}} />);

    await user.click(screen.getByText("Dark"));
    const darkButtons = screen.getAllByText("Dark");
    const dropdownOption = darkButtons.find((el) => el.closest("button")?.className.includes("font-semibold"));
    expect(dropdownOption).toBeDefined();
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <span>outside</span>
        <ThemeDropdown mode="light" onChange={() => {}} />
      </div>,
    );

    await user.click(screen.getByText("Light"));
    expect(screen.getByText("Dark")).toBeInTheDocument();

    await user.click(screen.getByText("outside"));
    expect(screen.queryByText("System")).not.toBeInTheDocument();
  });
});
