// Cache utility for localStorage with expiry support

const CACHE_PREFIX = 'notes_cache_';
const CACHE_EXPIRY_PREFIX = 'notes_expiry_';

/**
 * Set data in cache with optional expiry time
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} expiryMinutes - Cache expiry in minutes (default: 30 minutes)
 */
export function setCache(key, data, expiryMinutes = 30) {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const expiryKey = CACHE_EXPIRY_PREFIX + key;
        const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);

        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(expiryKey, expiryTime.toString());

        return true;
    } catch (error) {
        console.error('Error setting cache:', error);
        return false;
    }
}

/**
 * Get data from cache if not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired/not found
 */
export function getCache(key) {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const expiryKey = CACHE_EXPIRY_PREFIX + key;

        const expiryTime = localStorage.getItem(expiryKey);

        // Check if cache exists and is not expired
        if (expiryTime && Date.now() < parseInt(expiryTime)) {
            const data = localStorage.getItem(cacheKey);
            return data ? JSON.parse(data) : null;
        }

        // Cache expired, clean up
        clearCache(key);
        return null;
    } catch (error) {
        console.error('Error getting cache:', error);
        return null;
    }
}

/**
 * Clear specific cache entry
 * @param {string} key - Cache key to clear
 */
export function clearCache(key) {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const expiryKey = CACHE_EXPIRY_PREFIX + key;

        localStorage.removeItem(cacheKey);
        localStorage.removeItem(expiryKey);

        return true;
    } catch (error) {
        console.error('Error clearing cache:', error);
        return false;
    }
}

/**
 * Clear all caches with our prefix
 */
export function clearAllCaches() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        return true;
    } catch (error) {
        console.error('Error clearing all caches:', error);
        return false;
    }
}

/**
 * Check if cache exists and is valid
 * @param {string} key - Cache key
 * @returns {boolean}
 */
export function isCacheValid(key) {
    try {
        const expiryKey = CACHE_EXPIRY_PREFIX + key;
        const expiryTime = localStorage.getItem(expiryKey);

        return expiryTime && Date.now() < parseInt(expiryTime);
    } catch (error) {
        return false;
    }
}
