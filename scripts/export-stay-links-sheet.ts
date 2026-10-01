/**
 * Export every beach to BajanBeach_Stay_Links.xlsx (repo root) for offline
 * "stay near this beach" affiliate link entry. Export only; no TS writes.
 * Run: npm run beaches:staylinks-sheet
 */
import path from "node:path";
import ExcelJS from "exceljs";

import { beaches } from "../src/data/beaches";
import type { BeachCoast } from "../src/types/beach";

const OUT_FILE = "BajanBeach_Stay_Links.xlsx";

const COAST_ORDER: BeachCoast[] = ["West", "South", "East", "Southeast", "North"];

const HEADERS = [
  "slug",
  "name",
  "coast",
  "parish",
  "Hotel(s) directly on this beach",
  "Row type",
  "Hotel name for button",
  "Affiliate link",
  "Pubref used",
  "Notes"
] as const;

const READONLY_COUNT = 4;
const FILL_IN_START = 5;
const AFFILIATE_LINK_COL = 8;
const ROW_TYPE_COL = 6;

const NOTE =
  "Fill yellow cells only, and only for beaches with at least one hotel directly on the sand. Paste affiliate links as plain text.";

const ROW_TYPE_OPTIONS = '"Single hotel - direct link,Multiple hotels - prefiltered page"';

const GREY_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F5F5" }
};

const YELLOW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF00" }
};

const ARIAL: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 11,
  color: { argb: "FF000000" }
};

const WIDTHS: Record<number, number> = {
  1: 22,
  2: 26,
  3: 10,
  4: 14,
  5: 36,
  6: 40,
  7: 28,
  8: 48,
  9: 28,
  10: 36
};

function sortedBeaches() {
  return [...beaches].sort((a, b) => {
    const coastDiff = COAST_ORDER.indexOf(a.coast) - COAST_ORDER.indexOf(b.coast);
    if (coastDiff !== 0) {
      return coastDiff;
    }
    return a.name.localeCompare(b.name, "en");
  });
}

async function main() {
  const rows = sortedBeaches();
  if (rows.length !== beaches.length) {
    throw new Error(`Sorted row count ${rows.length} !== beaches.length ${beaches.length}`);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BajanBeach";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Stay links", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 2, topLeftCell: "C3", activeCell: "C3" }]
  });

  const noteRow = sheet.addRow([NOTE]);
  noteRow.getCell(1).font = { ...ARIAL };
  noteRow.getCell(1).alignment = { vertical: "top" };

  const headerRow = sheet.addRow([...HEADERS]);
  headerRow.font = { ...ARIAL, bold: true };
  for (let c = 1; c <= READONLY_COUNT; c += 1) {
    const cell = headerRow.getCell(c);
    cell.fill = GREY_FILL;
    cell.font = { ...ARIAL, bold: true };
  }
  for (let c = FILL_IN_START; c <= HEADERS.length; c += 1) {
    headerRow.getCell(c).font = { ...ARIAL, bold: true };
  }

  for (const beach of rows) {
    sheet.addRow([beach.slug, beach.name, beach.coast, beach.parish, "", "", "", "", "", ""]);
  }

  for (let c = 1; c <= HEADERS.length; c += 1) {
    sheet.getColumn(c).width = WIDTHS[c] ?? 18;
  }
  sheet.getColumn(AFFILIATE_LINK_COL).numFmt = "@";

  const lastRow = rows.length + 2;
  for (let r = 3; r <= lastRow; r += 1) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= READONLY_COUNT; c += 1) {
      const cell = row.getCell(c);
      cell.fill = GREY_FILL;
      cell.font = { ...ARIAL };
      cell.alignment = { vertical: "top" };
    }
    for (let c = FILL_IN_START; c <= HEADERS.length; c += 1) {
      const cell = row.getCell(c);
      cell.fill = YELLOW_FILL;
      cell.font = { ...ARIAL };
      cell.alignment = { vertical: "top" };
    }
    row.getCell(AFFILIATE_LINK_COL).numFmt = "@";
    row.getCell(ROW_TYPE_COL).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [ROW_TYPE_OPTIONS]
    };
  }

  const outPath = path.join(process.cwd(), OUT_FILE);
  await workbook.xlsx.writeFile(outPath);

  console.log(
    `Wrote ${outPath} (${rows.length} data rows; beaches.length=${beaches.length}).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
