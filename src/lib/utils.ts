import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}m ${secs}s`;
}

export function formatFrequency(hz: number): string {
  if (hz < 1000) return `${hz.toFixed(1)} Hz`;
  if (hz < 1_000_000) return `${(hz / 1000).toFixed(2)} kHz`;
  if (hz < 1_000_000_000) return `${(hz / 1_000_000).toFixed(2)} MHz`;
  return `${(hz / 1_000_000_000).toFixed(2)} GHz`;
}
