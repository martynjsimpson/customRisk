export function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (!/[",\r\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))
  ].join("\n");
}

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function csvRow(fields: unknown[]): string {
  return fields.map(escapeField).join(",");
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  return [csvRow(headers), ...rows.map(csvRow)].join("\r\n");
}
