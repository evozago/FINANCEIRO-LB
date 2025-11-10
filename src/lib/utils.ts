import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Capitaliza primeira letra de cada palavra
export function capitalizeWords(text: string): string {
  if (!text) return text;
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Transforma texto em maiúsculas
export function toUpperCaseText(text: string): string {
  if (!text) return text;
  return text.toUpperCase();
}
