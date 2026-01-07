import "./globals.css";
import { ThemeProviderComponent } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster"
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "Notes - Shubham Shah",
  description: "Personal website of Shubham Shah - Notes App",
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
