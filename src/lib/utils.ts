import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Adds the basePath prefix to image paths for GitHub Pages compatibility
 * @param path - The image path (should start with /)
 * @returns The path with basePath prefix if NEXT_PUBLIC_BASE_PATH is set
 */
export function getImagePath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  // Only add basePath if path starts with / and basePath is set
  if (path.startsWith('/') && basePath) {
    return `${basePath}${path}`;
  }
  return path;
}
