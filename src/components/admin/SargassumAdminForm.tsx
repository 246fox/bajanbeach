"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { BeachCoast } from "@/types/beach";
import type { SargassumRow } from "@/lib/sargassum";
import { logoutAdmin } from "@/app/admin/actions";
import { saveSargassumLevels } from "@/app/admin/sargassum/actions";

const COASTS: BeachCoast[] = ["North", "West", "South", "Southeast", "East"];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-ocean-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ocean-600 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function SargassumAdminForm({
  initialByCoast
}: {
  initialByCoast: Record<BeachCoast, SargassumRow | null>;
}) {
  const [state, formAction] = useFormState(saveSargassumLevels, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Sargassum (coast levels)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Updates all five coasts in one save. Sets source to <code className="text-xs">manual</code>.
          </p>
        </div>
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Log out
          </button>
        </form>
      </div>

      {state?.error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {state.error}
        </div>
      )}

      <form id="sargassum-form" action={formAction} className="mt-8 space-y-8">
        {COASTS.map((coast) => {
          const row = initialByCoast[coast];
          const defaultLevel = row?.level ?? "low";
          const defaultNotes = row?.notes ?? "";

          return (
            <div
              key={coast}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-800">{coast} coast</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Level</span>
                  <select
                    name={`level_${coast}`}
                    defaultValue={defaultLevel}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Notes (optional)</span>
                  <textarea
                    name={`notes_${coast}`}
                    rows={2}
                    defaultValue={defaultNotes}
                    placeholder="Internal notes"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
                  />
                </label>
              </div>
              {row?.updated_at && (
                <p className="mt-3 text-xs text-slate-500">
                  Last saved: {new Date(row.updated_at).toLocaleString("en-US", { timeZone: "America/Barbados" })}{" "}
                  AST
                  {row.source && ` · source: ${row.source}`}
                </p>
              )}
            </div>
          );
        })}

        <div className="flex justify-end border-t border-slate-200 pt-6">
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
