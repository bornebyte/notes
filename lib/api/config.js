/**
 * API Configuration
 * Centralized configuration for external API endpoints
 */

// PPT Generator API Base URL
// This can be changed easily without modifying multiple files
export const PPT_API_BASE_URL = process.env.NEXT_PUBLIC_PPT_API_URL || 'https://pptx.shubham-shah.com.np';

// API Key for admin endpoints (if required)
export const PPT_API_KEY = process.env.PPT_ADMIN_API_KEY || '';

/**
 * Get headers for PPT API requests
 * @returns {Object} Headers object
 */
export function getPPTAPIHeaders() {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (PPT_API_KEY) {
        headers['X-API-Key'] = PPT_API_KEY;
    }

    return headers;
}

/**
 * Build a full API URL
 * @param {string} endpoint - The endpoint path (e.g., '/api/generations')
 * @returns {string} Full URL
 */
export function buildPPTAPIUrl(endpoint) {
    const base = PPT_API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
}
