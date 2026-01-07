import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cookies } from "next/headers"
import { LogoutButton } from "@/components/LogoutButton";

export default async function Navbar() {
    const cookieStore = await cookies();
    let isLoggedIn = cookieStore.has("session");
    return (
        <header className="sticky top-0 z-50 h-20 w-full flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b">
            <Link href="/" className="lg:flex lg:items-center lg:justify-center lg:gap-4" prefetch={false}>
                <p className="font-bold text-xl">
                    Notes
                </p>
            </Link>
            <nav className="ml-auto flex flex-row gap-6 items-center justify-center">
                <Link
                    href="/admin"
                    prefetch={false}
                    className="hover:text-muted-foreground transition-colors duration-200"
                >
                    Admin
                </Link>
                {
                    isLoggedIn && <LogoutButton />
                }
            </nav>
        </header>
    )
}
