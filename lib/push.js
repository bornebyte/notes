import "server-only";
import webpush from "web-push";
import { sql } from "@/lib/db";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export function hasVapidConfig() {
  return Boolean(vapidPublicKey && vapidPrivateKey);
}

export function getVapidPublicKey() {
  return vapidPublicKey;
}

export async function upsertSubscription({ endpoint, keys, userAgent, deviceName }) {
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error("Invalid subscription payload");
  }

  const now = new Date().toISOString();

  await sql`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, device_name, created_at, updated_at)
    VALUES (${endpoint}, ${keys.p256dh}, ${keys.auth}, ${userAgent || null}, ${deviceName || null}, ${now}, ${now})
    ON CONFLICT (endpoint) DO UPDATE SET
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      device_name = EXCLUDED.device_name,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function deleteSubscription(endpoint) {
  if (!endpoint) return;
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function sendPushToAll(payload) {
  if (!hasVapidConfig()) {
    return { sent: 0, failed: 0, skipped: true, reason: "missing_vapid" };
  }

  const subscriptions = await sql`
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions
  `;

  if (!subscriptions.length) {
    return { sent: 0, failed: 0, skipped: true, reason: "no_subscriptions" };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      )
    )
  );

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.status === "fulfilled") {
      sent += 1;
      continue;
    }

    failed += 1;
    const statusCode = result.reason?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await deleteSubscription(subscriptions[i].endpoint);
    }
  }

  return { sent, failed, skipped: false };
}
