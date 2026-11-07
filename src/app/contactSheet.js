import { readSheet } from "read-excel-file/universal";
import Papa from "papaparse";

// Reading contact spreadsheets in the browser, plus a column-name fallback for when the AI is unavailable.

export const MAX_SHEET_ROWS = 300;

const cellText = (value) => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

/**
 * Read the first sheet of an .xlsx file or a .csv. The first row holds the column names.
 * Returns { headers, rows: [{ row, cells: { column: value } }] }, skipping empty rows.
 */
export async function parseSheet(file) {
  let grid;
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    grid = Papa.parse(await file.text(), { skipEmptyLines: "greedy" }).data;
  } else if (/\.xlsx$/i.test(file.name)) {
    grid = await readSheet(file);
  } else {
    throw new Error("Use an Excel (.xlsx) or .csv file. Older .xls files: open in Excel and save as .xlsx.");
  }

  const [headerRow = [], ...body] = grid;
  // Unique column names, so two "Phone" columns don't overwrite each other
  const seen = new Map();
  const headers = headerRow.map((h, i) => {
    const name = cellText(h) || `Column ${i + 1}`;
    const count = (seen.get(name) || 0) + 1;
    seen.set(name, count);
    return count > 1 ? `${name} (${count})` : name;
  });

  const rows = body
    .map((cells, i) => ({
      row: i + 2, // spreadsheet row number, counting the header as row 1
      cells: Object.fromEntries(headers.map((h, c) => [h, cellText(cells[c])]).filter(([, v]) => v)),
    }))
    .filter((r) => Object.keys(r.cells).length);

  return { headers, rows };
}

// Column-name rules for the fallback, checked in order (so "Company Name" is a company, not a name)
const RULES = [
  [/e-?mail/i, "email"],
  [/first|given|fname/i, "firstName"],
  [/last|surname|family|lname/i, "lastName"],
  [/company|organi[sz]ation|firm|business|employer|\borg\b/i, "organization"],
  [/title|designation|position|role|job/i, "jobTitle"],
  [/fax/i, "fax"],
  [/mobile|cell|whats ?app/i, "mobile"],
  [/phone|tel|landline|office|contact|number|\bno\b/i, "phone"],
  [/web|site|url|linkedin|instagram|twitter|facebook/i, "url"],
  [/pin|zip|postal|post ?code/i, "postcode"],
  [/city|town/i, "city"],
  [/state|province|region/i, "region"],
  [/country/i, "country"],
  [/address|street|addr|area|locality/i, "street"],
  [/name|person/i, "fullName"],
];

/** Best-effort contact from column names alone; used only when every AI model fails. */
export function guessContact(cells) {
  const c = { firstName: "", lastName: "", jobTitle: "", organization: "", email: "", phones: [], urls: [], street: "", city: "", region: "", postcode: "", country: "" };
  let fullName = "";

  for (const [column, value] of Object.entries(cells)) {
    const field = RULES.find(([re]) => re.test(column))?.[1];
    const digits = value.replace(/\D/g, "").length;

    if (field === "email" || (!c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) c.email ||= value;
    else if ((field === "mobile" || field === "phone" || field === "fax") && digits >= 7) {
      value.split(/[,;/]| or /).map((n) => n.trim()).filter((n) => n.replace(/\D/g, "").length >= 7)
        .forEach((number) => c.phones.push({ type: field, number }));
    } else if (field === "url" || /^(https?:\/\/|www\.)/i.test(value)) c.urls.push(value);
    else if (field === "fullName" && !digits) fullName ||= value;
    else if (field && field in c && typeof c[field] === "string") c[field] ||= value;
  }

  if (fullName && !c.firstName && !c.lastName) {
    const parts = fullName.replace(/^(mr|mrs|ms|dr|shri)\.?\s+/i, "").split(/\s+/);
    c.lastName = parts.length > 1 ? parts.pop() : "";
    c.firstName = parts.join(" ");
  }
  return c;
}
