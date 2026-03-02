import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const EXTERNAL_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN;

/**
 * GET /api/feedbacks/export
 * Proxy to external feedback API - export feedback data
 */
export async function GET(request) {
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
        const externalUrl = `${EXTERNAL_DOMAIN}/api/feedbacks/export?${searchParams.toString()}`;

        const response = await fetch(externalUrl, {
            method: 'GET',
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to export feedback' }));
            return NextResponse.json(
                { error: errorData.error || 'Failed to export feedback' },
                { status: response.status }
            );
        }

        // Forward the response as-is (whether it's CSV or JSON)
        const contentType = response.headers.get('content-type');
        const contentDisposition = response.headers.get('content-disposition');
        
        if (contentType?.includes('text/csv')) {
            const csv = await response.text();
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': contentDisposition || 'attachment; filename="feedback_export.csv"'
                }
            });
        } else {
            const data = await response.json();
            return NextResponse.json(data);
        }

    } catch (error) {
        console.error("Error exporting feedback:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
