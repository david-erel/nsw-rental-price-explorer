import { useRef, useState } from "react";

export interface TagInputProps {
  tags: number[];
  onChange: (tags: number[]) => void;
  placeholder: string;
}

export function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag() {
    const trimmed = inputValue.trim();
    const num = Number(trimmed);
    if (trimmed === "" || isNaN(num)) return;
    if (!tags.includes(num)) {
      onChange([...tags, num]);
    }
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[34px] items-center cursor-text transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/10"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-px bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-medium whitespace-nowrap"
        >
          {tag}
          <button
            className="flex items-center justify-center bg-transparent border-none text-indigo-400 dark:text-indigo-500 cursor-pointer text-base leading-none p-0 ml-0.5 rounded-sm w-4 h-4 hover:text-indigo-700 hover:bg-indigo-200 dark:hover:text-indigo-300 dark:hover:bg-indigo-800"
            onClick={(e) => {
              e.stopPropagation();
              onChange(tags.filter((t) => t !== tag));
            }}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="border-none outline-none text-sm flex-1 min-w-[80px] py-0.5 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
    </div>
  );
}
