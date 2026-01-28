"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

export async function verifyAuth(request) {
    // Check for session cookie (browser auth)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (sessionCookie) {
        return { authenticated: true, method: "session", identifier: "session-user" };
    }

    // Check for X-API-Token header (API token auth)
    const apiToken = request?.headers?.get("x-api-token");

    if (apiToken) {
        // Basic validation
        if (typeof apiToken !== 'string' || apiToken.length !== 64) {
            return { authenticated: false, error: "Invalid token format" };
        }

        try {
            // Verify the token exists in database and is active
            const result = await sql`
                SELECT id, token, name, created_at, last_used 
                FROM api_tokens 
                WHERE token = ${apiToken} AND revoked = FALSE
            `;

            if (result.length > 0) {
                // Update last_used timestamp
                const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
                await sql`
                    UPDATE api_tokens 
                    SET last_used = ${now} 
                    WHERE token = ${apiToken}
                `;

                return {
                    authenticated: true,
                    method: "token",
                    tokenId: result[0].id,
                    tokenName: result[0].name,
                    identifier: `token-${result[0].id}`
                };
            }
        } catch (error) {
            console.error("Token verification failed:", error);
            return { authenticated: false, error: "Token verification failed" };
        }
    }

    return { authenticated: false };
}

export async function requireAuth(request, options = {}) {
    const {
        maxRequests = 100,
        windowMs = 60000,
        enableRateLimit = true
    } = options;

    const auth = await verifyAuth(request);

    if (!auth.authenticated) {
        return {
            error: true,
            status: 401,
            message: auth.error || "Unauthorized. Please provide valid authentication via session cookie or X-API-Token header."
        };
    }

    // Apply rate limiting
    if (enableRateLimit) {
        const limiter = rateLimit(auth.identifier, maxRequests, windowMs);

        if (!limiter.allowed) {
            return {
                error: true,
                status: 429,
                message: `Too many requests. Please try again in ${limiter.retryAfter} seconds.`,
                retryAfter: limiter.retryAfter
            };
        }

        // Add rate limit info to auth object
        auth.rateLimit = {
            remaining: limiter.remaining,
            resetTime: limiter.resetTime
        };
    }

    return { error: false, auth };
}
