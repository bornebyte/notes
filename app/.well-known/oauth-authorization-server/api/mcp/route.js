import { NextResponse } from "next/server";
import { getMcpOrigin, MCP_SCOPES, secureHeaders } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export async function GET() {
    try {
        const origin = getMcpOrigin();
        return NextResponse.json({
            issuer: origin,
            authorization_endpoint: `${origin}/api/oauth/authorize`,
            token_endpoint: `${origin}/api/oauth/token`,
            registration_endpoint: `${origin}/api/oauth/register`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code", "refresh_token"],
            token_endpoint_auth_methods_supported: ["none"],
            code_challenge_methods_supported: ["S256"],
            scopes_supported: MCP_SCOPES,
            client_id_metadata_document_supported: false,
            authorization_response_iss_parameter_supported: true,
        }, { headers: secureHeaders() });
    } catch {
        return NextResponse.json({ error: "server_misconfigured" }, { status: 500, headers: secureHeaders() });
    }
}
