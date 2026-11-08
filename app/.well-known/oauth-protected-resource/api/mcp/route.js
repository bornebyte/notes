import { NextResponse } from "next/server";
import { getMcpOrigin, getMcpResource, MCP_SCOPES, secureHeaders } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export async function GET() {
    try {
        return NextResponse.json({
            resource: getMcpResource(),
            authorization_servers: [getMcpOrigin()],
            scopes_supported: MCP_SCOPES,
            bearer_methods_supported: ["header"],
        }, { headers: secureHeaders() });
    } catch {
        return NextResponse.json({ error: "server_misconfigured" }, { status: 500, headers: secureHeaders() });
    }
}
