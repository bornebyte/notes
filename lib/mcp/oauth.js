import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/session";
import { findApiToken } from "@/lib/api-token";

export const MCP_SCOPES = ["notes:read", "notes:write"];
export const MCP_PATH = "/api/mcp";

export function getMcpOrigin() {
    const configured = process.env.MCP_BASE_URL
        || process.env.NEXT_PUBLIC_DOMAIN
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || "http://localhost:3000";
    const url = new URL(configured);

    if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
        throw new Error("MCP_BASE_URL must be a site origin without a path, query, or credentials");
    }
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
        throw new Error("MCP_BASE_URL must use HTTPS in production");
    }

    return url.origin;
}

export function getMcpResource() {
    return `${getMcpOrigin()}${MCP_PATH}`;
}

export function getProtectedResourceMetadataUrl() {
    return `${getMcpOrigin()}/.well-known/oauth-protected-resource`;
}

export function digest(value) {
    return createHash("sha256").update(value).digest("base64url");
}

export function newSecret(prefix) {
    return `${prefix}${randomBytes(32).toString("base64url")}`;
}

export function secureHeaders(extra = {}) {
    return {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        ...extra,
    };
}

export async function readLimitedText(request, maxBytes) {
    const reader = request.body?.getReader();
    if (!reader) return "";

    const chunks = [];
    let totalBytes = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
            await reader.cancel();
            throw new Error("request_too_large");
        }
        chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
}

export async function hasValidAdminSession() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        return Boolean(session && await decrypt(session));
    } catch {
        return false;
    }
}

export function htmlEscape(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);
}

export async function rateLimit(key, maxRequests, windowSeconds, request) {
    const forwarded = request?.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    const ip = request?.headers.get("x-real-ip") || forwarded || "unknown";
    const keyHash = digest(`${key}:${ip}`);
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

    const rows = await sql`
        INSERT INTO mcp_rate_limits (key_hash, window_start, request_count)
        VALUES (${keyHash}, ${windowStart}, 1)
        ON CONFLICT (key_hash, window_start)
        DO UPDATE SET request_count = mcp_rate_limits.request_count + 1
        RETURNING request_count
    `;

    if (Math.random() < 0.01) {
        Promise.all([
            sql`DELETE FROM mcp_rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`,
            sql`DELETE FROM mcp_oauth_codes WHERE expires_at < NOW() - INTERVAL '1 day'`,
            sql`DELETE FROM mcp_oauth_tokens WHERE refresh_expires_at < NOW() OR revoked_at < NOW() - INTERVAL '30 days'`,
        ]).catch(() => {});
    }

    const count = Number(rows[0]?.request_count || 0);
    return {
        allowed: count <= maxRequests,
        retryAfter: Math.max(1, Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000)),
    };
}

export function invalidTokenError() {
    return new OAuthError(OAuthErrorCode.InvalidToken, "The access token is invalid, expired, or revoked");
}

export async function verifyMcpAccessToken(token) {
    if (typeof token !== "string" || token.length < 32 || token.length > 128) {
        throw invalidTokenError();
    }

    const tokenHash = digest(token);
    const oauthTokens = await sql`
        SELECT client_id, scope, resource, access_expires_at
        FROM mcp_oauth_tokens
        WHERE access_token_hash = ${tokenHash}
          AND revoked_at IS NULL
          AND access_expires_at > NOW()
        LIMIT 1
    `;

    if (oauthTokens.length) {
        const row = oauthTokens[0];
        const expiresAt = Math.floor(new Date(row.access_expires_at).getTime() / 1000);
        return {
            token,
            clientId: row.client_id,
            scopes: String(row.scope || "").split(" ").filter(Boolean),
            expiresAt,
            resource: new URL(row.resource),
        };
    }

    const apiToken = await findApiToken(token);
    if (apiToken) {
        return {
            token,
            clientId: `api-token-${apiToken.id}`,
            scopes: MCP_SCOPES,
            expiresAt: Math.floor(Date.now() / 1000) + 60,
            resource: new URL(getMcpResource()),
        };
    }

    throw invalidTokenError();
}

export function jsonError(error, status, extraHeaders = {}) {
    return Response.json({ error }, {
        status,
        headers: secureHeaders(extraHeaders),
    });
}
