export interface AccentColor {
  id: string;
  label: string;
  hex: string;
  vars: { 400: string; 500: string; 600: string };
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: "blue",   label: "ブルー",   hex: "#3b82f6", vars: { 400: "96 165 250",  500: "59 130 246",  600: "37 99 235"   } },
  { id: "purple", label: "パープル", hex: "#8b5cf6", vars: { 400: "167 139 250", 500: "139 92 246",  600: "124 58 237"  } },
  { id: "green",  label: "グリーン", hex: "#22c55e", vars: { 400: "74 222 128",  500: "34 197 94",   600: "22 163 74"   } },
  { id: "teal",   label: "ティール", hex: "#14b8a6", vars: { 400: "45 212 191",  500: "20 184 166",  600: "13 148 136"  } },
  { id: "orange", label: "オレンジ", hex: "#f97316", vars: { 400: "251 146 60",  500: "249 115 22",  600: "234 88 12"   } },
];

export function applyAccentColor(colorId: string) {
  const color = ACCENT_COLORS.find((c) => c.id === colorId);
  if (!color) return;
  document.documentElement.style.setProperty("--accent-400", color.vars[400]);
  document.documentElement.style.setProperty("--accent-500", color.vars[500]);
  document.documentElement.style.setProperty("--accent-600", color.vars[600]);
}
