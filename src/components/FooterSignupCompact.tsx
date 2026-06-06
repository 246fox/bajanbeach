"use client";

import { useId, useState } from "react";

const INPUT_CLASS =
  "w-full rounded-2xl border border-ocean-100/80 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-400/35";

const SUBMIT_CLASS =
  "shrink-0 rounded-xl bg-ocean-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ocean-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

type Phase = "idle" | "submitting" | "success" | "error";

export function FooterSignupCompact() {
  const baseId = useId();
  const emailFieldId = `${baseId}-email`;
  const errorId = `${baseId}-error`;

  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website })
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setPhase("error");
        setErrorMessage("Something went wrong. Please try again.");
        return;
      }

      const payload = data as { ok?: boolean; alreadySubscribed?: boolean; error?: string };

      if (res.ok && payload.ok === true) {
        setAlreadySubscribed(payload.alreadySubscribed === true);
        setPhase("success");
        return;
      }

      const msg =
        typeof payload.error === "string" && payload.error.trim() !== ""
          ? payload.error
          : "Something went wrong. Please try again.";
      setPhase("error");
      setErrorMessage(msg);
    } catch {
      setPhase("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  if (phase === "success") {
    return (
      <div className="mb-6 text-center">
        <p className="m-0 text-sm leading-relaxed text-slate-700">
          {alreadySubscribed
            ? "You're already on the list. We'll be in touch when there's something new."
            : "You're on the list. We'll be in touch when there's something new."}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="m-0 text-center text-xs text-slate-500">Get occasional updates on new beaches and features.</p>
      <form
        className="mx-auto mt-2 flex max-w-md flex-col gap-2 sm:mx-auto sm:flex-row sm:items-stretch sm:justify-center"
        onSubmit={handleSubmit}
        noValidate
      >
        <label htmlFor={emailFieldId} className="sr-only">
          Email for updates
        </label>
        <input
          id={emailFieldId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`min-w-0 flex-1 ${INPUT_CLASS}`}
          placeholder="you@example.com"
          aria-invalid={phase === "error"}
          aria-describedby={phase === "error" && errorMessage ? errorId : undefined}
          disabled={phase === "submitting"}
        />
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
        />
        <button type="submit" className={SUBMIT_CLASS} disabled={phase === "submitting"}>
          Get updates
        </button>
      </form>
      {phase === "error" && errorMessage ? (
        <p id={errorId} className="mt-2 text-center text-sm text-rose-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
