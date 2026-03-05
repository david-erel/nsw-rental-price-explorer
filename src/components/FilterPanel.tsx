import type { Filters } from "../types";
import { DWELLING_TYPE_LABELS, BEDROOM_OPTIONS } from "../types";
import { RENT_ABS_MIN, RENT_ABS_MAX, RENT_STEP } from "../utils";
import { MultiSelect } from "./MultiSelect";
import { TagInput } from "./TagInput";
import { RangeSlider } from "./RangeSlider";

interface FilterPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  filtersOpen: boolean;
  onToggleOpen: () => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}

const dwellingOptions = Object.entries(DWELLING_TYPE_LABELS).map(([code, label]) => ({
  value: code,
  label,
}));

const bedroomSelectOptions = BEDROOM_OPTIONS.map((b) => ({
  value: String(b.value),
  label: b.label,
}));

export function FilterPanel({
  filters,
  onFiltersChange,
  filtersOpen,
  onToggleOpen,
  hasActiveFilters,
  onReset,
}: FilterPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl mb-5 shadow-sm border border-gray-200 dark:border-gray-700">
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
        onClick={onToggleOpen}
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Filters</h2>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
            >
              Reset
            </button>
          )}
          <span className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 dark:text-gray-500 text-[0.7rem] cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300">
            <span className={`inline-block transition-transform duration-200 ${filtersOpen ? "rotate-90" : ""}`}>
              &#9654;
            </span>
          </span>
        </div>
      </div>
      <div className={`filters-body ${filtersOpen ? "open" : "closed"}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pl-0.5">
              Dwelling Type
            </label>
            <MultiSelect
              options={dwellingOptions}
              selected={filters.dwellingTypes}
              onChange={(v) => onFiltersChange({ ...filters, dwellingTypes: v })}
              placeholder="All types"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pl-0.5">
              Bedrooms
            </label>
            <MultiSelect
              options={bedroomSelectOptions}
              selected={filters.bedrooms.map(String)}
              onChange={(v) => onFiltersChange({ ...filters, bedrooms: v.map(Number) })}
              placeholder="Any"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pl-0.5">
              Postcode
            </label>
            <TagInput
              tags={filters.postcodes}
              onChange={(postcodes) => onFiltersChange({ ...filters, postcodes })}
              placeholder="Type postcode + Enter"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pl-0.5">
              Weekly Rent
            </label>
            <RangeSlider
              min={RENT_ABS_MIN}
              max={RENT_ABS_MAX}
              step={RENT_STEP}
              valueMin={filters.rentMin}
              valueMax={filters.rentMax}
              onChange={(rentMin, rentMax) => onFiltersChange({ ...filters, rentMin, rentMax })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
