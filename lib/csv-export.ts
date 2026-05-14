// CSV builder used by the dashboard export actions. Excel honours the
// UTF-8 BOM so Arabic and emoji render correctly when the file is double
// clicked.

type Cell = string | number | null | undefined;

function escape(cell: Cell): string {
  const s = cell == null ? "" : String(cell);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  return "﻿" + lines.join("\r\n");
}

export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
