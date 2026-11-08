import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
    digest,
    getMcpOrigin,
    getMcpResource,
    isMcpGrantDuration,
    newSecret,
    rateLimit,
    readLimitedText,
    secureHeaders,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";

const ACCESS_TTL_SECONDS = 60 * 60;
function tokenError(error, status = 400) {
    return NextResponse.json({ error }, { status, headers: secureHeaders() });
}

function sameValue(left, right) {
    const a = Buffer.from(String(left));
    const b = Buffer.from(String(right));
    return a.length === b.length && timingSafeEqual(a, b);
}

async function issueTokens(clientId, scope, resource, grantDuration, grantExpiresAt) {
    if (!isMcpGrantDuration(grantDuration)) throw new Error("Invalid OAuth grant duration.");
    const accessToken = newSecret("mcp_at_");
    const refreshToken = newSecret("mcp_rt_");
    const now = Date.now();
    const refreshExpiresAtMs = grantExpiresAt ? new Date(grantExpiresAt).getTime() : null;
    if (refreshExpiresAtMs !== null && refreshExpiresAtMs <= now) throw new Error("OAuth grant has expired.");
    const accessExpiresAtMs = Math.min(
        now + ACCESS_TTL_SECONDS * 1000,
        refreshExpiresAtMs ?? Number.POSITIVE_INFINITY,
    );
    const accessExpiresAt = new Date(accessExpiresAtMs);
    const refreshExpiresAt = refreshExpiresAtMs === null ? null : new Date(refreshExpiresAtMs);
    const accessTtlSeconds = Math.max(1, Math.floor((accessExpiresAtMs - now) / 1000));

    await sql`
        INSERT INTO mcp_oauth_tokens
            (access_token_hash, refresh_token_hash, client_id, scope, resource,
             grant_duration, access_expires_at, refresh_expires_at)
        VALUES
            (${digest(accessToken)}, ${digest(refreshToken)}, ${clientId}, ${scope}, ${resource},
             ${grantDuration}, ${accessExpiresAt}, ${refreshExpiresAt})
    `;
    await sql`
        UPDATE mcp_oauth_clients
        SET last_authorized_at = NOW()
        WHERE client_id = ${clientId}
    `;

    const tokenResponse = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: accessTtlSeconds,
        refresh_token: refreshToken,
        scope,
    };
    if (refreshExpiresAtMs !== null) {
        tokenResponse.refresh_token_expires_in = Math.max(1, Math.floor((refreshExpiresAtMs - now) / 1000));
    }
    return NextResponse.json(tokenResponse, { headers: secureHeaders() });
}

export async function POST(request) {
    try {
        const size = Number(request.headers.get("content-length") || 0);
        if (size > 8192) return tokenError("invalid_request", 413);
        if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
            return tokenError("invalid_request");
        }

        const limit = await rateLimit("oauth-token", 30, 60, request);
        if (!limit.allowed) {
            return NextResponse.json({ error: "slow_down" }, {
                status: 429,
                headers: secureHeaders({ "Retry-After": String(limit.retryAfter) }),
            });
        }

        const body = await readLimitedText(request, 8192);
        const form = new URLSearchParams(body);
        for (const field of ["grant_type", "client_id"]) {
            if (form.getAll(field).length !== 1) return tokenError("invalid_request");
        }
        if (form.getAll("resource").length > 1) return tokenError("invalid_request");
        if (form.has("client_secret")) return tokenError("unauthorized_client", 401);

        const clientId = form.get("client_id");
        const clients = await sql`SELECT client_id FROM mcp_oauth_clients WHERE client_id = ${clientId} LIMIT 1`;
        if (!clients.length) return tokenError("invalid_client", 401);

        if (form.get("grant_type") === "authorization_code") {
            const fields = ["code", "redirect_uri", "code_verifier"];
            if (fields.some((field) => form.getAll(field).length !== 1)) return tokenError("invalid_request");

            const code = form.get("code");
            const redirectUri = form.get("redirect_uri");
            const verifier = form.get("code_verifier");
            let resource = form.get("resource") || getMcpResource();
            if (resource === getMcpOrigin()) resource = getMcpResource();
            if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return tokenError("invalid_grant");

            const codes = await sql`
                SELECT code_challenge, scope, resource, grant_duration, grant_expires_at
                FROM mcp_oauth_codes
                WHERE code_hash = ${digest(code)}
                  AND client_id = ${clientId}
                  AND redirect_uri = ${redirectUri}
                  AND consumed_at IS NULL
                  AND expires_at > NOW()
                  AND (grant_expires_at IS NULL OR grant_expires_at > NOW())
                LIMIT 1
            `;
            if (!codes.length || codes[0].resource !== resource) return tokenError("invalid_grant");

            const challenge = digest(verifier);
            if (!sameValue(challenge, codes[0].code_challenge)) return tokenError("invalid_grant");

            const consumed = await sql`
                UPDATE mcp_oauth_codes
                SET consumed_at = NOW()
                WHERE code_hash = ${digest(code)}
                  AND client_id = ${clientId}
                  AND consumed_at IS NULL
                  AND expires_at > NOW()
                  AND (grant_expires_at IS NULL OR grant_expires_at > NOW())
                RETURNING client_id, scope, resource, grant_duration, grant_expires_at
            `;
            if (!consumed.length) return tokenError("invalid_grant");

            return await issueTokens(
                clientId,
                consumed[0].scope,
                consumed[0].resource,
                consumed[0].grant_duration,
                consumed[0].grant_expires_at,
            );
        }

        if (form.get("grant_type") === "refresh_token") {
            if (form.getAll("refresh_token").length !== 1) return tokenError("invalid_request");
            const refreshToken = form.get("refresh_token");
            let resource = form.get("resource");
            if (resource === getMcpOrigin()) resource = getMcpResource();
            const tokens = await sql`
                SELECT scope, resource, grant_duration, refresh_expires_at
                FROM mcp_oauth_tokens
                WHERE refresh_token_hash = ${digest(refreshToken)}
                  AND client_id = ${clientId}
                  AND revoked_at IS NULL
                  AND (refresh_expires_at IS NULL OR refresh_expires_at > NOW())
                LIMIT 1
            `;
            if (!tokens.length || (resource && resource !== tokens[0].resource)) return tokenError("invalid_grant");

            const rotated = await sql`
                UPDATE mcp_oauth_tokens
                SET refresh_token_hash = NULL
                WHERE refresh_token_hash = ${digest(refreshToken)}
                  AND client_id = ${clientId}
                  AND revoked_at IS NULL
                  AND (refresh_expires_at IS NULL OR refresh_expires_at > NOW())
                RETURNING scope, resource, grant_duration, refresh_expires_at
            `;
            if (!rotated.length) return tokenError("invalid_grant");

            return await issueTokens(
                clientId,
                rotated[0].scope,
                rotated[0].resource,
                rotated[0].grant_duration,
                rotated[0].refresh_expires_at,
            );
        }

        return tokenError("unsupported_grant_type");
    } catch (error) {

        return tokenError(error?.message === "request_too_large" ? "invalid_request" : "server_error", error?.message === "request_too_large" ? 413 : 500);
    }
}
