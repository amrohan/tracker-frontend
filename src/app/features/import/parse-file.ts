export interface Sheet {
  name: string;
  headers: string[];
  rows: (string | null)[][];
}

export interface Workbook {
  sheets: Sheet[];
}

export const MAX_ROWS = 5000;

/**
 * Reads .csv/.tsv/.txt or .xlsx in the browser.
 *
 * CSV/TSV/TXT returns a workbook containing one sheet.
 * XLSX returns all worksheets with their data.
 */
export async function parseFile(
  file: File,
  encoding: string,
): Promise<Workbook> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
    const table = await readDelimited(file, encoding, getDelimiter(name));

    return {
      sheets: [
        {
          name: "Sheet 1",
          ...normalizeTable(table),
        },
      ],
    };
  }

  if (name.endsWith(".xlsx")) {
    return readExcelWorkbook(file);
  }

  throw new Error("Please choose a .csv, .tsv, .txt or .xlsx file.");
}

/**
 * Reads all worksheets from an Excel workbook.
 *
 * Current read-excel-file API:
 * The default export returns:
 *
 * [
 *   {
 *     sheet: "Sheet1",
 *     data: [...]
 *   },
 *   {
 *     sheet: "Sheet2",
 *     data: [...]
 *   }
 * ]
 */
async function readExcelWorkbook(file: File): Promise<Workbook> {
  const mod = await import("read-excel-file/browser");

  const readExcelFile = mod.default;

  const workbook = await readExcelFile(file);

  if (!workbook.length) {
    throw new Error("The Excel file does not contain any worksheets.");
  }

  return {
    sheets: workbook.map((worksheet: { sheet: string; data: unknown[][] }) => ({
      name: worksheet.sheet,
      ...normalizeTable(worksheet.data),
    })),
  };
}

/**
 * Reads one specific Excel worksheet.
 *
 * `sheet` can be a sheet name or sheet number.
 */
export async function readExcelSheet(
  file: File,
  sheetName: string,
): Promise<Sheet> {
  const mod = await import("read-excel-file/browser");

  const table = await mod.readSheet(file, sheetName);

  return {
    name: sheetName,
    ...normalizeTable(table),
  };
}

async function readDelimited(
  file: File,
  encoding: string,
  delimiter?: string,
): Promise<string[][]> {
  const mod = await import("papaparse");

  const Papa =
    (
      mod as unknown as {
        default?: typeof mod;
      }
    ).default ?? mod;

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      encoding,
      delimiter,
      skipEmptyLines: "greedy",

      complete: (result) => {
        resolve(result.data);
      },

      error: (err: Error) => {
        reject(err);
      },
    });
  });
}

function getDelimiter(name: string): string | undefined {
  if (name.endsWith(".csv")) {
    return ",";
  }

  if (name.endsWith(".tsv")) {
    return "\t";
  }

  // Let PapaParse detect TXT.
  return undefined;
}

/**
 * Normalizes raw spreadsheet data into the format
 * used by the importer.
 */
function normalizeTable(table: unknown[][]): {
  headers: string[];
  rows: (string | null)[][];
} {
  const isBlank = (v: unknown) => v === null || v === undefined || v === "";

  // Remove completely empty rows.
  table = table.filter((r) => r.some((c) => !isBlank(c)));

  if (table.length < 2) {
    throw new Error("The file needs a header row and at least one data row.");
  }

  // Remove completely empty columns.
  const width = Math.max(...table.map((r) => r.length));

  const keep: number[] = [];

  for (let c = 0; c < width; c++) {
    if (table.some((r) => !isBlank(r[c]))) {
      keep.push(c);
    }
  }

  const headers = keep.map(
    (c, i) => cellToString(table[0][c]) ?? `Column ${i + 1}`,
  );

  const rows = table.slice(1).map((r) => keep.map((c) => cellToString(r[c])));

  return {
    headers,
    rows,
  };
}

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined || v === "") {
    return null;
  }

  if (v instanceof Date) {
    const midnight =
      v.getUTCHours() + v.getUTCMinutes() + v.getUTCSeconds() === 0;

    return midnight ? v.toISOString().slice(0, 10) : v.toISOString();
  }

  if (typeof v === "boolean") {
    return v ? "true" : "false";
  }

  const s = String(v).trim();

  return s === "" ? null : s;
}
