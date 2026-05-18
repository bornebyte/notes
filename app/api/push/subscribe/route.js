import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { upsertSubscription, hasVapidConfig } from "@/lib/push";

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (!hasVapidConfig()) {
    return NextResponse.json(
      { message: "Push is not configured" },
      { status: 503 }
    );
  }

  try {
    const { subscription, userAgent, deviceName } = await request.json();
    await upsertSubscription({
      endpoint: subscription?.endpoint,
      keys: subscription?.keys,
      userAgent,
      deviceName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save subscription:", error);
    return NextResponse.json(
      { success: false, message: "Invalid subscription" },
      { status: 400 }
    );
  }
}
