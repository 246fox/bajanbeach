# Sargassum data — future automation (not implemented)

Today, **BajanBeach** uses **manual coast-level** entries stored in Supabase (`source = manual`). This keeps operations sustainable until traffic justifies automation.

## Stage 2 directions (for later)

### 1. Satellite / model ingestion (e.g. Copernicus Marine)

- Copernicus Marine floating-algae / sargassum products can provide **gridded indices** over the Caribbean.
- A scheduled job would subset NetCDF (or API-backed subsets), aggregate by **predefined polygons** offshore of each Barbados coast, map values to `low` / `medium` / `high`, and upsert rows with `source = copernicus` (or similar) and optional `confidence`.

**Tradeoffs:** credentials, parsing, threshold tuning, and serverless time limits — expect a dedicated worker or batch job.

### 2. AI vision from webcams

- Where we already have **webcam URLs**, a future pipeline could **sample frames**, run a lightweight classifier for brown algae / beach coverage, and produce a **coast-aggregated or beach-level** signal.
- Store `source = ai-vision`, set **`confidence`** in `0.0–1.0`, and keep **manual override** when the model is uncertain.

**Tradeoffs:** consent/host terms for streams, compute cost, daylight-only imagery, and calibration against ground truth.

### Schema groundwork

The `sargassum_levels` table already includes optional **`source`** and **`confidence`** so automated pipelines can coexist with manual updates without a migration.
