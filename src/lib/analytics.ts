/** GA4 custom-event params (string-safe for Measurement Protocol–style payloads). */
export type AnalyticsEventParams = Record<string, string | number | boolean>;

/**
 * Fire-and-forget GA4 custom event. Fully synchronous; never throws.
 * In development, or when `gtag` is missing, logs to the console for local verification.
 */
export function trackEvent(name: string, params?: AnalyticsEventParams): void {
  try {
    if (typeof window === "undefined") {
      return;
    }

    const payload = params ?? {};
    const gtagFn = window.gtag;
    const shouldLog =
      process.env.NODE_ENV !== "production" || typeof gtagFn !== "function";

    if (shouldLog) {
      console.log("[analytics]", name, payload);
    }

    if (typeof gtagFn === "function") {
      try {
        gtagFn("event", name, payload);
      } catch {
        /* malformed payload or gtag internal error — do not surface */
      }
    }
  } catch {
    /* never throw */
  }
}
