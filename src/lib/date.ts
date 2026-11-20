export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function monthLabel(month: string): string {
  if (!month) return "-";
  const [year, mon] = month.split("-").map(Number);
  return `${MONTH_NAMES[(mon || 1) - 1]} ${year}`;
}

export function monthShortLabel(month: string): string {
  const [, mon] = month.split("-").map(Number);
  return MONTH_SHORT[(mon || 1) - 1];
}

export function dayName(date: string): string {
  return DAY_NAMES[parseDate(date).getDay()];
}

export function dateNumber(date: string): number {
  return Number(date.slice(8, 10));
}

export function formatDateLong(date: string): string {
  const parsed = parseDate(date);
  return `${DAY_NAMES[parsed.getDay()]}, ${parsed.getDate()} ${MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function formatDateShort(date: string): string {
  const parsed = parseDate(date);
  return `${parsed.getDate()} ${MONTH_SHORT[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function addMonths(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 1 + delta, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthList(startMonth: string, endMonth: string): string[] {
  const list: string[] = [];
  let cursor = startMonth;
  let guard = 0;
  while (cursor <= endMonth && guard < 36) {
    list.push(cursor);
    cursor = addMonths(cursor, 1);
    guard += 1;
  }
  return list;
}

export function dayCount(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon, 0).getDate();
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} hari lalu`;
  return formatDateShort(iso.slice(0, 10));
}
