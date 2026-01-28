import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, message: 'Note ID is required' }, { status: 400 });
        }

        let shareid = Date.now().toString(36);
        const res = await sql`UPDATE notes SET shareid = ${shareid} WHERE id = ${id} RETURNING shareid`;

        if (res.length === 0) {
            return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
        }

        const shareID = res[0].shareid;
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        await sql`
            INSERT INTO notifications (title, created_at, category, label) 
            VALUES (${`Share id created with id ${shareID}`}, ${date}, 'shareidcreated', 'Share ID Created')
        `;

        return NextResponse.json({ success: true, shareid: shareID });
    } catch (error) {
        console.error('Error generating share ID:', error);
        return NextResponse.json({ success: false, shareid: null, message: 'Internal server error' }, { status: 500 });
    }
}
