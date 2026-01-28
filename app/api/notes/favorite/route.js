import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function PUT(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { id, favorite } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, message: 'Note ID is required' }, { status: 400 });
        }

        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        if (favorite) {
            const res = await sql`UPDATE notes SET fav = TRUE WHERE id = ${id} RETURNING id`;
            if (res.length === 0) {
                return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
            }
            const favID = res[0].id;
            await sql`
                INSERT INTO notifications (title, created_at, category, label) 
                VALUES (${`Note added to favourite with id ${favID}`}, ${date}, 'noteaddedfav', 'Note Added Favourite')
            `;
        } else {
            const res = await sql`UPDATE notes SET fav = FALSE WHERE id = ${id} RETURNING id`;
            if (res.length === 0) {
                return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
            }
            const favID = res[0].id;
            await sql`
                INSERT INTO notifications (title, created_at, category, label) 
                VALUES (${`Note removed from favourite with id ${favID}`}, ${date}, 'noteremovedfav', 'Note Removed Favourite')
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating favorite status:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
