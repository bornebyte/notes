import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/session";
import { findApiToken } from "@/lib/api-token";

export const MCP_SCOPES = ["notes:read", "notes:write"];
export const MCP_PATH = "/api/mcp";
export const MCP_GRANT_DURATION_MS = Object.freeze({
    "1h": 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    never: null,
});
const CONSENT_TOKEN_TTL_MS = 5 * 60 * 1000;

export function isMcpGrantDuration(value) {
    return Object.hasOwn(MCP_GRANT_DURATION_MS, value);
}

export function getMcpGrantExpiresAt(duration, from = Date.now()) {
    if (!isMcpGrantDuration(duration)) throw new Error("Invalid MCP grant duration.");
    const durationMs = MCP_GRANT_DURATION_MS[duration];
    return durationMs === null ? null : new Date(from + durationMs);
}

export function getMcpOrigin() {
    const configured = process.env.MCP_BASE_URL
        || process.env.NEXT_PUBLIC_DOMAIN
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    const url = new URL(configured);
    let pathname = url.pathname.replace(/\/+$/, "");
    if (pathname === "") pathname = "/";
    if (url.username || url.password || url.search || url.hash
        || (pathname !== "/" && pathname !== "")) {
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

export function createConsentToken(authorization, sessionToken) {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is required for OAuth consent.");

    const now = Date.now();
    const payload = Buffer.from(JSON.stringify({
        version: 1,
        issuedAt: now,
        expiresAt: now + CONSENT_TOKEN_TTL_MS,
        sessionHash: digest(sessionToken),
        clientId: authorization.clientId,
        redirectUri: authorization.redirectUri,
        challenge: authorization.challenge,
        state: authorization.state,
        resource: authorization.resource,
        requestedScopes: authorization.requestedScopes,
        nonce: randomBytes(16).toString("base64url"),
    })).toString("base64url");
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

export function verifyConsentToken(token, authorization, sessionToken) {
    try {
        if (typeof token !== "string" || token.length > 8192) return false;
        const [payload, signature, ...extra] = token.split(".");
        if (extra.length || !payload || !signature || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;

        const secret = process.env.SESSION_SECRET;
        if (!secret) return false;
        const expected = createHmac("sha256", secret).update(payload).digest();
        const received = Buffer.from(signature, "base64url");
        if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

        const consent = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        const now = Date.now();
        return consent.version === 1
            && Number.isSafeInteger(consent.issuedAt)
            && Number.isSafeInteger(consent.expiresAt)
            && consent.issuedAt <= now + 30_000
            && consent.expiresAt > now
            && consent.expiresAt - consent.issuedAt <= CONSENT_TOKEN_TTL_MS
            && consent.sessionHash === digest(sessionToken)
            && consent.clientId === authorization.clientId
            && consent.redirectUri === authorization.redirectUri
            && consent.challenge === authorization.challenge
            && consent.state === authorization.state
            && consent.resource === authorization.resource
            && JSON.stringify(consent.requestedScopes) === JSON.stringify(authorization.requestedScopes)
            && typeof consent.nonce === "string"
            && /^[A-Za-z0-9_-]{22}$/.test(consent.nonce);
    } catch {
        return false;
    }
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

export async function getValidAdminSessionToken() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        return session && await decrypt(session) ? session : null;
    } catch {
        return null;
    }
}

export async function hasValidAdminSession() {
    return Boolean(await getValidAdminSessionToken());
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
            sql`DELETE FROM mcp_oauth_tokens
                WHERE (refresh_expires_at IS NOT NULL AND refresh_expires_at < NOW())
                   OR (refresh_token_hash IS NULL AND access_expires_at < NOW())
                   OR revoked_at < NOW() - INTERVAL '30 days'`,
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
