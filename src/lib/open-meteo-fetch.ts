export type OpenMeteoFetchOptions = {
  timeoutMs?: number;
  /** Retries after the first attempt (1 = two attempts total). */
  retries?: number;
  backoffMs?: number;
  revalidate?: number;
};

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_RETRIES = 1;
const DEFAULT_BACKOFF_MS = 750;
const DEFAULT_REVALIDATE = 3600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Bounded-timeout fetch for Open-Meteo with retry on non-OK or network/abort errors.
 * Returns null after all attempts fail. Never throws.
 */
export async function openMeteoFetch(
  url: string,
  opts?: OpenMeteoFetchOptions
): Promise<Response | null> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts?.retries ?? DEFAULT_RETRIES;
  const backoffMs = opts?.backoffMs ?? DEFAULT_BACKOFF_MS;
  const revalidate = opts?.revalidate ?? DEFAULT_REVALIDATE;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        next: { revalidate }
      });

      if (response.ok) {
        return response;
      }

      if (attempt < retries) {
        await sleep(backoffMs);
        continue;
      }

      console.error("[open-meteo-fetch] Non-OK response after retries", {
        url,
        status: response.status,
        statusText: response.statusText,
        attempts: attempt + 1
      });
      return null;
    } catch (err) {
      if (attempt < retries) {
        await sleep(backoffMs);
        continue;
      }

      console.error("[open-meteo-fetch] Fetch failed after retries", {
        url,
        message: err instanceof Error ? err.message : "Unknown error",
        attempts: attempt + 1
      });
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
