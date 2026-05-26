"use client";

const INPUT_CLASS =
  "w-full rounded-2xl border border-ocean-100/80 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-400/35";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function BeachSearchInput({ id, value, onChange, className }: Props) {
  const merged = className ? `${INPUT_CLASS} ${className}` : INPUT_CLASS;
  return (
    <input
      id={id}
      type="search"
      autoComplete="off"
      placeholder="Find a beach..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={merged}
    />
  );
}
