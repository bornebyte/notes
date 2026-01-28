import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function PUT(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { id, trash } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, message: 'Note ID is required' }, { status: 400 });
        }

        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        if (trash) {
            const res = await sql`UPDATE notes SET trash = TRUE WHERE id = ${id} RETURNING id`;
            if (res.length === 0) {
                return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
            }
            const deletedID = res[0].id;
            await sql`
                INSERT INTO notifications (title, created_at, category, label) 
                VALUES (${`Note trashed with id ${deletedID}`}, ${date}, 'notetrashed', 'Note trashed')
            `;
        } else {
            const res = await sql`UPDATE notes SET trash = FALSE WHERE id = ${id} RETURNING id`;
            if (res.length === 0) {
                return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
            }
            const deletedID = res[0].id;
            await sql`
                INSERT INTO notifications (title, created_at, category, label) 
                VALUES (${`Note recovered with id ${deletedID}`}, ${date}, 'noterecovered', 'Note recovered')
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating trash status:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
