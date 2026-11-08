import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
    getMcpGrantExpiresAt,
    getMcpOrigin,
    hasValidAdminSession,
    isMcpGrantDuration,
    readLimitedText,
    secureHeaders,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";

async function unauthorized() {
    return NextResponse.json({ success: false, message: "Please log in again." }, { status: 401, headers: secureHeaders() });
}

export async function GET() {
    if (!await hasValidAdminSession()) return unauthorized();

    try {
        const clients = await sql`
            SELECT c.client_id, c.client_name, c.created_at, c.last_authorized_at,
                   COALESCE(grants.active_grants, 0)::int AS active_grants,
                   COALESCE(grants.total_grants, 0)::int AS total_grants,
                   grants.grant_duration,
                   grants.refresh_expires_at,
                   grants.access_expires_at
            FROM mcp_oauth_clients c
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) FILTER (
                        WHERE t.refresh_token_hash IS NOT NULL
                          AND t.revoked_at IS NULL
                          AND (t.refresh_expires_at IS NULL OR t.refresh_expires_at > NOW())
                    )::int AS active_grants,
                    COUNT(*) FILTER (
                        WHERE t.refresh_token_hash IS NOT NULL AND t.revoked_at IS NULL
                    )::int AS total_grants,
                    (ARRAY_AGG(t.grant_duration ORDER BY t.created_at DESC) FILTER (
                        WHERE t.refresh_token_hash IS NOT NULL
                          AND t.revoked_at IS NULL
                          AND (t.refresh_expires_at IS NULL OR t.refresh_expires_at > NOW())
                    ))[1] AS grant_duration,
                    (ARRAY_AGG(t.refresh_expires_at ORDER BY t.created_at DESC) FILTER (
                        WHERE t.refresh_token_hash IS NOT NULL
                          AND t.revoked_at IS NULL
                          AND (t.refresh_expires_at IS NULL OR t.refresh_expires_at > NOW())
                    ))[1] AS refresh_expires_at,
                    MAX(t.access_expires_at) FILTER (
                        WHERE t.refresh_token_hash IS NOT NULL
                          AND t.revoked_at IS NULL
                          AND (t.refresh_expires_at IS NULL OR t.refresh_expires_at > NOW())
                    ) AS access_expires_at
                FROM mcp_oauth_tokens t
                WHERE t.client_id = c.client_id
            ) grants ON TRUE
            ORDER BY c.created_at DESC
        `;
        return NextResponse.json({ success: true, server_url: `${getMcpOrigin()}/api/mcp`, clients }, { headers: secureHeaders() });
    } catch {
        return NextResponse.json({ success: false, message: "Could not load connected clients." }, { status: 500, headers: secureHeaders() });
    }
}

export async function PATCH(request) {
    if (!await hasValidAdminSession()) return unauthorized();
    if (request.headers.get("origin") !== getMcpOrigin()) {
        return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403, headers: secureHeaders() });
    }

    const clientId = new URL(request.url).searchParams.get("id");
    if (!clientId || clientId.length > 128) {
        return NextResponse.json({ success: false, message: "Client ID is required." }, { status: 400, headers: secureHeaders() });
    }
    const size = Number(request.headers.get("content-length") || 0);
    if (size > 2048 || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
        return NextResponse.json({ success: false, message: "Invalid expiry request." }, { status: size > 2048 ? 413 : 400, headers: secureHeaders() });
    }

    let body;
    try {
        body = JSON.parse(await readLimitedText(request, 2048));
    } catch {
        return NextResponse.json({ success: false, message: "Invalid expiry request." }, { status: 400, headers: secureHeaders() });
    }
    if (!isMcpGrantDuration(body?.duration)) {
        return NextResponse.json({ success: false, message: "Choose a valid connection duration." }, { status: 400, headers: secureHeaders() });
    }

    const expiresAt = getMcpGrantExpiresAt(body.duration);
    try {
        const updated = await sql`
            UPDATE mcp_oauth_tokens
            SET grant_duration = ${body.duration},
                refresh_expires_at = ${expiresAt},
                access_expires_at = CASE
                    WHEN ${expiresAt}::timestamptz IS NULL THEN access_expires_at
                    ELSE LEAST(access_expires_at, ${expiresAt})
                END
            WHERE client_id = ${clientId}
              AND revoked_at IS NULL
              AND refresh_token_hash IS NOT NULL
              AND (refresh_expires_at IS NULL OR refresh_expires_at > NOW())
            RETURNING access_token_hash
        `;
        if (!updated.length) {
            return NextResponse.json({ success: false, message: "This connection has no active authorization. Reconnect it in ChatGPT first." }, { status: 409, headers: secureHeaders() });
        }
        return NextResponse.json({ success: true, duration: body.duration, expires_at: expiresAt, active_grants: updated.length }, { headers: secureHeaders() });
    } catch {
        return NextResponse.json({ success: false, message: "Could not update the connection expiry." }, { status: 500, headers: secureHeaders() });
    }
}

export async function DELETE(request) {
    if (!await hasValidAdminSession()) return unauthorized();
    if (request.headers.get("origin") !== getMcpOrigin()) {
        return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403, headers: secureHeaders() });
    }

    const clientId = new URL(request.url).searchParams.get("id");
    if (!clientId || clientId.length > 100) {
        return NextResponse.json({ success: false, message: "Client ID is required." }, { status: 400, headers: secureHeaders() });
    }

    try {
        const removed = await sql`
            DELETE FROM mcp_oauth_clients
            WHERE client_id = ${clientId}
            RETURNING client_id
        `;
        if (!removed.length) return NextResponse.json({ success: false, message: "Client not found." }, { status: 404, headers: secureHeaders() });
        return NextResponse.json({ success: true }, { headers: secureHeaders() });
    } catch {
        return NextResponse.json({ success: false, message: "Could not revoke this connection." }, { status: 500, headers: secureHeaders() });
    }
}
