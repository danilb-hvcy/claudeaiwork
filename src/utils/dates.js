const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse "YYYY-MM-DD" into a local Date (avoids UTC off-by-one). */
export function parseISO(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

/** Format a Date as "YYYY-MM-DD". */
export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "Mon, 26 Dec" */
export function shortLabel(date) {
  return `${WEEKDAYS[date.getDay()]}, ${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`;
}

/**
 * Build the horizontal date strip around a center date.
 * Returns [{ label, value(ISO), active }] with `before` days before and
 * `after` days after the selected date.
 */
export function buildDateStrip(centerISO, before = 2, after = 6) {
  const center = parseISO(centerISO);
  const out = [];
  for (let i = -before; i <= after; i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    const value = toISO(d);
    out.push({ label: shortLabel(d), value, active: value === centerISO });
  }
  return out;
}
