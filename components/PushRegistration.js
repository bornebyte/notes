"use client";

import { useEffect } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function PushRegistration() {
  useEffect(() => {
    const registerPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return;
      }

      const keyResponse = await fetch("/api/push/vapid", { cache: "no-store" });
      const { publicKey } = await keyResponse.json();
      if (!publicKey) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      });
    };

    registerPush().catch((error) => {
      console.error("Push registration failed:", error);
    });
  }, []);

  return null;
}
