/**
 * Makes one value safe for a CSV cell: neutralizes spreadsheet formulas
 * (cells starting with = + - @ tab or CR) and quotes the value.
 */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}
