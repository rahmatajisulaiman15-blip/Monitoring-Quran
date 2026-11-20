/**
 * 30 warna berbeda untuk 30 siswa. Nuansanya dibuat kalem agar serasi
 * dengan tema grey–beige, namun tetap mudah dibedakan satu sama lain.
 */
export const STUDENT_COLORS = [
  "#7C9A92",
  "#C9A66B",
  "#A9746E",
  "#6B8CAE",
  "#B48EAE",
  "#8FA97C",
  "#D08C60",
  "#5F7A8A",
  "#B0A8B9",
  "#94B49F",
  "#C7A17A",
  "#8D6E63",
  "#7E9DB5",
  "#A58BA8",
  "#D9B382",
  "#6E8B74",
  "#C08585",
  "#8696A8",
  "#B3A275",
  "#9C7C8E",
  "#7BA7A0",
  "#D5A38C",
  "#8C9EB3",
  "#A6B08C",
  "#B98F72",
  "#6F8F86",
  "#CFA5A0",
  "#7F8FA6",
  "#BFA07C",
  "#9A8AA6",
];

export function colorForIndex(index: number): string {
  if (index < 0) return STUDENT_COLORS[0];
  return STUDENT_COLORS[index % STUDENT_COLORS.length];
}

export function colorForId(id: string, fallbackIndex: number): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 100_000;
  if (fallbackIndex >= 0) return colorForIndex(fallbackIndex);
  return colorForIndex(hash);
}

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
