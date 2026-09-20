import { SummaryMetric } from './models';

export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  // Local calendar date: `new Date('2026-08-18')` would be UTC and can shift the day.
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(iso: string): string {
  const d = parseIsoDate(iso);
  return d ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d) : iso;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/** ISO instant -> value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(n);
}

export function formatCurrency(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${formatNumber(n)}`;
  }
}

export function currencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Only http(s) URLs may become links (blocks javascript: etc.). */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

export function formatMetric(m: SummaryMetric): string {
  const v = m.value;
  if (v === null || v === undefined) return '—';
  if (m.aggregation === 'count') return String(v);
  switch (m.fieldType) {
    case 'currency': return formatCurrency(Number(v), m.currency ?? 'USD');
    case 'number': return formatNumber(Number(v));
    case 'rating': return Number(v).toFixed(1);
    case 'date': return formatDate(String(v));
    case 'dateTime': return formatDateTime(String(v));
    default: return String(v);
  }
}

export function metricLabel(m: SummaryMetric): string {
  const dateLike = m.fieldType === 'date' || m.fieldType === 'dateTime';
  switch (m.aggregation) {
    case 'sum': return `Total ${m.fieldName}`;
    case 'average': return `Average ${m.fieldName}`;
    case 'min': return `${dateLike ? 'Earliest' : 'Lowest'} ${m.fieldName}`;
    case 'max': return `${dateLike ? 'Latest' : 'Highest'} ${m.fieldName}`;
    case 'count': return `${m.fieldName} (count)`;
    default: return m.fieldName;
  }
}
