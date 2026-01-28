import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const res = await sql`SELECT * FROM targetdate ORDER BY date ASC`;

        let data = res.map((row) => {
            const today = new Date();
            const targetDate = new Date(row.date);
            const startDate = new Date(row.created_at);

            const totalDuration = targetDate - startDate;
            const elapsedTime = today - startDate;
            const remainingTime = targetDate - today;

            row.months = Math.floor(remainingTime / (1000 * 60 * 60 * 24 * 30));
            row.days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
            row.hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            row.minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

            row.progressPercentage = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsedTime / totalDuration) * 100)) : 0;
            row.progressPercentage = Math.floor(row.progressPercentage);

            return row;
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching targets:", error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { date, message } = await request.json();

        if (!date || !message) {
            return NextResponse.json({
                success: false,
                message: 'Date and message are required'
            }, { status: 400 });
        }

        const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        const res = await sql`
            INSERT INTO targetdate (date, created_at, message) 
            VALUES (${date}, ${today}, ${message}) 
            RETURNING id
        `;

        return NextResponse.json({ success: true, id: res[0].id });
    } catch (error) {
        console.error("Error adding target:", error);
        return NextResponse.json({ success: false, id: null, message: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({
                success: false,
                message: 'Target ID is required'
            }, { status: 400 });
        }

        const res = await sql`DELETE FROM targetdate WHERE id = ${id} RETURNING id`;

        if (res.length === 0) {
            return NextResponse.json({ success: false, message: 'Target not found' }, { status: 404 });
        }

        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        await sql`
            INSERT INTO notifications (title, created_at, category, label) 
            VALUES ('Target deleted', ${date}, 'targetdeleted', 'Target Deleted')
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting target:", error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
