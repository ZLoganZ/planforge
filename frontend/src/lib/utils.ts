import axios from "axios";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(
  err: unknown,
  fallback = "An unexpected error occurred"
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      { message?: string | string[]; error?: string } | undefined;

    if (data?.message) {
      return Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message;
    }

    if (data?.error) {
      return data.error;
    }

    return err.message || fallback;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}
