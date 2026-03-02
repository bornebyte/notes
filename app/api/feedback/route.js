import { NextResponse } from "next/server";

const EXTERNAL_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN;

/**
 * POST /api/feedback
 * Proxy to external feedback API - submit user feedback
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const externalUrl = `${EXTERNAL_DOMAIN}/api/feedback`;

        const response = await fetch(externalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to submit feedback' }));
            return NextResponse.json(
                { error: errorData.error || 'Failed to submit feedback' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        console.error("Error submitting feedback:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
