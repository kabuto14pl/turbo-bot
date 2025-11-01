/**
 * useMediaQuery Hook - Stub Implementation
 * Provides responsive design media query support
 */

export interface MediaQueryOptions {
  defaultValue?: boolean;
  noSsr?: boolean;
}

export function useMediaQuery(query: string, options?: MediaQueryOptions): boolean {
  // Default implementation for server-side rendering
  if (options?.noSsr) {
    return false;
  }

  // This is a stub - in production this would use window.matchMedia
  return options?.defaultValue ?? false;
}

export default useMediaQuery;
