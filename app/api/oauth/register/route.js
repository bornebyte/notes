import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { newSecret, rateLimit, readLimitedText, secureHeaders } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

function validRedirectUri(value) {
    if (typeof value !== "string" || value.length > 2048) return false;

    try {
        const url = new URL(value);
        if (url.username || url.password || url.hash) return false;
        if (url.protocol === "https:") return true;
        if (url.protocol === "http:") {
            return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
        }
        return /^[a-z][a-z0-9+.-]*:$/i.test(url.protocol)
            && !["about:", "blob:", "data:", "file:", "filesystem:", "javascript:", "vbscript:"].includes(url.protocol.toLowerCase());
    } catch {
        return false;
    }
}

export async function POST(request) {
    try {
        const size = Number(request.headers.get("content-length") || 0);
        if (size > 8192) return NextResponse.json({ error: "invalid_client_metadata" }, { status: 413, headers: secureHeaders() });

        const limit = await rateLimit("oauth-register", 10, 3600, request);
        if (!limit.allowed) {
            return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: secureHeaders({ "Retry-After": String(limit.retryAfter) }) });
        }

        if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
            return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400, headers: secureHeaders() });
        }

        const metadata = JSON.parse(await readLimitedText(request, 8192));
        const redirectUris = metadata?.redirect_uris;
        if (!Array.isArray(redirectUris) || redirectUris.length < 1 || redirectUris.length > 10
            || redirectUris.some((uri) => !validRedirectUri(uri))) {
            return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400, headers: secureHeaders() });
        }

        const clientName = typeof metadata.client_name === "string"
            ? metadata.client_name.trim().slice(0, 100)
            : "MCP client";
        if (!clientName) return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400, headers: secureHeaders() });

        const clientId = newSecret("mcp_client_");
        await sql`
            INSERT INTO mcp_oauth_clients (client_id, client_name, redirect_uris)
            VALUES (${clientId}, ${clientName}, ${JSON.stringify([...new Set(redirectUris)])}::jsonb)
        `;

        return NextResponse.json({
            client_id: clientId,
            client_id_issued_at: Math.floor(Date.now() / 1000),
            client_name: clientName,
            redirect_uris: [...new Set(redirectUris)],
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            token_endpoint_auth_method: "none",
            scope: "notes:read notes:write",
        }, { status: 201, headers: secureHeaders() });
    } catch (error) {
        const tooLarge = error?.message === "request_too_large";
        if (!tooLarge) console.error("MCP OAuth client registration failed.");
        return NextResponse.json({ error: tooLarge ? "invalid_client_metadata" : "server_error" }, {
            status: tooLarge ? 413 : 500,
            headers: secureHeaders(),
        });
    }
}
