import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createApiToken, hashApiToken } from "@/lib/api-token";

/**
 * GET /api/tokens
 * Get all API tokens (requires authentication)
 */
export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const tokens = await sql`
            SELECT id, name, created_at, last_used, revoked
            FROM api_tokens 
            WHERE revoked = FALSE
            ORDER BY created_at DESC
        `;

        return NextResponse.json({
            success: true,
            tokens
        }, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
    } catch (error) {
        console.error("Error fetching tokens:", error);
        return NextResponse.json({
            success: false,
            message: "Error fetching tokens"
        }, { status: 500 });
    }
}

/**
 * POST /api/tokens
 * Create a new API token (requires authentication)
 * Body: { name: "token name" }
 */
export async function POST(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const name = typeof body?.name === "string" ? body.name.trim() : "";

        if (name.length < 3 || name.length > 100) {
            return NextResponse.json({
                success: false,
                message: "Token name must be between 3 and 100 characters"
            }, { status: 400 });
        }

        // Generate a secure random token
        const token = createApiToken();
        const tokenHash = hashApiToken(token);
        const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        // Store token in database
        const result = await sql`
            INSERT INTO api_tokens (token, name, created_at, last_used, revoked) 
            VALUES (${tokenHash}, ${name}, ${now}, null, FALSE)
            RETURNING id, name, created_at
        `;

        // Create notification
        await sql`
            INSERT INTO notifications (title, created_at, category, label) 
            VALUES (${`API token created: ${name}`}, ${now}, 'tokencreated', 'Token Created')
        `;

        return NextResponse.json({
            success: true,
            token,
            name: result[0].name,
            id: result[0].id,
            created_at: result[0].created_at,
            message: "Token created successfully. Use this token in the X-API-Token header. Store it securely - you won't be able to see it again!"
        }, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
    } catch (error) {
        console.error("Error generating token:", error);
        return NextResponse.json({
            success: false,
            message: "Error generating token"
        }, { status: 500 });
    }
}

/**
 * DELETE /api/tokens?id=<token_id>
 * Delete/revoke an API token (requires authentication)
 */
export async function DELETE(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const tokenId = searchParams.get('id');

        if (!tokenId) {
            return NextResponse.json({
                success: false,
                message: "Token ID is required"
            }, { status: 400 });
        }

        // Get token name before deletion
        const tokenInfo = await sql`
            SELECT name FROM api_tokens WHERE id = ${tokenId}
        `;

        if (tokenInfo.length === 0) {
            return NextResponse.json({
                success: false,
                message: "Token not found"
            }, { status: 404 });
        }

        // Revoke the token
        await sql`
            UPDATE api_tokens 
            SET revoked = TRUE 
            WHERE id = ${tokenId}
        `;

        // Create notification
        const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        await sql`
            INSERT INTO notifications (title, created_at, category, label) 
            VALUES (${`API token revoked: ${tokenInfo[0].name}`}, ${now}, 'tokenrevoked', 'Token Revoked')
        `;

        return NextResponse.json({
            success: true,
            message: "Token revoked successfully"
        });
    } catch (error) {
        console.error("Error deleting token:", error);
        return NextResponse.json({
            success: false,
            message: "Error deleting token"
        }, { status: 500 });
    }
}
