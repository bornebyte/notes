import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const EXTERNAL_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN;

/**
 * GET /api/feedbacks/[id]
 * Proxy to external feedback API - get specific feedback
 */
export async function GET(request, { params }) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json(
            { error: auth.message },
            { status: auth.status }
        );
    }

    try {
        const { id } = await params;
        const externalUrl = `${EXTERNAL_DOMAIN}/api/feedbacks/${id}`;

        const response = await fetch(externalUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to fetch feedback' }));
            return NextResponse.json(
                { error: errorData.error || 'Feedback not found' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error fetching feedback:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/feedbacks/[id]
 * Proxy to external feedback API - update feedback status or category
 */
export async function PATCH(request, { params }) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json(
            { error: auth.message },
            { status: auth.status }
        );
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const externalUrl = `${EXTERNAL_DOMAIN}/api/feedbacks/${id}`;

        const response = await fetch(externalUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to update feedback' }));
            return NextResponse.json(
                { error: errorData.error || 'Failed to update feedback' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error updating feedback:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/feedbacks/[id]
 * Proxy to external feedback API - delete feedback
 */
export async function DELETE(request, { params }) {
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json(
            { error: auth.message },
            { status: auth.status }
        );
    }

    try {
        const { id } = await params;
        const externalUrl = `${EXTERNAL_DOMAIN}/api/feedbacks/${id}`;

        const response = await fetch(externalUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to delete feedback' }));
            return NextResponse.json(
                { error: errorData.error || 'Failed to delete feedback' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Error deleting feedback:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
