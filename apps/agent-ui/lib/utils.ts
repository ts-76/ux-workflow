import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class values into a single class string,
 * merging Tailwind CSS classes properly.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
} 