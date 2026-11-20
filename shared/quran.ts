/**
 * Kurikulum hafalan yang dipakai aplikasi.
 * Juz 30 terdiri dari 23 halaman, sedangkan Juz 29–26 masing-masing 20 halaman.
 */
export interface JuzConfig {
  juz: number;
  pages: number;
}

export const JUZ_CONFIG: JuzConfig[] = [
  { juz: 30, pages: 23 },
  { juz: 29, pages: 20 },
  { juz: 28, pages: 20 },
  { juz: 27, pages: 20 },
  { juz: 26, pages: 20 },
];

export const JUZ_ORDER = JUZ_CONFIG.map((j) => j.juz);
export const TOTAL_PAGES = JUZ_CONFIG.reduce((sum, j) => sum + j.pages, 0);

export function pagesInJuz(juz: number): number {
  const found = JUZ_CONFIG.find((j) => j.juz === juz);
  return found ? found.pages : 0;
}

export function isJuz(juz: number): boolean {
  return JUZ_CONFIG.some((j) => j.juz === juz);
}

/** Rentang halaman mentah untuk halaman pertama tiap juz pada mushaf (untuk label). */
export function juzCoverageLabel(juz: number): string {
  return `${pagesInJuz(juz)} halaman`;
}
