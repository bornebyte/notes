import "./globals.css";
import { ThemeProviderComponent } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster"
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: `Notes - ${process.env.NEXT_PUBLIC_USERNAME || 'Personal Notes'}`,
  description: `Personal website and notes application`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/logo.jpg",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased flex flex-col min-h-screen">
        <ThemeProviderComponent
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <main className="lg:mx-20 lg:my-10 mx-2 my-2 flex-1">
            {children}
            <SpeedInsights />
          </main>
          <Toaster />
        </ThemeProviderComponent>
      </body>
    </html>
  );
}
