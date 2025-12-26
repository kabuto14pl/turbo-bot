/**
 * UUID Helper - CommonJS/ESM compatibility wrapper
 * Fixes Jest testing issues with uuid module
 */

export function generateUUID(): string {
    // Simple UUID v4 implementation for testing compatibility
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Fallback to actual uuid if available in production
let actualUuid: any;
try {
    actualUuid = require('uuid');
} catch (e) {
    // uuid not available, use fallback
}

export const uuidv4 = actualUuid?.v4 || generateUUID;
