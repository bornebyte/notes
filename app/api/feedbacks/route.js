import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const EXTERNAL_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN;

/**
 * GET /api/feedbacks
 * Proxy to external feedback API
 * Fetches feedback from the external website: https://pptx.shubham-shah.com.np
 */
export async function GET(request) {
    // Require authentication
    const auth = await requireAuth(request);
    if (auth.error) {
        return NextResponse.json(
            { error: auth.message },
            { status: auth.status }
        );
    }

    try {
        const { searchParams } = new URL(request.url);

        // Forward all query parameters to external API
        const externalUrl = `${EXTERNAL_DOMAIN}/api/feedbacks?${searchParams.toString()}`;

        // Fetch from external API
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
                { error: errorData.error || 'Failed to fetch feedback from external API' },
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
