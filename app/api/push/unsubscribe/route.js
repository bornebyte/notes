import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteSubscription } from "@/lib/push";

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { endpoint } = await request.json();
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: "Endpoint is required" },
        { status: 400 }
      );
    }

    await deleteSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subscription:", error);
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
