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

/**
 * POST /api/feedback
 * Submit user feedback
 * 
 * Request Body:
 * - feedback_text (string, required): The feedback content
 * - rating (integer, optional): Rating between 1 and 5
 * - user_email (string, optional): User's email for follow-up
 * - category (string, optional): Feedback category (praise, feature, bug, improvement, other)
 */
export async function POST(request) {
    try {
        // Get IP address for rate limiting
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const ip_address = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

        // Rate limiting - 10 feedback submissions per IP per 15 minutes
        const rateLimitResult = rateLimit(ip_address, 10, 15 * 60 * 1000);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: "Too many feedback submissions. Please try again later.",
                    retryAfter: rateLimitResult.retryAfter
                },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { feedback_text, rating, user_email, category } = body;

        // Validation: feedback_text is required
        if (!feedback_text || typeof feedback_text !== 'string' || feedback_text.trim().length === 0) {
            return NextResponse.json(
                { error: "feedback_text is required" },
                { status: 400 }
            );
        }

        // Validate feedback_text length (max 5000 characters)
        if (feedback_text.length > 5000) {
            return NextResponse.json(
                { error: "feedback_text must not exceed 5000 characters" },
                { status: 400 }
            );
        }

        // Validate rating if provided
        if (rating !== undefined && rating !== null) {
            const ratingNum = parseInt(rating, 10);
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                return NextResponse.json(
                    { error: "rating must be an integer between 1 and 5" },
                    { status: 400 }
                );
            }
        }

        // Validate email if provided
        if (user_email && typeof user_email === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(user_email)) {
                return NextResponse.json(
                    { error: "Invalid email format" },
                    { status: 400 }
                );
            }
            if (user_email.length > 255) {
                return NextResponse.json(
                    { error: "user_email must not exceed 255 characters" },
                    { status: 400 }
                );
            }
        }

        // Validate category if provided
        const validCategories = ['praise', 'feature', 'bug', 'improvement', 'other'];
        if (category && !validCategories.includes(category)) {
            return NextResponse.json(
                { error: `category must be one of: ${validCategories.join(', ')}` },
                { status: 400 }
            );
        }

        // Get User-Agent
        const user_agent = request.headers.get('user-agent') || 'unknown';

        // Insert feedback into database
        const result = await sql`
            INSERT INTO feedback (
                feedback_text, 
                rating, 
                user_email, 
                category, 
                status,
                ip_address,
                user_agent,
                timestamp
            )
            VALUES (
                ${feedback_text.trim()},
                ${rating ? parseInt(rating, 10) : null},
                ${user_email || null},
                ${category || 'other'},
                'new',
                ${ip_address},
                ${user_agent},
                CURRENT_TIMESTAMP
            )
            RETURNING id
        `;

        const feedback_id = result[0]?.id;

        return NextResponse.json(
            {
                success: true,
                message: "Thank you for your feedback!",
                feedback_id
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("Error submitting feedback:", error);

        // Handle database constraint violations
        if (error.message?.includes('violates check constraint')) {
            return NextResponse.json(
                { error: "Invalid data format" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
