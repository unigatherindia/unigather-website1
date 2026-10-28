function escapeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Keep phone numbers and booking ids as text in Excel and Google Sheets. */
export function csvText(value: unknown): string {
  const text = value == null ? '' : String(value).trim();
  if (!text) return '';
  if (/^[+\d][\d\s().-]{5,}$/.test(text)) return `\t${text}`;
  return text;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadSectionedCsv(options: {
  filename: string;
  headers: string[];
  sections: { title: string; rows: string[][] }[];
}) {
  const lines: string[][] = [];
  options.sections.forEach((section, index) => {
    if (index > 0) lines.push([]);
    lines.push([`${section.title} (${section.rows.length})`]);
    lines.push(options.headers);
    section.rows.forEach((row) => lines.push(row));
  });
  downloadCsv(options.filename, lines);
}

export function csvDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
