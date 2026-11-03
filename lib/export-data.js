function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map((header) => escapeCsvValue(row[header]));
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

module.exports = { toCsv };
