import { useCallback } from "react";
import { formatCurrency } from "../utils";

export interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (low: number, high: number) => void;
}

export function RangeSlider({ min, max, step, valueMin, valueMax, onChange }: RangeSliderProps) {
  const leftPct = ((valueMin - min) / (max - min)) * 100;
  const rightPct = ((valueMax - min) / (max - min)) * 100;

  const handleMin = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      onChange(Math.min(v, valueMax - step), valueMax);
    },
    [onChange, valueMax, step],
  );

  const handleMax = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      onChange(valueMin, Math.max(v, valueMin + step));
    },
    [onChange, valueMin, step],
  );

  return (
    <div className="py-0.5">
      <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full my-2.5">
        <div
          className="absolute h-full bg-indigo-600 rounded-full"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
      </div>
      <div className="range-slider-inputs relative h-0">
        <input type="range" min={min} max={max} step={step} value={valueMin} onChange={handleMin} />
        <input type="range" min={min} max={max} step={step} value={valueMax} onChange={handleMax} />
      </div>
      <div className="flex justify-between text-sm font-semibold text-indigo-600 mt-0.5">
        <span>{formatCurrency(valueMin)}</span>
        <span>{valueMax >= max ? formatCurrency(valueMax) + "+" : formatCurrency(valueMax)}</span>
      </div>
      <div className="flex justify-between text-[0.65rem] text-gray-400 dark:text-gray-500 mt-px">
        <span>{formatCurrency(min)}</span>
        <span>{formatCurrency(max)}</span>
      </div>
    </div>
  );
}
