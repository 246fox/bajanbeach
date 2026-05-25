"use client";

import { COAST_FILTERS, type CoastFilter } from "@/lib/coast-filter";

type Props = {
  activeCoast: CoastFilter;
  onChange: (next: CoastFilter) => void;
  /** When set, merged after default flex row utilities (e.g. `mt-4 mb-4`). Omit for homepage default `mt-6`. */
  className?: string;
};

const FLEX_ROW = "flex flex-wrap items-center justify-center gap-2";

export function CoastPills({ activeCoast, onChange, className }: Props) {
  const wrapperClass = className === undefined ? `mt-6 ${FLEX_ROW}` : `${className} ${FLEX_ROW}`;

  return (
    <div className={wrapperClass}>
      {COAST_FILTERS.map((label) => {
        const active = activeCoast === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(label)}
            className={
              active
                ? "rounded-full bg-ocean-500 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-2 ring-ocean-500 ring-offset-2 ring-offset-white"
                : "rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
