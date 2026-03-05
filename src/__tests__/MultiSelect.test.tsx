import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultiSelect } from "../components/MultiSelect";

const options = [
  { value: "F", label: "Flat / Unit" },
  { value: "H", label: "House" },
  { value: "T", label: "Terrace" },
];

describe("MultiSelect", () => {
  it("renders the placeholder when nothing is selected", () => {
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} placeholder="All types" />);
    expect(screen.getByText("All types")).toBeInTheDocument();
  });

  it("displays selected item labels", () => {
    render(<MultiSelect options={options} selected={["F"]} onChange={() => {}} placeholder="All types" />);
    expect(screen.getByText("Flat / Unit")).toBeInTheDocument();
    expect(screen.queryByText("All types")).not.toBeInTheDocument();
  });

  it("shows count when more than 2 items selected", () => {
    render(<MultiSelect options={options} selected={["F", "H", "T"]} onChange={() => {}} placeholder="All types" />);
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    const user = userEvent.setup();
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} placeholder="All types" />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(screen.getByText("All types"));
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("calls onChange when an option is toggled on", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MultiSelect options={options} selected={[]} onChange={onChange} placeholder="All types" />);

    await user.click(screen.getByText("All types"));
    await user.click(screen.getByText("House"));
    expect(onChange).toHaveBeenCalledWith(["H"]);
  });

  it("calls onChange when an option is toggled off", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MultiSelect options={options} selected={["F", "H"]} onChange={onChange} placeholder="All types" />);

    await user.click(screen.getByText("Flat / Unit, House"));
    await user.click(screen.getByText("House"));
    expect(onChange).toHaveBeenCalledWith(["F"]);
  });

  it("closes dropdown on outside click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <span>outside</span>
        <MultiSelect options={options} selected={[]} onChange={() => {}} placeholder="All types" />
      </div>,
    );

    await user.click(screen.getByText("All types"));
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);

    await user.click(screen.getByText("outside"));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
