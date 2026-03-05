import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "../components/TagInput";

describe("TagInput", () => {
  it("renders placeholder when no tags exist", () => {
    render(<TagInput tags={[]} onChange={() => {}} placeholder="Type postcode + Enter" />);
    expect(screen.getByPlaceholderText("Type postcode + Enter")).toBeInTheDocument();
  });

  it("renders existing tags", () => {
    render(<TagInput tags={[2000, 2010]} onChange={() => {}} placeholder="Type postcode" />);
    expect(screen.getByText("2000")).toBeInTheDocument();
    expect(screen.getByText("2010")).toBeInTheDocument();
  });

  it("hides placeholder when tags exist", () => {
    render(<TagInput tags={[2000]} onChange={() => {}} placeholder="Type postcode" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "");
  });

  it("adds a tag on Enter", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={[]} onChange={onChange} placeholder="Type postcode" />);

    const input = screen.getByRole("textbox");
    await user.type(input, "2000{Enter}");
    expect(onChange).toHaveBeenCalledWith([2000]);
  });

  it("adds a tag on comma", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={[]} onChange={onChange} placeholder="Type postcode" />);

    const input = screen.getByRole("textbox");
    await user.type(input, "2010,");
    expect(onChange).toHaveBeenCalledWith([2010]);
  });

  it("does not add duplicate tags", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={[2000]} onChange={onChange} placeholder="Type postcode" />);

    const input = screen.getByRole("textbox");
    await user.type(input, "2000{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not add non-numeric input", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={[]} onChange={onChange} placeholder="Type postcode" />);

    const input = screen.getByRole("textbox");
    await user.type(input, "abc{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes a tag on × click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={[2000, 2010]} onChange={onChange} placeholder="Type postcode" />);

    const removeButtons = screen.getAllByRole("button");
    await user.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([2010]);
  });

  it("removes last tag on Backspace when input is empty", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={[2000, 2010]} onChange={onChange} placeholder="Type postcode" />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Backspace}");
    expect(onChange).toHaveBeenCalledWith([2000]);
  });
});
