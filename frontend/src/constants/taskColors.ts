import type { TaskColor } from "../types";

interface TaskColorConfig {
  value: TaskColor | null;
  label: string;
  bgClass: string;
  darkBgClass: string;
  ringClass: string;
}

export const TASK_COLORS: TaskColorConfig[] = [
  { value: null,     label: "なし",     bgClass: "bg-white",        darkBgClass: "dark:bg-slate-700", ringClass: "ring-slate-300" },
  { value: "red",    label: "赤",       bgClass: "bg-red-100",      darkBgClass: "dark:bg-red-900/50",    ringClass: "ring-red-300" },
  { value: "orange", label: "橙",       bgClass: "bg-orange-100",   darkBgClass: "dark:bg-orange-900/50", ringClass: "ring-orange-300" },
  { value: "yellow", label: "黄",       bgClass: "bg-yellow-100",   darkBgClass: "dark:bg-yellow-900/50", ringClass: "ring-yellow-300" },
  { value: "green",  label: "緑",       bgClass: "bg-green-100",    darkBgClass: "dark:bg-green-900/50",  ringClass: "ring-green-300" },
  { value: "blue",   label: "青",       bgClass: "bg-blue-100",     darkBgClass: "dark:bg-blue-900/50",   ringClass: "ring-blue-300" },
  { value: "purple", label: "紫",       bgClass: "bg-purple-100",   darkBgClass: "dark:bg-purple-900/50", ringClass: "ring-purple-300" },
  { value: "gray",   label: "灰",       bgClass: "bg-gray-100",     darkBgClass: "dark:bg-gray-800/50",   ringClass: "ring-gray-300" },
];

export function getTaskColorClasses(color: TaskColor | null): string {
  const config = TASK_COLORS.find((c) => c.value === color) ?? TASK_COLORS[0];
  return `${config.bgClass} ${config.darkBgClass}`;
}
