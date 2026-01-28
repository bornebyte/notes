import { sql } from "@/lib/db";
import { AES } from "crypto-js";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function PUT(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { newPassword } = await request.json();

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({
                success: false,
                message: 'Password must be at least 6 characters'
            }, { status: 400 });
        }

        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        const encryptedPass = AES.encrypt(newPassword, process.env.SESSION_SECRET).toString();

        const res = await sql`
            UPDATE password 
            SET pass = ${encryptedPass}, last_updated = ${date} 
            WHERE id = 1 
            RETURNING id
        `;

        if (res.length === 0) {
            return NextResponse.json({ success: false, message: 'Failed to update password' }, { status: 500 });
        }

        await sql`
            INSERT INTO notifications (title, created_at, category, label) 
            VALUES ('Admin Password Changed', ${date}, 'passwordchange', 'Password Change')
        `;

        return NextResponse.json({ success: true, id: res[0].id });
    } catch (error) {
        console.error("Error changing password:", error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
