/**
 * utils/dom.js
 * 
 * Utility functions for DOM and HTML manipulation.
 */

/**
 * Escapes special characters for safe inclusion in HTML content and attributes.
 * @param {string} str The string to escape
 * @returns {string} The escaped string
 */
export function escapeHTML(str) {
    if (!str || typeof str !== 'string') return str || '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
