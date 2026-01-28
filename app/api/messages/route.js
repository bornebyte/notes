import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const messages = await sql`SELECT * FROM messages ORDER BY time DESC`;
        return NextResponse.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { name, email, message } = await request.json();

        if (!name || !email || !message) {
            return NextResponse.json({
                message: "Name, email, and message are required",
                success: false,
            }, { status: 400 });
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({
                message: "Invalid email format",
                success: false,
            }, { status: 400 });
        }

        const nepaliTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        await sql`INSERT INTO messages (name, email, message, time) VALUES (${name}, ${email}, ${message}, ${nepaliTime})`;

        return NextResponse.json({
            message: "Message saved successfully",
            success: true,
        });
    } catch (error) {
        console.error("Error saving message:", error);
        return NextResponse.json({
            message: "Error saving message",
            success: false,
        }, { status: 500 });
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
                message: 'Message ID is required'
            }, { status: 400 });
        }

        const res = await sql`DELETE FROM messages WHERE id = ${id} RETURNING id`;

        if (res.length === 0) {
            return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        console.error("Error deleting message:", error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
