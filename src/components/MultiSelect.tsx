import { useEffect, useRef, useState } from "react";

export interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

export function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const displayText =
    selected.length === 0
      ? null
      : selected.length <= 2
        ? selected.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ")
        : `${selected.length} selected`;

  return (
    <div className={`multi-select relative ${open ? "open" : ""}`} ref={ref}>
      <div
        className="multi-select-trigger flex items-center justify-between w-full min-h-[34px] px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 cursor-pointer text-sm text-gray-900 dark:text-gray-100 transition-colors select-none hover:border-gray-400 dark:hover:border-gray-500"
        onClick={() => setOpen((o) => !o)}
      >
        {displayText ? (
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{displayText}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
        )}
        <span className="arrow ml-2 text-[0.6rem] text-gray-400 dark:text-gray-500 transition-transform">&#9660;</span>
      </div>
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto p-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-sm text-gray-900 dark:text-gray-100 transition-colors select-none hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => toggle(opt.value)}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => {}}
                className="accent-indigo-600 w-4 h-4 shrink-0"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
