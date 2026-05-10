"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAdmin, type LoginState } from "@/app/admin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ocean-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ocean-600 disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAdmin, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <label className="block">
        <span className="sr-only">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 shadow-sm focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-400/30"
        />
      </label>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
