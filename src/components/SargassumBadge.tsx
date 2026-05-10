import type { SargassumDisplay } from "@/types/beach";

function pillClass(display: SargassumDisplay): string {
  if (display.status === "unavailable") {
    return "bg-slate-100 text-slate-500 ring-slate-200";
  }
  switch (display.level) {
    case "low":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "medium":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case "high":
      return "bg-rose-100 text-rose-900 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-500 ring-slate-200";
  }
}

function label(display: SargassumDisplay): string {
  if (display.status === "unavailable") {
    return "Sargassum: data not available";
  }
  switch (display.level) {
    case "low":
      return "Sargassum: clear";
    case "medium":
      return "Sargassum: some present";
    case "high":
      return "Sargassum: heavy";
    default:
      return "Sargassum: data not available";
  }
}

export function SargassumBadge({
  display,
  subtleUnavailable = false
}: {
  display: SargassumDisplay;
  /** Softer styling when used on compact cards. */
  subtleUnavailable?: boolean;
}) {
  const unavailableStyle =
    subtleUnavailable && display.status === "unavailable"
      ? "text-xs font-normal text-slate-400 ring-0 bg-transparent px-0 py-0"
      : "";

  return (
    <p
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${pillClass(display)} ${unavailableStyle}`}
    >
      {label(display)}
    </p>
  );
}
