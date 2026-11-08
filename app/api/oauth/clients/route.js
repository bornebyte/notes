import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getMcpOrigin, hasValidAdminSession, secureHeaders } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

async function unauthorized() {
    return NextResponse.json({ success: false, message: "Please log in again." }, { status: 401, headers: secureHeaders() });
}

export async function GET() {
    if (!await hasValidAdminSession()) return unauthorized();

    try {
        const clients = await sql`
            SELECT client_id, client_name, created_at
            FROM mcp_oauth_clients
            ORDER BY created_at DESC
        `;
        return NextResponse.json({ success: true, clients }, { headers: secureHeaders() });
    } catch {
        return NextResponse.json({ success: false, message: "Could not load connected clients." }, { status: 500, headers: secureHeaders() });
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
