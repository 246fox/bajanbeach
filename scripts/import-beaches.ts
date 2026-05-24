/**
 * Import description, bestFor, notes, webcamUrl from BajanBeach_Master_List.xlsx into batch TS files.
 * Run: npm run beaches:import
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import util from "node:util";
import ExcelJS from "exceljs";
import type { ObjectLiteralExpression, StringLiteral } from "ts-morph";
import { Node, Project } from "ts-morph";

import { beaches } from "../src/data/beaches";

const XLSX_FILE = "BajanBeach_Master_List.xlsx";

/** Must match scripts/export-beaches.ts exactly. */
const HEADERS = [
  "slug",
  "name",
  "parish",
  "coast",
  "seaState",
  "waveActionBaseline",
  "isSurfSpot",
  "latitude",
  "longitude",
  "description",
  "bestFor",
  "notes",
  "webcamUrl",
  "Reviewed?",
  "Claude follow-up"
] as const;

const COL = {
  slug: 1,
  description: 10,
  bestFor: 11,
  notes: 12,
  webcamUrl: 13,
  reviewed: 14,
  claude: 15
} as const;

/** Beaches that carry a webcam URL in TS at HEAD (sanity check after hyperlink bug). */
const WEBCAM_SANITY_SLUGS = [
  "bathsheba-beach",
  "batts-rock-beach",
  "brandons-beach",
  "brighton-beach",
  "brownes-beach",
  "carlisle-bay",
  "dover-beach",
  "enterprise-beach",
  "gibbes-beach",
  "maxwell-beach",
  "miami-beach",
  "pebbles-beach",
  "rockley-beach",
  "soup-bowl",
  "st-lawrence-beach",
  "tent-bay",
  "worthing-beach"
] as const;

const EDITABLE_FIELDS = ["description", "bestFor", "notes", "webcamUrl"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

const BEACH_BATCHES = [
  { varName: "beachBatch01", relPath: "src/data/batches/beach-batch-01.ts" },
  { varName: "beachBatch02", relPath: "src/data/batches/beach-batch-02.ts" },
  { varName: "beachBatch03", relPath: "src/data/batches/beach-batch-03.ts" },
  { varName: "beachBatch04", relPath: "src/data/batches/beach-batch-04.ts" },
  { varName: "beachBatch05", relPath: "src/data/batches/beach-batch-05.ts" },
  { varName: "beachBatch06", relPath: "src/data/batches/beach-batch-06.ts" },
  { varName: "beachBatch07", relPath: "src/data/batches/beach-batch-07.ts" }
] as const;

function normalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export type CellToStringMeta = {
  row: number;
  column: string;
  slug?: string;
};

function cellToString(cell: ExcelJS.Cell, meta: CellToStringMeta): string {
  const v = cell.value;
  const slugPart = meta.slug ? ` (slug: ${meta.slug})` : "";
  const loc = `row ${meta.row}, column '${meta.column}'${slugPart}`;

  if (v === null || v === undefined) {
    return "";
  }
  if (typeof v === "string") {
    return v.trim();
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  if (typeof v !== "object") {
    throw new Error(`Unhandled exceljs cell.value typeof at ${loc}: ${typeof v}`);
  }

  const o = v as Record<string, unknown>;

  if ("hyperlink" in o && o.hyperlink != null) {
    const h = String(o.hyperlink).trim();
    if (h !== "") {
      return h;
    }
  }

  if ("text" in o && typeof o.text === "string") {
    return o.text.trim();
  }

  if (Array.isArray(o.richText)) {
    return (o.richText as { text: string }[]).map((x) => x.text).join("");
  }

  if ("formula" in o && typeof o.formula === "string") {
    if (o.result !== undefined && o.result !== null) {
      const r = o.result;
      if (typeof r === "string") {
        return r.trim();
      }
      if (typeof r === "number" || typeof r === "boolean") {
        return String(r);
      }
      if (r instanceof Date) {
        return r.toISOString();
      }
      if (typeof r === "object" && r !== null && "error" in r) {
        return String((r as { error: string }).error);
      }
    }
    throw new Error(
      `Formula cell at ${loc}: no cached result — re-save the spreadsheet in Excel with calculations enabled, or remove the formula.`
    );
  }

  if ("sharedFormula" in o && typeof o.sharedFormula === "string") {
    if (o.result !== undefined && o.result !== null) {
      const r = o.result;
      if (typeof r === "string") {
        return r.trim();
      }
      if (typeof r === "number" || typeof r === "boolean") {
        return String(r);
      }
      if (r instanceof Date) {
        return r.toISOString();
      }
      if (typeof r === "object" && r !== null && "error" in r) {
        return String((r as { error: string }).error);
      }
    }
    throw new Error(
      `Shared-formula cell at ${loc}: no cached result — re-save the spreadsheet in Excel with calculations enabled, or remove the formula.`
    );
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(v);
  } catch {
    serialized = util.inspect(v, { depth: 4 });
  }
  throw new Error(`Unhandled exceljs cell.value shape at ${loc}: ${serialized}`);
}

async function runWebcamSanity(): Promise<void> {
  const xlsxPath = path.join(process.cwd(), XLSX_FILE);
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Missing spreadsheet: ${xlsxPath}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const sheet = workbook.getWorksheet("Beaches");
  if (!sheet) {
    throw new Error('Worksheet "Beaches" not found.');
  }
  const bySlug = new Map<string, string>();
  const max = sheet.lastRow?.number ?? 0;
  for (let r = 2; r <= max; r += 1) {
    const row = sheet.getRow(r);
    const slug = cellToString(row.getCell(COL.slug), { row: r, column: "slug" }).trim();
    if (!slug) {
      continue;
    }
    bySlug.set(slug, cellToString(row.getCell(COL.webcamUrl), { row: r, column: "webcamUrl", slug }));
  }
  for (const slug of WEBCAM_SANITY_SLUGS) {
    const url = bySlug.get(slug);
    if (url === undefined) {
      throw new Error(`Sanity: row not found for slug ${slug}`);
    }
    if (url === "") {
      throw new Error(`Sanity: webcamUrl is empty for ${slug}`);
    }
    console.log(`${slug} → ${url}`);
  }
}

type SheetRow = {
  rowNumber: number;
  slug: string;
  description: string;
  bestFor: string;
  notes: string;
  webcamUrl: string;
  reviewedRaw: string;
  claudeRaw: string;
};

type SlugObjectEntry = {
  relPath: string;
  objectLiteral: ObjectLiteralExpression;
};

function getStringLiteralProperty(
  obj: ObjectLiteralExpression,
  name: EditableField | "slug"
): StringLiteral | undefined {
  const prop = obj.getProperty(name);
  if (!prop || !Node.isPropertyAssignment(prop)) {
    return undefined;
  }
  const init = prop.getInitializer();
  if (!init || !Node.isStringLiteral(init)) {
    return undefined;
  }
  return init;
}

function readSheetRows(sheet: ExcelJS.Worksheet): SheetRow[] {
  const rows: SheetRow[] = [];
  const max = sheet.lastRow?.number ?? 0;
  for (let r = 2; r <= max; r += 1) {
    const row = sheet.getRow(r);
    const slug = cellToString(row.getCell(COL.slug), { row: r, column: "slug" }).trim();
    if (!slug) {
      continue;
    }
    rows.push({
      rowNumber: r,
      slug,
      description: cellToString(row.getCell(COL.description), { row: r, column: "description", slug }),
      bestFor: cellToString(row.getCell(COL.bestFor), { row: r, column: "bestFor", slug }),
      notes: cellToString(row.getCell(COL.notes), { row: r, column: "notes", slug }),
      webcamUrl: cellToString(row.getCell(COL.webcamUrl), { row: r, column: "webcamUrl", slug }),
      reviewedRaw: cellToString(row.getCell(COL.reviewed), { row: r, column: "Reviewed?", slug }).trim(),
      claudeRaw: cellToString(row.getCell(COL.claude), { row: r, column: "Claude follow-up", slug }).trim()
    });
  }
  return rows;
}

async function main() {
  const root = process.cwd();
  const xlsxPath = path.join(root, XLSX_FILE);

  const abortErrors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(xlsxPath)) {
    console.error(`Missing spreadsheet: ${xlsxPath}`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const sheet = workbook.getWorksheet("Beaches");
  if (!sheet) {
    console.error('Worksheet "Beaches" not found.');
    process.exit(1);
  }

  const headerRow = sheet.getRow(1);
  for (let c = 1; c <= HEADERS.length; c += 1) {
    const expected = HEADERS[c - 1];
    const actual = cellToString(headerRow.getCell(c), { row: 1, column: expected }).trim();
    if (actual !== expected) {
      abortErrors.push(`Header column ${c}: expected "${expected}", got "${actual}"`);
    }
  }

  const sheetRows = readSheetRows(sheet);

  if (sheetRows.length !== beaches.length) {
    abortErrors.push(
      `Row count mismatch: spreadsheet has ${sheetRows.length} data rows with non-empty slug, canonical beaches.length is ${beaches.length}`
    );
  }

  const canonicalSlugs = new Set(beaches.map((b) => b.slug));

  const sheetSlugs = sheetRows.map((r) => r.slug);
  const slugCounts = new Map<string, number>();
  for (const s of sheetSlugs) {
    slugCounts.set(s, (slugCounts.get(s) ?? 0) + 1);
  }
  const duplicates = [...slugCounts.entries()].filter(([, n]) => n > 1).map(([s]) => s);
  if (duplicates.length > 0) {
    abortErrors.push(`Duplicate slug(s) in spreadsheet: ${duplicates.join(", ")}`);
  }

  const unknownSlugs = sheetSlugs.filter((s) => !canonicalSlugs.has(s));
  if (unknownSlugs.length > 0) {
    abortErrors.push(`Unknown slug(s) not in canonical list: ${unknownSlugs.join(", ")}`);
  }

  const sheetSlugSet = new Set(sheetSlugs);
  const missingFromSheet = [...canonicalSlugs].filter((s) => !sheetSlugSet.has(s));
  if (missingFromSheet.length > 0) {
    abortErrors.push(`Missing slug(s) from spreadsheet: ${missingFromSheet.join(", ")}`);
  }

  const badCells: string[] = [];
  for (const row of sheetRows) {
    for (const field of ["description", "bestFor", "notes"] as const) {
      const raw = row[field];
      if (normalizeNewlines(raw).trim() === "") {
        badCells.push(`${row.slug} (${field}): must be non-empty`);
      }
    }
  }
  if (badCells.length > 0) {
    abortErrors.push(...badCells.map((b) => `Editable validation: ${b}`));
  }

  for (const row of sheetRows) {
    const r = row.reviewedRaw;
    if (r === "" || (r !== "Yes" && r !== "No")) {
      warnings.push(`Reviewed? row ${row.rowNumber} (${row.slug}): empty or not Yes/No (got "${r}")`);
    }
    if (row.claudeRaw !== "") {
      warnings.push(`Claude follow-up (${row.slug}): ${row.claudeRaw}`);
    }
  }

  const project = new Project({
    tsConfigFilePath: path.join(root, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true
  });

  for (const { relPath } of BEACH_BATCHES) {
    project.addSourceFileAtPath(path.join(root, relPath));
  }

  const slugToObject = new Map<string, SlugObjectEntry>();
  const astNonLiteral: string[] = [];

  for (const { varName, relPath } of BEACH_BATCHES) {
    const sf = project.getSourceFileOrThrow(path.join(root, relPath));
    const decl = sf.getVariableDeclarationOrThrow(varName);
    const init = decl.getInitializer();
    if (!init || !Node.isArrayLiteralExpression(init)) {
      astNonLiteral.push(`${relPath}: ${varName} initializer is not an array literal`);
      continue;
    }
    for (const el of init.getElements()) {
      if (!Node.isObjectLiteralExpression(el)) {
        astNonLiteral.push(`${relPath}: non-object element in ${varName}`);
        continue;
      }
      const slugLit = getStringLiteralProperty(el, "slug");
      if (!slugLit) {
        astNonLiteral.push(`${relPath}: missing or non-string-literal slug`);
        continue;
      }
      const slug = slugLit.getLiteralValue();
      if (slugToObject.has(slug)) {
        astNonLiteral.push(`Duplicate slug in TS sources: ${slug}`);
        continue;
      }
      slugToObject.set(slug, { relPath, objectLiteral: el });

      for (const field of EDITABLE_FIELDS) {
        const lit = getStringLiteralProperty(el, field);
        if (!lit) {
          astNonLiteral.push(`${slug}.${field}: not a string literal (cannot import safely)`);
        }
      }
    }
  }

  if (slugToObject.size !== beaches.length) {
    abortErrors.push(
      `AST index size ${slugToObject.size} !== beaches.length ${beaches.length} (missing beach objects in batch files?)`
    );
  }

  if (astNonLiteral.length > 0) {
    abortErrors.push(...astNonLiteral.map((m) => `AST preflight: ${m}`));
  }

  if (abortErrors.length > 0) {
    console.error("Import aborted. Fix the following:\n");
    for (const e of abortErrors) {
      console.error(`- ${e}`);
    }
    if (warnings.length > 0) {
      console.error("\nWarnings (informational):\n");
      for (const w of warnings) {
        console.error(`- ${w}`);
      }
    }
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("Warnings:\n");
    for (const w of warnings) {
      console.warn(`- ${w}`);
    }
    console.warn("");
  }

  const sheetBySlug = new Map(sheetRows.map((r) => [r.slug, r]));

  type Change = { slug: string; field: EditableField };
  const changes: Change[] = [];

  for (const beach of beaches) {
    const row = sheetBySlug.get(beach.slug);
    if (!row) {
      continue;
    }
    const pairs: [EditableField, string, string][] = [
      ["description", beach.description, row.description],
      ["bestFor", beach.bestFor, row.bestFor],
      ["notes", beach.notes, row.notes],
      ["webcamUrl", beach.webcamUrl, row.webcamUrl]
    ];
    for (const [field, tsVal, xVal] of pairs) {
      if (normalizeNewlines(tsVal) !== normalizeNewlines(xVal)) {
        changes.push({ slug: beach.slug, field });
      }
    }
  }

  if (changes.length === 0) {
    console.log("No changes (spreadsheet matches TS after newline normalization).");
    process.exit(0);
  }

  const byField: Record<EditableField, number> = {
    description: 0,
    bestFor: 0,
    notes: 0,
    webcamUrl: 0
  };
  const bySlug = new Map<string, EditableField[]>();

  for (const { slug, field } of changes) {
    byField[field] += 1;
    const arr = bySlug.get(slug) ?? [];
    arr.push(field);
    bySlug.set(slug, arr);
  }

  const touchedBeaches = bySlug.size;
  const totalFieldChanges = changes.length;

  for (const { slug, field } of changes) {
    const row = sheetBySlug.get(slug)!;
    const entry = slugToObject.get(slug)!;
    const obj = entry.objectLiteral;
    const prop = obj.getProperty(field);
    if (!prop || !Node.isPropertyAssignment(prop)) {
      throw new Error(`Internal: ${slug}.${field} not a PropertyAssignment`);
    }
    const init = prop.getInitializer();
    if (!init || !Node.isStringLiteral(init)) {
      throw new Error(`Internal: ${slug}.${field} not a StringLiteral`);
    }
    const newVal =
      field === "description"
        ? normalizeNewlines(row.description)
        : field === "bestFor"
          ? normalizeNewlines(row.bestFor)
          : field === "notes"
            ? normalizeNewlines(row.notes)
            : normalizeNewlines(row.webcamUrl);
    init.setLiteralValue(newVal);
  }

  await project.save();

  console.log("Import complete.");
  console.log(`Beaches touched: ${touchedBeaches}`);
  console.log(
    `Field changes: description=${byField.description}, bestFor=${byField.bestFor}, notes=${byField.notes}, webcamUrl=${byField.webcamUrl} (total ${totalFieldChanges})`
  );
  console.log("Per-beach:");
  for (const [slug, fields] of [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${slug}: ${fields.join(", ")}`);
  }
}

const args = process.argv.slice(2);
if (args.includes("--webcam-sanity")) {
  runWebcamSanity()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
