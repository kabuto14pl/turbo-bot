"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMediaQuery = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const react_1 = require("react");
const useMediaQuery = (query) => {
    const [matches, setMatches] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (typeof window !== 'undefined') {
            const media = window.matchMedia(query);
            // Set initial value
            setMatches(media.matches);
            // Listen for changes
            const listener = (e) => setMatches(e.matches);
            media.addEventListener('change', listener);
            return () => media.removeEventListener('change', listener);
        }
    }, [query]);
    return matches;
};
exports.useMediaQuery = useMediaQuery;
