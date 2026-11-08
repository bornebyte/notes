import { createHash, randomBytes } from "node:crypto";
import { sql } from "@/lib/db";

export function createApiToken() {
    return randomBytes(32).toString("hex");
}

// The leading `h` distinguishes a stored digest from the legacy 64-character
// bearer tokens so existing tokens can be migrated without invalidating them.
export function hashApiToken(token) {
    return `h${createHash("sha256").update(token).digest("base64url")}`;
}

export async function findApiToken(token) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) return null;

    const storedDigest = hashApiToken(token);
    const rows = await sql`
        SELECT id, token, name
        FROM api_tokens
        WHERE (token = ${storedDigest} OR token = ${token}) AND revoked = FALSE
        LIMIT 1
    `;

    if (!rows.length) return null;

    const row = rows[0];
    if (row.token === token) {
        await sql`UPDATE api_tokens SET token = ${storedDigest} WHERE id = ${row.id} AND token = ${token}`;
    }

    const now = new Date();
    await sql`UPDATE api_tokens SET last_used = ${now} WHERE id = ${row.id}`;
    return { id: row.id, name: row.name };
}

export async function migrateLegacyApiTokens() {
    const rows = await sql`
        SELECT id, token FROM api_tokens
        WHERE token ~ '^[A-Fa-f0-9]{64}$' AND revoked = FALSE
    `;

    for (const row of rows) {
        const digest = hashApiToken(row.token);
        await sql`UPDATE api_tokens SET token = ${digest} WHERE id = ${row.id} AND token = ${row.token}`;
    }
}
