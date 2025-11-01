"use strict";
/**
 * useMediaQuery Hook - Stub Implementation
 * Provides responsive design media query support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMediaQuery = useMediaQuery;
function useMediaQuery(query, options) {
    // Default implementation for server-side rendering
    if (options?.noSsr) {
        return false;
    }
    // This is a stub - in production this would use window.matchMedia
    return options?.defaultValue ?? false;
}
exports.default = useMediaQuery;
