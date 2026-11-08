"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from "lucide-react";

export function LoginForm() {
    const [error, setError] = useState(null);
    const [pending, setPending] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);

        const formData = new FormData(e.target);
        const password = formData.get("password");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (data.success) {
                let safeTarget = "/admin";
                const returnTo = new URLSearchParams(window.location.search).get("returnTo");
                if (returnTo) {
                    try {
                        const target = new URL(returnTo, window.location.origin);
                        if (target.origin === window.location.origin && target.pathname === "/api/oauth/authorize") {
                            safeTarget = `${target.pathname}${target.search}`;
                        }
                    } catch {
                        // Invalid return targets fall back to the admin page.
                    }
                }

                if (safeTarget.startsWith("/api/oauth/authorize")) {
                    window.location.assign(safeTarget);
                    return;
                }
                router.push(safeTarget);
                router.refresh();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="h-full w-full flex items-center justify-center px-4 py-32">
            <form onSubmit={handleSubmit} className="flex lg:w-1/3 md:w-1/2 w-full mx-2 border rounded-xl p-4 flex-col gap-6 shadow-lg bg-card">
                <div className="flex flex-col items-center gap-4 mb-2">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lock className="h-8 w-8" />
                    </div>
                    <p className="text-center font-bold text-3xl">
                        Login
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                    />
                </div>
                <Button
                    disabled={pending}
                    type="submit"
                >
                    {pending ? <Loader2 className="animate-spin mr-2" /> : ""}
                    {pending ? "Logging in..." : "Login"}
                </Button>
                {error && (
                    <p className="text-center text-red-500 text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                        {error}
                    </p>
                )}
            </form>
        </div>
    );
}
