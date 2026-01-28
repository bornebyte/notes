// Middleware to add security headers to all API responses
export function addSecurityHeaders(response) {
    // Clone the response to add headers
    const headers = new Headers(response.headers);

    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // CORS headers for API access (adjust as needed)
    headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Token');
    headers.set('Access-Control-Max-Age', '86400');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

// Validate and sanitize input
export function validateInput(data, schema) {
    const errors = [];

    for (const [key, rules] of Object.entries(schema)) {
        const value = data[key];

        // Check required fields
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${key} is required`);
            continue;
        }

        // Skip validation if field is optional and not provided
        if (!rules.required && (value === undefined || value === null)) {
            continue;
        }

        // Type validation
        if (rules.type) {
            const actualType = typeof value;
            if (actualType !== rules.type) {
                errors.push(`${key} must be a ${rules.type}`);
                continue;
            }
        }

        // String validations
        if (rules.type === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${key} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${key} must not exceed ${rules.maxLength} characters`);
            }
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${key} has invalid format`);
            }
        }

        // Number validations
        if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${key} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${key} must not exceed ${rules.max}`);
            }
        }

        // Custom validation
        if (rules.validate && typeof rules.validate === 'function') {
            const customError = rules.validate(value);
            if (customError) {
                errors.push(customError);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Common validation schemas
export const schemas = {
    note: {
        title: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 255
        },
        body: {
            required: true,
            type: 'string',
            minLength: 1
        },
        category: {
            required: false,
            type: 'string',
            maxLength: 255
        }
    },

    target: {
        date: {
            required: true,
            type: 'string',
            validate: (value) => {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    return 'Invalid date format';
                }
                if (date < new Date()) {
                    return 'Target date must be in the future';
                }
                return null;
            }
        },
        message: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 500
        }
    },

    message: {
        name: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 100
        },
        email: {
            required: true,
            type: 'string',
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            maxLength: 255
        },
        message: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 5000
        }
    },

    password: {
        newPassword: {
            required: true,
            type: 'string',
            minLength: 6,
            maxLength: 128
        }
    },

    apiToken: {
        name: {
            required: true,
            type: 'string',
            minLength: 3,
            maxLength: 100
        }
    }
};

// Sanitize HTML/special characters
export function sanitizeText(text) {
    if (typeof text !== 'string') return text;

    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}
