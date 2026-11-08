"use server";

import { cookies } from "next/headers";
import { rateLimit } from "@/lib/ratelimit";
import { findApiToken } from "@/lib/api-token";
import { decrypt } from "@/lib/session";

export async function verifyAuth(request) {
    // Check for session cookie (browser auth)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (sessionCookie) {
        const session = await decrypt(sessionCookie.value);
        if (session) return { authenticated: true, method: "session", identifier: "session-user" };
    }

    // Check for X-API-Token header (API token auth)
    const apiToken = request?.headers?.get("x-api-token");

    if (apiToken) {
        if (typeof apiToken !== 'string' || !/^[a-f0-9]{64}$/i.test(apiToken)) {
            return { authenticated: false, error: "Invalid token format" };
        }

        try {
            const result = await findApiToken(apiToken);
            if (result) {
                return {
                    authenticated: true,
                    method: "token",
                    tokenId: result.id,
                    tokenName: result.name,
                    identifier: `token-${result.id}`
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
