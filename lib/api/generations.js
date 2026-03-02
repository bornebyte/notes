import { buildPPTAPIUrl, getPPTAPIHeaders } from './config';

/**
 * Fetch generations list with filters and pagination
 * @param {Object} params - Query parameters for filtering, sorting, pagination
 * @returns {Promise<Object>} Generations data with pagination info
 */
export async function getGenerations(params = {}) {
    try {
        // Build query string from params
        const queryParams = new URLSearchParams();

        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        });

        const url = buildPPTAPIUrl(`/api/generations?${queryParams.toString()}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: getPPTAPIHeaders(),
            cache: 'no-store',
            signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized: Invalid API key');
            }
            if (response.status === 404) {
                throw new Error('API endpoint not found');
            }
            if (response.status >= 500) {
                throw new Error('Server error: Please try again later');
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();

        // Validate response structure
        if (!data || typeof data.total !== 'number' || !Array.isArray(data.items)) {
            throw new Error('Invalid response format from API');
        }

        return data;
    } catch (error) {
        // Handle different error types
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timeout: Unable to reach PPT API server');
        }

        if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
            throw new Error('Network error: Unable to connect to PPT API server. Please check the API URL configuration.');
        }

        if (error.message.includes('ECONNREFUSED')) {
            throw new Error('Connection refused: PPT API server is not running');
        }

        // Re-throw with original message if it's already a handled error
        throw error;
    }
}

/**
 * Fetch a single generation by ID
 * @param {number|string} id - Generation ID
 * @returns {Promise<Object>} Generation data
 */
export async function getGenerationById(id) {
    try {
        if (!id || isNaN(id)) {
            throw new Error('Invalid generation ID');
        }

        const url = buildPPTAPIUrl(`/api/generations/${id}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: getPPTAPIHeaders(),
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Generation not found');
            }
            if (response.status === 401) {
                throw new Error('Unauthorized: Invalid API key');
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timeout: Unable to reach PPT API server');
        }

        if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
            throw new Error('Network error: Unable to connect to PPT API server');
        }

        throw error;
    }
}

/**
 * Export generations data
 * @param {Object} params - Query parameters for filtering
 * @param {string} format - Export format ('csv' or 'json')
 * @returns {Promise<Blob|Object>} Exported data
 */
export async function exportGenerations(params = {}, format = 'csv') {
    try {
        const queryParams = new URLSearchParams({ ...params, format });

        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.set(key, params[key]);
            }
        });

        const url = buildPPTAPIUrl(`/api/generations/export?${queryParams.toString()}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: getPPTAPIHeaders(),
            signal: AbortSignal.timeout(30000), // 30 second timeout for exports
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized: Invalid API key');
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Export failed');
        }

        if (format === 'csv') {
            return await response.blob();
        } else {
            return await response.json();
        }
    } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Export timeout: Try reducing the number of records');
        }

        if (error.message.includes('fetch failed')) {
            throw new Error('Network error: Unable to connect to PPT API server');
        }

        throw error;
    }
}

/**
 * Check API health
 * @returns {Promise<Object>} Health status
 */
export async function checkAPIHealth() {
    try {
        const url = buildPPTAPIUrl('/health');

        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error('API is not healthy');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('API health check timeout');
        }

        throw new Error('API is unreachable');
    }
}
