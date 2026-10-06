import { QueryClient } from "@tanstack/react-query";

export function createServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Set staleTime above 0 on the server so dehydrated queries are not
        // immediately marked as stale upon client hydration, preventing skeleton flash.
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  });
}
