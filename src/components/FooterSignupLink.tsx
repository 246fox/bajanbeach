"use client";

import { useId, useState } from "react";

const INPUT_CLASS =
  "w-full rounded-2xl border border-ocean-100/80 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-400/35";

const LINK_LIKE_CLASS =
  "text-sm font-medium text-ocean-700 transition hover:text-ocean-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2";

const SUBMIT_CLASS =
  "shrink-0 rounded-xl bg-ocean-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ocean-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

type Phase = "idle" | "submitting" | "success" | "error";

export function FooterSignupLink() {
  const baseId = useId();
  const emailFieldId = `${baseId}-email`;
  const errorId = `${baseId}-error`;

  const [expanded, setExpanded] = useState(false);
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
      <div className="mx-auto mb-6 max-w-md text-left">
        <p className="m-0 text-sm leading-relaxed text-slate-700">
          {alreadySubscribed
            ? "You're already on the list. We'll be in touch when there's something new."
            : "You're on the list. We'll be in touch when there's something new."}
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="mb-6 text-center">
        <button type="button" className={LINK_LIKE_CLASS} onClick={() => setExpanded(true)}>
          Get updates
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-6 max-w-md text-left">
      <p className="m-0 text-sm leading-relaxed text-slate-600">Get occasional updates on new beaches and features.</p>
      <form className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch" onSubmit={handleSubmit} noValidate>
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
        <p id={errorId} className="mt-2 text-sm text-rose-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
