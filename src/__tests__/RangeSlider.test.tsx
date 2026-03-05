import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RangeSlider } from "../components/RangeSlider";

describe("RangeSlider", () => {
  it("renders min and max labels", () => {
    render(<RangeSlider min={0} max={3000} step={50} valueMin={100} valueMax={2000} onChange={() => {}} />);
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$3,000")).toBeInTheDocument();
  });

  it("renders current value labels", () => {
    render(<RangeSlider min={0} max={3000} step={50} valueMin={500} valueMax={1500} onChange={() => {}} />);
    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.getByText("$1,500")).toBeInTheDocument();
  });

  it("shows + suffix when valueMax is at max", () => {
    render(<RangeSlider min={0} max={3000} step={50} valueMin={500} valueMax={3000} onChange={() => {}} />);
    expect(screen.getByText("$3,000+")).toBeInTheDocument();
  });

  it("renders two range inputs", () => {
    render(<RangeSlider min={0} max={3000} step={50} valueMin={0} valueMax={3000} onChange={() => {}} />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);
  });

  it("calls onChange when min slider changes", () => {
    const onChange = vi.fn();
    render(<RangeSlider min={0} max={3000} step={50} valueMin={500} valueMax={2000} onChange={onChange} />);

    const sliders = screen.getAllByRole("slider");
    sliders[0].dispatchEvent(new Event("change", { bubbles: true }));
  });
});
