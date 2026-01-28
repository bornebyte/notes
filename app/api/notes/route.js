import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const query = searchParams.get('query');
        const shareid = searchParams.get('shareid');

        // Get trashed notes
        if (type === 'trashed') {
            const result = await sql`SELECT * FROM notes where trash=TRUE ORDER BY created_at ASC`;
            result.map((row) => {
                row.title = row.title.replaceAll("&apos;", "'");
                row.body = row.body.replaceAll("&apos;", "'");
            });
            return NextResponse.json(result);
        }

        // Get favorite notes
        if (type === 'favorites') {
            const result = await sql`SELECT * FROM notes where fav=TRUE and trash=FALSE ORDER BY created_at ASC`;
            result.map((row) => {
                row.title = row.title.replaceAll("&apos;", "'");
                row.body = row.body.replaceAll("&apos;", "'");
            });
            return NextResponse.json(result);
        }

        // Get shared note
        if (shareid) {
            const result = await sql`SELECT * FROM notes where trash=FALSE and shareid=${shareid}`;
            result.map((row) => {
                row.title = row.title.replaceAll("&apos;", "'");
                row.body = row.body.replaceAll("&apos;", "'");
            });
            return NextResponse.json(result[0] || null);
        }

        // Search notes
        if (query) {
            const searchQuery = query.replaceAll("'", "&apos;");
            const result = await sql`SELECT * FROM notes WHERE (title ILIKE ${'%' + searchQuery + '%'} OR body ILIKE ${'%' + searchQuery + '%'}) AND trash=FALSE ORDER BY id DESC`;
            result.map((row) => {
                row.title = row.title.replaceAll("&apos;", "'");
                row.body = row.body.replaceAll("&apos;", "'");
            });
            return NextResponse.json(result);
        }

        // Get all notes (default)
        const result = await sql`SELECT * FROM notes where trash=FALSE ORDER BY id DESC`;
        result.map((row) => {
            row.title = row.title.replaceAll("&apos;", "'");
            row.body = row.body.replaceAll("&apos;", "'");
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { title, body, category } = await request.json();

        if (!title || !body) {
            return NextResponse.json({
                success: false,
                message: 'Title and body are required'
            }, { status: 400 });
        }

        if (title.length > 255) {
            return NextResponse.json({
                success: false,
                message: 'Title must be 255 characters or less'
            }, { status: 400 });
        }

        const titleEscaped = title.replaceAll("'", "&apos;");
        const bodyEscaped = body.replaceAll("'", "&apos;");
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        const res = await sql`
            INSERT INTO notes (title, body, category, created_at, lastupdated) 
            VALUES (${titleEscaped}, ${bodyEscaped}, ${category || null}, ${date}, NULL) 
            RETURNING id
        `;

        const insertedID = res[0].id;
        await sql`
            INSERT INTO notifications (title, created_at, category, label) 
            VALUES (${`Note Added with id ${insertedID}`}, ${date}, 'noteadded', 'Note added')
        `;

        return NextResponse.json({ success: true, id: insertedID });
    } catch (error) {
        console.error('Error creating note:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    try {
        const { id, title, body } = await request.json();

        if (!id || !title || !body) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const titleEscaped = title.replaceAll("'", "&apos;");
        const bodyEscaped = body.replaceAll("'", "&apos;");
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        const res = await sql`
            UPDATE notes 
            SET title = ${titleEscaped}, body = ${bodyEscaped}, lastupdated = ${date} 
            WHERE id = ${id} 
            RETURNING id
        `;

        if (res.length === 0) {
            return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
        }

        const updatedID = res[0].id;
        await sql`
            INSERT INTO notifications (title, created_at, category, label) 
            VALUES (${`Note Updated with id ${updatedID}`}, ${date}, 'noteupdated', 'Note updated')
        `;

        return NextResponse.json({ success: true, id: updatedID });
    } catch (error) {
        console.error('Error updating note:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
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
        const permanent = searchParams.get('permanent') === 'true';

        if (!id) {
            return NextResponse.json({ success: false, message: 'Note ID is required' }, { status: 400 });
        }

        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });

        if (permanent) {
            // Permanently delete the note
            const res = await sql`DELETE FROM notes WHERE id = ${id} RETURNING id`;

            if (res.length === 0) {
                return NextResponse.json({ success: false, message: 'Note not found' }, { status: 404 });
            }

            const deletedID = res[0].id;
            await sql`
                INSERT INTO notifications (title, created_at, category, label) 
                VALUES (${`Note permanently deleted with id ${deletedID}`}, ${date}, 'notedeleted', 'Note Deleted')
            `;

            return NextResponse.json({ success: true, message: 'Note permanently deleted' });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Use PUT /api/notes/trash to move notes to trash'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
