export function formatQuantity(value: number | string | undefined | null, unit?: string) {
  const num = Number(value);
  if (Number.isNaN(num)) return { value: '—', unit: unit || '' };

  const precision = num === 0 ? 0 : num < 0.01 ? 4 : num < 1 ? 3 : num < 10 ? 2 : 1;
  const formatted = parseFloat(num.toFixed(precision));
  return { value: formatted, unit: unit || '' };
}

export function fmtQty(value: number | string | undefined | null, unit?: string) {
  const { value: v, unit: u } = formatQuantity(value, unit);
  return `${v} ${u}`.trim();
}
