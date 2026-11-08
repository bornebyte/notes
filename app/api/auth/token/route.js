import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { createApiToken, hashApiToken, migrateLegacyApiTokens } from "@/lib/api-token";

export async function GET() {
    try {
        // Check if user is authenticated via session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session");

        if (!sessionCookie || !await decrypt(sessionCookie.value)) {
            return NextResponse.json({
                success: false,
                message: "You must be logged in to view API tokens"
            }, { status: 401 });
        }

        // Bring older plaintext tokens forward to the hashed-at-rest format.
        await migrateLegacyApiTokens();

        const tokens = await sql`
            SELECT id, name, created_at, last_used, revoked
            FROM api_tokens 
            ORDER BY created_at DESC
        `;

        return NextResponse.json({
            success: true,
            tokens
        });
    } catch (error) {
        console.error("Error fetching tokens:", error);
        return NextResponse.json({
            success: false,
            message: "Error fetching tokens"
        }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        // Check if user is authenticated via session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session");

        if (!sessionCookie || !await decrypt(sessionCookie.value)) {
            return NextResponse.json({
                success: false,
                message: "You must be logged in to generate an API token"
            }, { status: 401 });
        }

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

        return NextResponse.json({
            success: true,
            token,
            name: result[0].name,
            id: result[0].id,
            created_at: result[0].created_at,
            message: "Use this token in the X-API-Token header"
        }, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
    } catch (error) {
        console.error("Error generating token:", error);
        return NextResponse.json({
            success: false,
            message: "Error generating token"
        }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        // Check if user is authenticated via session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session");

        if (!sessionCookie || !await decrypt(sessionCookie.value)) {
            return NextResponse.json({
                success: false,
                message: "You must be logged in to delete API tokens"
            }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tokenId = searchParams.get('id');

        if (!tokenId) {
            return NextResponse.json({
                success: false,
                message: "Token ID is required"
            }, { status: 400 });
        }

        // Delete the token (or mark as revoked)
        await sql`
            UPDATE api_tokens 
            SET revoked = TRUE 
            WHERE id = ${tokenId}
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
