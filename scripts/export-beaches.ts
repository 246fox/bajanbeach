/**
 * Export canonical `beaches` from TypeScript to BajanBeach_Master_List.xlsx (repo root).
 * Run: npm run beaches:export
 */
import path from "node:path";
import ExcelJS from "exceljs";

import { beaches } from "../src/data/beaches";

const OUT_FILE = "BajanBeach_Master_List.xlsx";

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

const STRUCTURAL_COUNT = 9;
const EDITABLE_TEXT_COL_START = 10;
const EDITABLE_TEXT_COL_END = 12;
const WEBCAM_COL = 13;

const STRUCTURAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F5F5" }
};

const STRUCTURAL_FONT: Partial<ExcelJS.Font> = {
  size: 10,
  color: { argb: "FF666666" }
};

const NORMAL_FONT: Partial<ExcelJS.Font> = {
  size: 11,
  color: { argb: "FF000000" }
};

const WRAP_TOP: Partial<ExcelJS.Alignment> = {
  wrapText: true,
  vertical: "top"
};

function rowValues(beach: (typeof beaches)[number]): (string | number)[] {
  return [
    beach.slug,
    beach.name,
    beach.parish,
    beach.coast,
    beach.seaState,
    beach.waveActionBaseline,
    beach.isSurfSpot ? "Yes" : "No",
    beach.latitude,
    beach.longitude,
    beach.description,
    beach.bestFor,
    beach.notes,
    beach.webcamUrl,
    "",
    ""
  ];
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BajanBeach";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Beaches", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 1, topLeftCell: "B2", activeCell: "B2" }]
  });

  sheet.addRow([...HEADERS]);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };

  for (let c = 1; c <= STRUCTURAL_COUNT; c += 1) {
    const cell = headerRow.getCell(c);
    cell.fill = STRUCTURAL_FILL;
    cell.font = { bold: true, size: 10, color: { argb: "FF444444" } };
  }

  for (let c = STRUCTURAL_COUNT + 1; c <= HEADERS.length; c += 1) {
    headerRow.getCell(c).font = { bold: true, size: 11 };
  }

  for (const beach of beaches) {
    sheet.addRow(rowValues(beach));
  }

  const widths: Record<number, number> = {
    1: 22,
    2: 28,
    3: 14,
    4: 12,
    5: 12,
    6: 18,
    7: 12,
    8: 14,
    9: 14,
    10: 60,
    11: 60,
    12: 60,
    13: 50,
    14: 14,
    15: 22
  };

  for (let c = 1; c <= HEADERS.length; c += 1) {
    sheet.getColumn(c).width = widths[c] ?? 18;
  }

  for (let c = EDITABLE_TEXT_COL_START; c <= EDITABLE_TEXT_COL_END; c += 1) {
    sheet.getColumn(c).alignment = WRAP_TOP;
  }
  sheet.getColumn(WEBCAM_COL).alignment = WRAP_TOP;

  const lastRow = beaches.length + 1;
  for (let r = 2; r <= lastRow; r += 1) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= STRUCTURAL_COUNT; c += 1) {
      const cell = row.getCell(c);
      cell.fill = STRUCTURAL_FILL;
      cell.font = { ...STRUCTURAL_FONT };
      cell.alignment = { vertical: "top" };
    }
    for (let c = EDITABLE_TEXT_COL_START; c <= WEBCAM_COL; c += 1) {
      const cell = row.getCell(c);
      cell.font = { ...NORMAL_FONT };
      cell.alignment = WRAP_TOP;
    }
    for (let c = 14; c <= 15; c += 1) {
      const cell = row.getCell(c);
      cell.font = { ...NORMAL_FONT };
      cell.alignment = { vertical: "top" };
    }
  }

  const outPath = path.join(process.cwd(), OUT_FILE);
  await workbook.xlsx.writeFile(outPath);

  console.log(`Wrote ${outPath} (${beaches.length} beaches + header).`);
  if (beaches.length !== 63) {
    console.warn(`Expected 63 beaches; got ${beaches.length}.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
