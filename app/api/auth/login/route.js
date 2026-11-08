import { sql } from "@/lib/db";
import { createSession } from "@/lib/session";
import { sendPushToAll } from "@/lib/push";
import { AES, enc } from "crypto-js";
import { NextResponse } from "next/server";
import { rateLimit, readLimitedText, secureHeaders } from "@/lib/mcp/oauth";

export async function POST(request) {
    try {
        const limit = await rateLimit("auth-login", 10, 900, request);
        if (!limit.allowed) {
            return NextResponse.json({
                success: false,
                message: "Too many login attempts. Try again later.",
            }, { status: 429, headers: secureHeaders({ "Retry-After": String(limit.retryAfter) }) });
        }

        if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
            return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
        }
        const body = JSON.parse(await readLimitedText(request, 4096));
        const password = typeof body?.password === "string" ? body.password : "";
        if (!password || password.length > 1024) {
            return NextResponse.json({ success: false, message: "Invalid password." }, { status: 400 });
        }
        let encryptedPassword = await sql.query("SELECT pass FROM password");
        const realPassword = AES.decrypt(encryptedPassword[0].pass, process.env.SESSION_SECRET).toString(enc.Utf8);
        const timestamp = new Date().toISOString();
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";
        const acceptLanguage = request.headers.get("accept-language") || "unknown";

        if (password !== realPassword) {
            const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
            await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Login Failed', '${date}','loginfailed','Login Failed')`);
            const payload = JSON.stringify({
                title: "Login failed",
                body: `Login failed from ${ip}`,
                data: {
                    url: "/auth",
                    status: "failure",
                    ip,
                    userAgent,
                    acceptLanguage,
                    timestamp,
                    source: "api",
                },
            });
            sendPushToAll(payload).catch((error) => {
                console.error("Push send failed:", error);
            });
            return NextResponse.json({
                success: false,
                message: "Invalid Password",
            }, { status: 401 });
        } else {
            const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
            await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Login Successful', '${date}','loginsuccess','Login Successful')`);
            await createSession(encryptedPassword);
            const payload = JSON.stringify({
                title: "Login successful",
                body: `Login successful from ${ip}`,
                data: {
                    url: "/admin",
                    status: "success",
                    ip,
                    userAgent,
                    acceptLanguage,
                    timestamp,
                    source: "api",
                },
            });
            sendPushToAll(payload).catch((error) => {
                console.error("Push send failed:", error);
            });
            return NextResponse.json({
                success: true,
                message: "Login successful",
            });
        }
    } catch (error) {
        console.error("Error during login:", error);
        return NextResponse.json({
            success: false,
            message: "An error occurred",
        }, { status: 500 });
    }
}
