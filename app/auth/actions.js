"use server";

import { sql } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { sendPushToAll } from "@/lib/push";
import { AES, enc } from "crypto-js";
import { redirect } from "next/navigation";

export async function login(prevState, formData) {
    let encryptedPassword = await sql.query("SELECT pass FROM password")
    const realPassword = AES.decrypt(encryptedPassword[0].pass, process.env.SESSION_SECRET).toString(enc.Utf8)
    if (formData.get("password") !== realPassword) {
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Login Failed', '${date}','loginfailed','Login Failed')`);
        const payload = JSON.stringify({
            title: "Login failed",
            body: "Login failed (server action)",
            data: {
                url: "/auth",
                status: "failure",
                timestamp: new Date().toISOString(),
                source: "server-action",
            },
        });
        sendPushToAll(payload).catch((error) => {
            console.error("Push send failed:", error);
        });
        return {
            message: "Invalid Password",
        }
    } else {
        const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
        await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Login Successful', '${date}','loginsuccess','Login Successful')`);
        await createSession(encryptedPassword);
        const payload = JSON.stringify({
            title: "Login successful",
            body: "Login successful (server action)",
            data: {
                url: "/admin",
                status: "success",
                timestamp: new Date().toISOString(),
                source: "server-action",
            },
        });
        sendPushToAll(payload).catch((error) => {
            console.error("Push send failed:", error);
        });
        redirect("/admin");
    }
}

export async function logout() {
    const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
    await sql.query(`INSERT INTO notifications (title, created_at, category, label) VALUES ('Logout', '${date}','logout','Logout')`);
    await deleteSession();
    redirect("/auth");
}