import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function fmt(n: number, digits = 1) {
  return n.toFixed(digits);
}

export function fmtInt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}
