"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Beach, BeachCoast } from "@/types/beach";
import {
  coastForSargassumLookup,
  type SargassumLevelForScore
} from "@/lib/sargassum";
import { activityLabel } from "@/lib/beach-format";
import { computeBeachScoreQuiet, explainBeachScore } from "@/lib/beach-conditions";
import type { CoastFilter } from "@/lib/coast-filter";
import { CoastPills } from "@/components/CoastPills";
import type { ScoreLabBeach } from "./types";
import {
  loadLiveBeachConditions,
  loadSargassumLevelsForLab,
  type CoastSargassumMeta
} from "./actions";

type SortKey = "score" | "coast" | "name";
type SargassumMode = "uniform" | "per-coast";

const ALL_COASTS: BeachCoast[] = ["North", "West", "South", "Southeast", "East"];

type TableRow = {
  beach: ScoreLabBeach;
  score: number | null;
  label: string;
  appliedSargassum: SargassumLevelForScore;
  sargassumLookupCoast: BeachCoast;
  zoneOverride: boolean;
};

function emptyPerCoastLevels(): Record<BeachCoast, SargassumLevelForScore> {
  return { North: null, West: null, South: null, Southeast: null, East: null };
}

function beachScorePick(b: ScoreLabBeach): Pick<Beach, "slug" | "seaState" | "waveActionBaseline" | "coast"> {
  return {
    slug: b.slug,
    seaState: b.seaState,
    waveActionBaseline: b.waveActionBaseline,
    coast: b.coast
  };
}

function formatSargassumLevel(level: SargassumLevelForScore): string {
  return level === null ? "null" : level;
}

function formatNum(n: number, decimals: number): string {
  return n.toFixed(decimals);
}

export function ScoreLabClient({ beaches }: { beaches: ScoreLabBeach[] }) {
  const [selectedSlug, setSelectedSlug] = useState(beaches[0]?.slug ?? "");
  const [waveHeight, setWaveHeight] = useState(1.2);
  const [wavePeriod, setWavePeriod] = useState<number | null>(8);
  const [windSpeed, setWindSpeed] = useState(18);
  const [windDirectionDeg, setWindDirectionDeg] = useState(270);
  const [windDirectionNull, setWindDirectionNull] = useState(false);
  const [sargassumLevel, setSargassumLevel] = useState<SargassumLevelForScore>("low");
  const [sargassumMode, setSargassumMode] = useState<SargassumMode>("uniform");
  const [manualPerCoast, setManualPerCoast] =
    useState<Record<BeachCoast, SargassumLevelForScore>>(emptyPerCoastLevels);
  const [sargassumSource, setSargassumSource] = useState<"supabase" | "manual" | null>(null);
  const [sargassumByCoast, setSargassumByCoast] =
    useState<Record<BeachCoast, SargassumLevelForScore> | null>(null);
  const [sargassumMeta, setSargassumMeta] = useState<Record<BeachCoast, CoastSargassumMeta> | null>(
    null
  );
  const [sargassumLoadError, setSargassumLoadError] = useState<string | null>(null);
  const [sargassumLoading, setSargassumLoading] = useState(false);
  const [loadLiveUniformWarning, setLoadLiveUniformWarning] = useState(false);
  const [loadLivePerCoastNote, setLoadLivePerCoastNote] = useState<string | null>(null);
  const [tableCoastFilter, setTableCoastFilter] = useState<CoastFilter>("All");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortCoastAsc, setSortCoastAsc] = useState(true);
  const [sortScoreDesc, setSortScoreDesc] = useState(true);
  const [sortNameAsc, setSortNameAsc] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const selected = useMemo(
    () => beaches.find((b) => b.slug === selectedSlug) ?? beaches[0],
    [beaches, selectedSlug]
  );

  const windDirection = windDirectionNull ? null : windDirectionDeg;

  const perCoastLevels = useMemo((): Record<BeachCoast, SargassumLevelForScore> => {
    if (sargassumSource === "supabase" && sargassumByCoast) {
      return sargassumByCoast;
    }
    return manualPerCoast;
  }, [sargassumSource, sargassumByCoast, manualPerCoast]);

  const resolveSargassumForBeach = useCallback(
    (beach: ScoreLabBeach): SargassumLevelForScore => {
      if (sargassumMode === "uniform") {
        return sargassumLevel;
      }
      const zone = coastForSargassumLookup(beach);
      return perCoastLevels[zone];
    },
    [sargassumMode, sargassumLevel, perCoastLevels]
  );

  const refreshSargassum = useCallback(async () => {
    setSargassumLoading(true);
    setSargassumLoadError(null);
    try {
      const res = await loadSargassumLevelsForLab();
      if (!res.ok) {
        setSargassumLoadError(res.error);
        setSargassumSource("manual");
        setSargassumByCoast(null);
        setSargassumMeta(null);
        return res;
      }
      if (res.source === "supabase") {
        setSargassumSource("supabase");
        setSargassumByCoast(res.byCoast);
        setSargassumMeta(res.meta);
      } else {
        setSargassumSource("manual");
        setSargassumByCoast(null);
        setSargassumMeta(null);
        if (res.reason) {
          setSargassumLoadError(res.reason);
        }
      }
      return res;
    } finally {
      setSargassumLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sargassumMode === "per-coast" && sargassumSource === null) {
      void refreshSargassum();
    }
  }, [sargassumMode, sargassumSource, refreshSargassum]);

  const selectedSargassumLevel = useMemo(() => {
    if (!selected) return null;
    return resolveSargassumForBeach(selected);
  }, [selected, resolveSargassumForBeach]);

  const explain = useMemo(() => {
    if (!selected || selectedSargassumLevel === undefined) {
      return null;
    }
    return explainBeachScore(
      beachScorePick(selected),
      waveHeight,
      wavePeriod,
      windSpeed,
      windDirection,
      selectedSargassumLevel
    );
  }, [selected, waveHeight, wavePeriod, windSpeed, windDirection, selectedSargassumLevel]);

  const tableRows = useMemo(() => {
    const rows: TableRow[] = beaches.map((b) => {
      const appliedSargassum = resolveSargassumForBeach(b);
      const sargassumLookupCoast = coastForSargassumLookup(b);
      const zoneOverride = b.sargassumZone !== undefined && b.sargassumZone !== b.coast;
      const score = computeBeachScoreQuiet(
        beachScorePick(b),
        waveHeight,
        wavePeriod,
        windSpeed,
        windDirection,
        appliedSargassum
      );
      return {
        beach: b,
        score,
        label: activityLabel({ seaState: b.seaState }),
        appliedSargassum,
        sargassumLookupCoast,
        zoneOverride
      };
    });

    const searchLower = tableSearch.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (tableCoastFilter !== "All" && row.beach.coast !== tableCoastFilter) {
        return false;
      }
      if (searchLower !== "" && !row.beach.name.toLowerCase().includes(searchLower)) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "coast") {
        const c = a.beach.coast.localeCompare(b.beach.coast);
        if (c !== 0) return sortCoastAsc ? c : -c;
      } else if (sortKey === "name") {
        const n = a.beach.name.localeCompare(b.beach.name);
        if (n !== 0) return sortNameAsc ? n : -n;
        const as = a.score ?? -1;
        const bs = b.score ?? -1;
        if (as !== bs) return bs - as;
        return 0;
      } else {
        const as = a.score ?? -1;
        const bs = b.score ?? -1;
        if (as !== bs) return sortScoreDesc ? bs - as : as - bs;
      }
      return a.beach.name.localeCompare(b.beach.name);
    });
  }, [
    beaches,
    waveHeight,
    wavePeriod,
    windSpeed,
    windDirection,
    resolveSargassumForBeach,
    tableCoastFilter,
    tableSearch,
    sortKey,
    sortCoastAsc,
    sortScoreDesc,
    sortNameAsc
  ]);

  const copyScenario = useCallback(() => {
    if (!selected || !explain) return;
    const lookupCoast = coastForSargassumLookup(selected);
    const zoneNote =
      selected.sargassumZone !== undefined && selected.sargassumZone !== selected.coast
        ? ` (zone override: geographic ${selected.coast} → lookup ${lookupCoast})`
        : ` (lookup coast ${lookupCoast})`;
    const lines: string[] = [
      `Beach: ${selected.name} (${selected.slug})`,
      `Static: coast=${selected.coast}, seaState=${selected.seaState}, waveActionBaseline=${selected.waveActionBaseline}, isSurfSpot=${selected.isSurfSpot}`,
      `Sargassum mode: ${sargassumMode}`,
      `Sargassum level applied: ${formatSargassumLevel(selectedSargassumLevel)}${zoneNote}`,
      `Inputs: waveHeight_m=${waveHeight}, wavePeriod_s=${wavePeriod === null ? "null" : wavePeriod}, windSpeed_kmh=${windSpeed}, windDirection_deg=${windDirection === null ? "null" : windDirection}`,
      "",
      `Final score: ${explain.score === null ? "null" : explain.score}`,
      `Label: ${activityLabel({ seaState: selected.seaState })}`,
      "",
      "Breakdown (explainBeachScore):"
    ];
    for (const s of explain.steps) {
      lines.push(
        `${s.order}. [${s.kind}] ${s.title}` +
          (s.detail ? `\n   ${s.detail}` : "") +
          `\n   before=${s.valueBefore === null ? "null" : formatNum(s.valueBefore, 4)} after=${s.valueAfter === null ? "null" : formatNum(s.valueAfter, 4)}` +
          (s.delta !== undefined && s.delta !== null
            ? ` delta=${typeof s.delta === "number" ? formatNum(s.delta, 4) : String(s.delta)}`
            : "")
      );
    }
    void navigator.clipboard.writeText(lines.join("\n"));
  }, [
    selected,
    explain,
    selectedSargassumLevel,
    sargassumMode,
    waveHeight,
    wavePeriod,
    windSpeed,
    windDirection
  ]);

  const copyAllTable = useCallback(() => {
    const sargCol = sargassumMode === "per-coast";
    const header = sargCol
      ? "| Beach | Coast | Sea state | Wave baseline | Sargassum | Score | Label |\n|-------|-------|-----------|---------------|-----------|-------|-------|"
      : "| Beach | Coast | Sea state | Wave baseline | Score | Label |\n|-------|-------|-----------|---------------|-------|-------|";
    const body = tableRows
      .map((r) => {
        const sc = r.score === null ? "null" : String(r.score);
        const sargCell = `${formatSargassumLevel(r.appliedSargassum)}${r.zoneOverride ? " ↗zone" : ""}`;
        if (sargCol) {
          return `| ${r.beach.name} | ${r.beach.coast} | ${r.beach.seaState} | ${r.beach.waveActionBaseline} | ${sargCell} | ${sc} | ${r.label} |`;
        }
        return `| ${r.beach.name} | ${r.beach.coast} | ${r.beach.seaState} | ${r.beach.waveActionBaseline} | ${sc} | ${r.label} |`;
      })
      .join("\n");
    const sargassumPreamble =
      sargassumMode === "uniform"
        ? `Sargassum mode: uniform — level ${formatSargassumLevel(sargassumLevel)} applied to all beaches`
        : `Sargassum mode: per-coast (production) — source: ${sargassumSource === "supabase" ? "Supabase" : "manual entry"}`;
    const pre = [
      "## Score lab — all beaches",
      "",
      `Beaches: ${tableRows.length} of ${beaches.length}`,
      sargassumPreamble,
      `Inputs: waveHeight_m=${waveHeight}, wavePeriod_s=${wavePeriod === null ? "null" : wavePeriod}, windSpeed_kmh=${windSpeed}, windDirection_deg=${windDirection === null ? "null" : windDirection}`,
      "",
      header,
      body,
      ""
    ].join("\n");
    void navigator.clipboard.writeText(pre);
  }, [
    tableRows,
    beaches.length,
    sargassumMode,
    sargassumLevel,
    sargassumSource,
    waveHeight,
    wavePeriod,
    windSpeed,
    windDirection
  ]);

  const onLoadLive = async () => {
    if (!selected) return;
    setLiveError(null);
    setLoadLiveUniformWarning(false);
    setLoadLivePerCoastNote(null);
    setLiveLoading(true);
    try {
      const res = await loadLiveBeachConditions(selected.slug);
      if (!res.ok) {
        setLiveError(res.error);
        return;
      }
      if (res.waveHeight !== null && !Number.isNaN(res.waveHeight)) {
        setWaveHeight(res.waveHeight);
      }
      if (res.wavePeriod !== null && !Number.isNaN(res.wavePeriod)) {
        setWavePeriod(res.wavePeriod);
      }
      if (res.windSpeed !== null && !Number.isNaN(res.windSpeed)) {
        setWindSpeed(Math.min(120, Math.max(0, res.windSpeed)));
      }
      if (res.windDirection !== null && !Number.isNaN(res.windDirection)) {
        const d = ((res.windDirection % 360) + 360) % 360;
        setWindDirectionDeg(d);
        setWindDirectionNull(false);
      }

      if (sargassumMode === "uniform") {
        setLoadLiveUniformWarning(true);
      } else {
        const sargRes = await refreshSargassum();
        const zone = coastForSargassumLookup(selected);
        let level: SargassumLevelForScore;
        let src: string;
        if (sargRes?.ok && sargRes.source === "supabase") {
          level = sargRes.byCoast[zone];
          src = "Supabase";
        } else {
          level = manualPerCoast[zone];
          src = "manual";
        }
        setLoadLivePerCoastNote(
          `Sargassum applied: ${formatSargassumLevel(level)} from ${zone} zone (${src})` +
            (selected.sargassumZone !== undefined && selected.sargassumZone !== selected.coast
              ? ` — geographic coast ${selected.coast}, zone override → ${zone}`
              : "")
        );
      }
    } finally {
      setLiveLoading(false);
    }
  };

  if (!selected || !explain) {
    return <p className="p-6 text-zinc-400">No beaches loaded.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6">
      <header className="space-y-1 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-semibold text-white">Score lab</h1>
        <p className="text-sm text-zinc-400">
          Development-only calibration bench · {beaches.length} beaches · scoring from{" "}
          <code className="text-zinc-300">computeBeachScore</code> /{" "}
          <code className="text-zinc-300">explainBeachScore</code>
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-lg font-medium text-white">Single beach</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Beach</span>
            <select
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-zinc-100"
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
            >
              {beaches.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
            <div className="font-medium text-zinc-200">Static attributes</div>
            <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
              <dt className="text-zinc-500">Coast</dt>
              <dd>{selected.coast}</dd>
              <dt className="text-zinc-500">Sea state</dt>
              <dd>{selected.seaState}</dd>
              <dt className="text-zinc-500">Wave baseline</dt>
              <dd>{selected.waveActionBaseline}</dd>
              <dt className="text-zinc-500">Surf spot</dt>
              <dd>{selected.isSurfSpot ? "yes" : "no"}</dd>
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
            disabled={liveLoading}
            onClick={() => void onLoadLive()}
          >
            {liveLoading ? "Loading live…" : "Load live conditions"}
          </button>
          {liveError ? <span className="text-sm text-red-400">{liveError}</span> : null}
        </div>
        {loadLiveUniformWarning ? (
          <p className="rounded border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
            Wave and wind were loaded from Open-Meteo, but sargassum is still your uniform manual value (
            {formatSargassumLevel(sargassumLevel)}). This score will <strong>not</strong> match production until
            you switch to Per-coast (production) sargassum mode.
          </p>
        ) : null}
        {loadLivePerCoastNote ? (
          <p className="text-sm text-emerald-400/90">{loadLivePerCoastNote}</p>
        ) : null}

        <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
          <div className="font-medium text-zinc-200">Sargassum mode</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded px-3 py-1.5 ${sargassumMode === "uniform" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
              onClick={() => {
                setSargassumMode("uniform");
                setLoadLiveUniformWarning(false);
                setLoadLivePerCoastNote(null);
              }}
            >
              Uniform scenario
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1.5 ${sargassumMode === "per-coast" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
              onClick={() => setSargassumMode("per-coast")}
            >
              Per-coast (production)
            </button>
          </div>

          {sargassumMode === "uniform" ? (
            <label className="block space-y-1">
              <span className="text-zinc-400">Sargassum level (all beaches)</span>
              <select
                className="w-full max-w-xs rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-zinc-100"
                value={sargassumLevel === null ? "null" : sargassumLevel}
                onChange={(e) => {
                  const v = e.target.value;
                  setSargassumLevel(v === "null" ? null : (v as SargassumLevelForScore));
                }}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="null">null</option>
              </select>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-400">
                  Data source:{" "}
                  <span className="text-zinc-200">
                    {sargassumSource === null
                      ? "loading…"
                      : sargassumSource === "supabase"
                        ? "Supabase (live)"
                        : "Manual entry"}
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                  disabled={sargassumLoading}
                  onClick={() => void refreshSargassum()}
                >
                  {sargassumLoading ? "Refreshing…" : "Refresh from Supabase"}
                </button>
              </div>
              {sargassumLoadError ? (
                <p className="text-xs text-amber-300/90">{sargassumLoadError}</p>
              ) : null}

              {sargassumSource === "supabase" && sargassumMeta ? (
                <ul className="space-y-1 font-mono text-xs text-zinc-400">
                  {ALL_COASTS.map((coast) => {
                    const m = sargassumMeta[coast];
                    const statusLabel =
                      m.status === "ok"
                        ? `${formatSargassumLevel(m.levelForScore)} (row ${m.rowLevel}, updated ${m.updatedAt ?? "?"})`
                        : m.status === "stale"
                          ? `stale — row was ${m.rowLevel ?? "?"} (${m.updatedAt ?? "?"}); scoring as null`
                          : "unavailable — no row; scoring as null";
                    return (
                      <li key={coast}>
                        <span className="text-zinc-300">{coast}:</span> {statusLabel}
                      </li>
                    );
                  })}
                </ul>
              ) : sargassumSource === "manual" ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ALL_COASTS.map((coast) => (
                    <label key={coast} className="block space-y-1 text-xs">
                      <span className="text-zinc-500">{coast}</span>
                      <select
                        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                        value={manualPerCoast[coast] === null ? "null" : manualPerCoast[coast]}
                        onChange={(e) => {
                          const v = e.target.value;
                          setManualPerCoast((prev) => ({
                            ...prev,
                            [coast]: v === "null" ? null : (v as SargassumLevelForScore)
                          }));
                        }}
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                        <option value="null">null</option>
                      </select>
                    </label>
                  ))}
                </div>
              ) : null}

              {selected && selectedSargassumLevel !== undefined ? (
                <p className="text-zinc-300">
                  Selected beach: <span className="font-mono">{formatSargassumLevel(selectedSargassumLevel)}</span>{" "}
                  via {coastForSargassumLookup(selected)} zone
                  {selected.sargassumZone !== undefined && selected.sargassumZone !== selected.coast
                    ? ` (↗zone: geographic ${selected.coast})`
                    : ""}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SliderField
            label="Combined wave height (m)"
            min={0}
            max={6}
            step={0.05}
            value={waveHeight}
            onChange={setWaveHeight}
          />
          <div className="space-y-1 text-sm">
            <span className="text-zinc-400">Wave period (s)</span>
            <div className="flex gap-2">
              <input
                type="range"
                className="flex-1"
                min={0}
                max={20}
                step={0.1}
                value={wavePeriod === null ? 0 : wavePeriod}
                onChange={(e) => setWavePeriod(Number(e.target.value))}
              />
              <input
                type="number"
                className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                value={wavePeriod === null ? "" : wavePeriod}
                placeholder="null"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setWavePeriod(null);
                  else setWavePeriod(Number(v));
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={wavePeriod === null}
                onChange={() => setWavePeriod((p) => (p === null ? 0 : null))}
              />
              Period is null
            </label>
          </div>
          <SliderField
            label="Wind speed (km/h)"
            min={0}
            max={120}
            step={1}
            value={windSpeed}
            onChange={setWindSpeed}
          />
          <div className="space-y-1 text-sm">
            <span className="text-zinc-400">Wind direction (° FROM, meteorological)</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                className="min-w-[140px] flex-1"
                disabled={windDirectionNull}
                value={windDirectionDeg}
                onChange={(e) => setWindDirectionDeg(Number(e.target.value))}
              />
              <input
                type="number"
                className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 disabled:opacity-40"
                disabled={windDirectionNull}
                value={windDirectionNull ? "" : windDirectionDeg}
                onChange={(e) => setWindDirectionDeg(Number(e.target.value) % 360)}
              />
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={windDirectionNull}
                  onChange={(e) => setWindDirectionNull(e.target.checked)}
                />
                null
              </label>
            </div>
          </div>
        </div>

        <div className="rounded border border-zinc-700 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">Live output</div>
          <div className="mt-1 text-3xl font-semibold text-white">
            Score: {explain.score === null ? "—" : explain.score}{" "}
            <span className="text-xl font-normal text-sky-400">
              ({activityLabel({ seaState: selected.seaState })})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={copyScenario}
          >
            Copy scenario
          </button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-300">Term-by-term breakdown</h3>
          <ol className="space-y-2 text-sm">
            {explain.steps.map((s) => (
              <li
                key={s.order}
                className="rounded border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-300"
              >
                <span className="text-zinc-500">{s.order}.</span>{" "}
                <span className="text-sky-400/90">{s.kind}</span> — {s.title}
                {s.detail ? <div className="mt-1 whitespace-pre-wrap text-zinc-400">{s.detail}</div> : null}
                <div className="mt-1 text-zinc-500">
                  before={s.valueBefore === null ? "null" : formatNum(s.valueBefore, 4)} → after=
                  {s.valueAfter === null ? "null" : formatNum(s.valueAfter, 4)}
                  {s.delta !== undefined && s.delta !== null && typeof s.delta === "number" && s.delta !== 0
                    ? ` (Δ ${formatNum(s.delta, 4)})`
                    : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-medium text-white">All beaches — same scenario</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              className={`rounded px-2 py-1 ${sortKey === "score" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
              onClick={() => {
                setSortKey("score");
                setSortScoreDesc((d) => !d);
              }}
            >
              Sort by score {sortKey === "score" ? (sortScoreDesc ? "↓" : "↑") : ""}
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 ${sortKey === "coast" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
              onClick={() => {
                setSortKey("coast");
                setSortCoastAsc((d) => !d);
              }}
            >
              Sort by coast {sortKey === "coast" ? (sortCoastAsc ? "A→Z" : "Z→A") : ""}
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 ${sortKey === "name" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
              onClick={() => {
                setSortKey("name");
                setSortNameAsc((d) => !d);
              }}
            >
              Name (A–Z) {sortKey === "name" ? (sortNameAsc ? "A→Z" : "Z→A") : ""}
            </button>
            <button
              type="button"
              className="rounded border border-zinc-600 px-2 py-1 text-zinc-200 hover:bg-zinc-800"
              onClick={copyAllTable}
            >
              Copy all beaches (markdown)
            </button>
          </div>
        </div>

        <CoastPills
          activeCoast={tableCoastFilter}
          onChange={setTableCoastFilter}
          className="my-4 justify-start"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="block min-w-[200px] flex-1 text-sm">
            <span className="sr-only">Search beaches by name</span>
            <input
              type="search"
              placeholder="Search beaches…"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full max-w-md rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
            />
          </label>
          <p className="text-sm text-zinc-400">
            Showing {tableRows.length} of {beaches.length}
          </p>
        </div>

        {tableRows.length === 0 ? (
          <p className="text-sm text-zinc-500">No beaches match</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Coast</th>
                  <th className="py-2 pr-2">Sea state</th>
                  <th className="py-2 pr-2">Wave baseline</th>
                  {sargassumMode === "per-coast" ? <th className="py-2 pr-2">Sargassum</th> : null}
                  <th className="py-2 pr-2">Score</th>
                  <th className="py-2">Label</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.beach.slug} className="border-b border-zinc-800/80 hover:bg-zinc-800/40">
                    <td className="py-1.5 pr-2 text-zinc-200">{r.beach.name}</td>
                    <td className="py-1.5 pr-2">{r.beach.coast}</td>
                    <td className="py-1.5 pr-2">{r.beach.seaState}</td>
                    <td className="py-1.5 pr-2">{r.beach.waveActionBaseline}</td>
                    {sargassumMode === "per-coast" ? (
                      <td className="py-1.5 pr-2 font-mono text-zinc-300">
                        {formatSargassumLevel(r.appliedSargassum)}
                        {r.zoneOverride ? (
                          <span className="ml-1 text-xs text-amber-400/90" title={`Lookup zone: ${r.sargassumLookupCoast}`}>
                            ↗zone
                          </span>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="py-1.5 pr-2 font-mono">{r.score === null ? "—" : r.score}</td>
                    <td className="py-1.5 text-sky-400/90">{r.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SliderField(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  const { label, min, max, step, value, onChange } = props;
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-zinc-400">{label}</span>
      <div className="flex gap-2">
        <input
          type="range"
          className="flex-1"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          type="number"
          className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          min={min}
          max={max}
          step={step}
          value={Number.isNaN(value) ? 0 : value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </label>
  );
}
